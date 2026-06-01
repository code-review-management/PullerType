import { Octokit } from "octokit";
import { findConflictingFiles, AllowanceError } from "./detect-modified";
import { retrieveConflictContents, ConflictFileContent } from "./get-files";
import { FileMergeOutput, attemptFileMerge } from "./get-merge-diff";
import { performance } from "perf_hooks";

const startTimer = () => performance.now();
const endTimer = (start: number, label: string) => {
  const duration = (performance.now() - start).toFixed(2);
  console.log(`[PERF] ${label}: ${duration}ms`);
  return duration;
};

export interface MergeOutput {
  targetShaAtMerge: string;
  mergedFiles: MergeFileOutput[];
}

interface MergeFileOutput {
  filename: string;
  hasConflict: boolean;
  contents: string;
}

export interface ConflictInput {
  owner: string;
  repo: string;
  targetBranch: string;
  featureBranch: string;
}

export const getMergeConflict = async (
  conflictInput: ConflictInput,
  octokit: Octokit,
): Promise<MergeOutput> => {
  try {
    const firstStart = startTimer();
    const { conflictingFilesResponse, allowance } = await findConflictingFiles(
      conflictInput.owner,
      conflictInput.repo,
      conflictInput.targetBranch,
      conflictInput.featureBranch,
      octokit,
    );

    if (!allowance) {
      throw new AllowanceError("User doesn't have enough tokens");
    }
    endTimer(firstStart, "Modified finder");

    const secondStart = startTimer();
    const mergeCandidatesContent: ConflictFileContent[] =
      await retrieveConflictContents(
        conflictingFilesResponse.files,
        conflictingFilesResponse.mergeBaseCommit,
        conflictInput.targetBranch,
        conflictInput.featureBranch,
        conflictInput.owner,
        conflictInput.repo,
        octokit,
      );
    endTimer(secondStart, "Content retrieval");

    const thirdStart = startTimer();
    const mergedFiles: MergeFileOutput[] = mergeCandidatesContent.map((file) =>
      MakeMerge(file),
    );
    endTimer(thirdStart, "Content parsing");
    return {
      targetShaAtMerge: conflictingFilesResponse.targetShaAtMerge,
      mergedFiles: mergedFiles,
    };
  } catch (error) {
    console.log("Error in get merge conflict: " + error);
    throw error;
  }
};

function MakeMerge(fileContent: ConflictFileContent): MergeFileOutput {
  let ancestor: string = "";
  let target: string = "";
  let feature: string = "";
  if (fileContent.ancestorContent != null)
    ancestor = fileContent.ancestorContent;
  if (fileContent.targetContent != null) target = fileContent.targetContent;
  if (fileContent.featureContent != null) feature = fileContent.featureContent;

  const mergedContent: FileMergeOutput = attemptFileMerge(
    ancestor,
    target,
    feature,
  );

  return {
    filename: fileContent.fileName,
    hasConflict: mergedContent.hasConflict,
    contents: mergedContent.content,
  };
}
