import { Octokit } from "octokit";
import {
  MergeCommitContent,
  MergeCommitInputData,
} from "../merge-github.types";
import { fetchDirectoryTreesWithGraphQL } from "./tree-fetcher";
import { performance } from "perf_hooks";

const startTimer = () => performance.now();
const endTimer = (start: number, label: string) => {
  const duration = (performance.now() - start).toFixed(2);
  console.log(`[PERF] ${label}: ${duration}ms`);
  return duration;
};

//Notes about different kinds of modes:
//Modes are lost when they come through our system, so we need to fetch all of them
interface TreeItem {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
  type: "blob" | "tree" | "commit";
  sha?: string | null;
  content?: string;
}

export const commitMergeChanges = async (
  mergeCommitInput: MergeCommitInputData,
  mergeCommitContent: MergeCommitContent[],
  octokit: Octokit,
): Promise<boolean> => {
  const { owner, repo, targetMergeSha, targetBranch, featureBranch } =
    mergeCommitInput;
  const start = startTimer();
  try {
    const [featureRef, compareResponse] = await Promise.all([
      octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${featureBranch}`,
      }),
      octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: targetMergeSha,
        head: featureBranch,
      }),
    ]);

    const featureSha = featureRef.data.object.sha;
    const featureFiles = compareResponse.data.files || [];
    endTimer(start, "First 2 calls");
    const treeItems: TreeItem[] = [];
    const resolvedFilesMap: Map<string, string> = new Map(
      mergeCommitContent.map((m) => [m.filename, m.content]),
    );

    // --- PHASE 1: PRE-COMPUTE AND FETCH REQUIRED DIRECTORIES ---
    const requiredDirsSet = new Set<string>();

    const markDirectoryForFetch = (filePath: string, commitSha: string) => {
      const lastSlashIndex = filePath.lastIndexOf("/");
      const dirPath =
        lastSlashIndex === -1 ? "" : filePath.substring(0, lastSlashIndex);
      requiredDirsSet.add(`${commitSha}|${dirPath}`);
    };

    // Scan feature files to determine which directories we need to look up
    for (const file of featureFiles) {
      if (resolvedFilesMap.has(file.filename)) {
        if (resolvedFilesMap.get(file.filename) === "") {
          if (file.status !== "added")
            markDirectoryForFetch(file.filename, targetMergeSha);
        } else {
          markDirectoryForFetch(file.filename, featureSha);
        }
      } else {
        markDirectoryForFetch(
          file.filename,
          file.status === "removed" ? targetMergeSha : featureSha,
        );
      }
    }
    // Scan leftovers
    for (const [filename, content] of resolvedFilesMap.entries()) {
      if (content === "") markDirectoryForFetch(filename, targetMergeSha);
    }
    const secondStart = startTimer();
    // Fetch everything in massive GraphQL batches
    const folderTreeCache = await fetchDirectoryTreesWithGraphQL(
      owner,
      repo,
      requiredDirsSet,
      octokit,
    );
    endTimer(secondStart, "Graph API call");
    // --- PHASE 2: SYNCHRONOUS RESOLUTION ---
    const getOriginalFileItemSync = (filePath: string, commitSha: string) => {
      const lastSlashIndex = filePath.lastIndexOf("/");
      const dirPath =
        lastSlashIndex === -1 ? "" : filePath.substring(0, lastSlashIndex);
      const fileName =
        lastSlashIndex === -1
          ? filePath
          : filePath.substring(lastSlashIndex + 1);

      const cacheKey = `${commitSha}|${dirPath}`;
      const treeEntries = folderTreeCache.get(cacheKey) || [];

      return treeEntries.find((item: any) => item.name === fileName);
    };

    const treeCreation = startTimer();
    for (const file of featureFiles) {
      if (resolvedFilesMap.has(file.filename)) {
        if (resolvedFilesMap.get(file.filename) === "") {
          if (file.status === "added") {
            console.log(
              `Skipping deletion for ${file.filename}: not in base tree.`,
            );
          } else {
            const originalItem = getOriginalFileItemSync(
              file.filename,
              targetMergeSha,
            );
            if (originalItem) {
              treeItems.push({
                path: file.filename,
                mode: originalItem.mode as any,
                type: originalItem.type as any,
                sha: null,
              });
            }
          }
        } else {
          const originalItem = getOriginalFileItemSync(
            file.filename,
            featureSha,
          );
          if (originalItem) {
            treeItems.push({
              path: file.filename,
              mode: originalItem.mode as any,
              type: originalItem.type as any,
              content: resolvedFilesMap.get(file.filename),
            });
          }
        }
        resolvedFilesMap.delete(file.filename);
      } else {
        const originalItem =
          file.status === "removed"
            ? getOriginalFileItemSync(file.filename, targetMergeSha)
            : getOriginalFileItemSync(file.filename, featureSha);

        if (originalItem) {
          treeItems.push({
            path: file.filename,
            mode: originalItem.mode as any,
            type: originalItem.type as any,
            sha: file.status === "removed" ? null : file.sha,
          });
        }
      }
    }

    // Leftovers
    for (const [filename, content] of resolvedFilesMap.entries()) {
      if (content === "") {
        const originalItem = getOriginalFileItemSync(filename, targetMergeSha);
        if (originalItem) {
          treeItems.push({
            path: filename,
            mode: originalItem.mode as any,
            type: originalItem.type as any,
            sha: null,
          });
        }
      } else {
        treeItems.push({
          path: filename,
          mode: "100644",
          type: "blob",
          content: content,
        });
      }
    }
    endTimer(treeCreation, "Created tree");

    const thirdStart = startTimer();
    const newTree = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: targetMergeSha,
      tree: treeItems,
    });

    const newCommit = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `Merge ${targetBranch} into ${featureBranch}`,
      tree: newTree.data.sha,
      parents: [featureSha, targetMergeSha],
    });

    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${featureBranch}`,
      sha: newCommit.data.sha,
      force: false,
    });

    endTimer(thirdStart, "Commit time");
    return true;
  } catch (error) {
    console.log("Error when committing merge: " + error);
    throw error;
  }
};
