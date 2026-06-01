import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api/utils/fetcher";

/**
 * Fetches the file content of a single file (used for suggestion module view).
 *
 * @param owner: Owner of the repository.
 * @param repo: Name of the repository.
 * @param pullNumber: Pull request number.
 * @returns: TanStack query result containing the content of the file.
 */
export function useFileContentQuery(
  owner: string,
  repo: string,
  pullNumber: string,
  path: string,
) {
  return useQuery({
    queryKey: ["file-content", owner, repo, pullNumber, path],
    queryFn: async (): Promise<string> => {
      const encodedPath = encodeURIComponent(path);
      return fetcher(
        `/api/v1/${owner}/${repo}/pulls/${pullNumber}/single-file-content?path=${encodedPath}`,
      );
    },
  });
}
