import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api/utils/fetcher";
import { MergeOutputSchema } from "@/app/api/v1/[owner]/[repo]/pulls/[pull_number]/conflicts/_utils/merge-github.types";

/**
 * Fetches merge conflict resolution data for a specific pull request.
 * * @param owner: Owner of the repository.
 * @param repo: Name of the repository.
 * @param pullId: Pull request number or ID.
 * @param targetBranch: The branch being merged into.
 * @param featureBranch: The branch containing the new features.
 * @returns: TanStack query result containing the parsed merge conflict data and branch info.
 */
export function useMergeConflictQuery(
  owner: string, 
  repo: string, 
  pullId: string, 
  targetBranch: string, 
  featureBranch: string
) {
  return useQuery({
    queryKey: ["merge-conflict", owner, repo, pullId, targetBranch, featureBranch],
    queryFn: async () => {
        const queryParams = new URLSearchParams({
            target_branch: targetBranch,
            feature_branch: featureBranch,
        });

        const rawData = await fetcher(
            `/api/v1/${owner}/${repo}/pulls/${pullId}/conflicts/find-conflicts?${queryParams.toString()}`
        );
      
        const mergeOutput = MergeOutputSchema.parse(rawData);
        return {
        mergeOutput,
        branchInfoProp: {
            owner,
            repo,
            pullId,
            targetBranch,
            featureBranch
        }
        };
    },

    enabled: !!(owner && repo && pullId && targetBranch && featureBranch),
  });
}
