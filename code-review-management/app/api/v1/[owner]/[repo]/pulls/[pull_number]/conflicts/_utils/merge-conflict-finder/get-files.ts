import { Octokit } from "octokit";

export interface ConflictFileContent {
  fileName: string;
  ancestorContent: string | null; // null if file didn't exist then
  targetContent: string | null; // null if deleted in target
  featureContent: string | null; // null if deleted in feature
}

/**
 * Main Function: Retrieves the 3-way content for a list of conflicting files via GraphQL.
 * Batches requests to eliminate N+1 REST API calls.
 */
export async function retrieveConflictContents(
  fileList: string[],
  ancestorSha: string,
  targetSha: string,
  featureSha: string,
  owner: string,
  repo: string,
  octokit: Octokit,
): Promise<ConflictFileContent[]> {
  if (fileList.length === 0) return [];

  // Chunk size of 15 files means 45 aliases per query.
  // This safely stays well under GitHub's node complexity limits.
  const FILES_PER_CHUNK = 15;
  const chunks: string[][] = [];

  for (let i = 0; i < fileList.length; i += FILES_PER_CHUNK) {
    chunks.push(fileList.slice(i, i + FILES_PER_CHUNK));
  }

  // Process all chunks concurrently
  const chunkPromises = chunks.map(async (chunk) => {
    // 1. Dynamically build the aliases for all 3 SHAs per file
    const aliasQueries = chunk
      .map((fileName, index) => {
        // Escape quotes just in case the file name contains them
        const safeName = fileName.replace(/"/g, '\\"');
        return `
                ancestor_${index}: object(expression: "${ancestorSha}:${safeName}") {
                    ... on Blob { text }
                }
                target_${index}: object(expression: "${targetSha}:${safeName}") {
                    ... on Blob { text }
                }
                feature_${index}: object(expression: "${featureSha}:${safeName}") {
                    ... on Blob { text }
                }
            `;
      })
      .join("\n");

    const query = `
            query FetchConflictContents($owner: String!, $repo: String!) {
                repository(owner: $owner, name: $repo) {
                    ${aliasQueries}
                }
            }
        `;

    try {
      // 2. Execute the batched query
      const response: any = await octokit.graphql(query, { owner, repo });
      const repoData = response.repository;
      const chunkResults: ConflictFileContent[] = [];

      // 3. Map the aliased responses back to the expected output format
      chunk.forEach((fileName, index) => {
        chunkResults.push({
          fileName,
          // GraphQL returns null if the expression (file) doesn't exist at that SHA
          // It also returns null for the 'text' field if the file is binary (like an image)
          ancestorContent: repoData[`ancestor_${index}`]?.text ?? null,
          targetContent: repoData[`target_${index}`]?.text ?? null,
          featureContent: repoData[`feature_${index}`]?.text ?? null,
        });
      });

      return chunkResults;
    } catch (error: any) {
      console.error("GraphQL Batch Content Fetch Error:", error.message);
      throw error;
    }
  });

  const allResults = await Promise.all(chunkPromises);

  // Flatten the array of chunk arrays into a single array
  return allResults.flat();
}
