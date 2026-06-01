import { Octokit } from "octokit";

export interface CachedEntry {
  name: string;
  mode: string;
  type: string;
}

/**
 * Batches directory tree fetches using GraphQL aliases.
 * Returns a Map where the key is `${commitSha}|${dirPath}` and the value is the array of tree entries.
 */
export async function fetchDirectoryTreesWithGraphQL(
  owner: string,
  repo: string,
  requiredDirs: Set<string>,
  octokit: Octokit,
): Promise<Map<string, CachedEntry[]>> {
  const cache = new Map<string, CachedEntry[]>();
  const dirsArray = Array.from(requiredDirs);

  if (dirsArray.length === 0) return cache;

  // GitHub GraphQL limits complexity. We chose 40 for safety
  const CHUNK_SIZE = 40;
  const chunks = [];

  for (let i = 0; i < dirsArray.length; i += CHUNK_SIZE) {
    chunks.push(dirsArray.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const aliasQueries = chunk
        .map((dirString, index) => {
          const [sha, dirPath] = dirString.split("|");
          // If dirPath is empty, use 'sha:', otherwise use 'sha:dirPath'
          const expression = dirPath === "" ? `${sha}:` : `${sha}:${dirPath}`;

          return `
                alias_${index}: object(expression: "${expression}") {
                    ... on Tree {
                        entries {
                            name
                            mode
                            type
                        }
                    }
                }
            `;
        })
        .join("\n");

      const query = `
            query FetchTrees($owner: String!, $repo: String!) {
                repository(owner: $owner, name: $repo) {
                    ${aliasQueries}
                }
            }
        `;

      try {
        const response: any = await octokit.graphql(query, { owner, repo });

        chunk.forEach((dirString, index) => {
          const treeObject = response.repository[`alias_${index}`];

          const formattedEntries = (treeObject?.entries || []).map(
            (entry: any) => ({
              name: entry.name,
              type: entry.type,
              mode: entry.mode.toString(8).padStart(6, "0"),
            }),
          );

          cache.set(dirString, formattedEntries);
        });
      } catch (error) {
        console.error("GraphQL Batch Fetch Error:", error);
        throw error;
      }
    }),
  );

  return cache;
}
