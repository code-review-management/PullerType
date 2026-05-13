import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api/utils/fetcher";
import { CollaboratorPerms } from "@/types/github.types";

/**
 * Fetches the permissions of the currently authenticated user in a GitHub
 * repository.
 *
 * @param owner: Owner of the repository.
 * @param repo: Name of the repository.
 * @returns: TanStack query result containing the user permissions.
 */
export function usePermissionQuery(owner: string, repo: string) {
  return useQuery({
    queryKey: ["permission", owner, repo],
    queryFn: async (): Promise<CollaboratorPerms> =>
      fetcher(`/api/v1/${owner}/${repo}/permission`),
    staleTime: 300000, // 5 minutes.
  });
}
