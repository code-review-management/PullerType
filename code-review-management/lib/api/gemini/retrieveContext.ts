import { Octokit } from "octokit";

export interface FileContext {
  content: string;
}

/**
 * Fetches the full contents of a specific file at a specific commit.
 * * @param octokit An authenticated Octokit instance
 * @param owner The repository owner (e.g., "octocat")
 * @param repo The repository name (e.g., "hello-world")
 * @param filePath The path to the file (e.g., "src/index.ts")
 * @param sha The commit SHA to fetch the data from
 */
export async function getFileDiffAndContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  sha: string,
): Promise<FileContext> {
  let content: string = "";
  try {
    const { data: contentData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: sha,
    });

    if (!Array.isArray(contentData) && contentData.type === "file") {
      content = Buffer.from(contentData.content, "base64").toString("utf-8");
    }

    return { content };
  } catch (error) {
    console.error(`Error fetching data for ${filePath} at ${sha}:`, error);
    throw error;
  }
}
