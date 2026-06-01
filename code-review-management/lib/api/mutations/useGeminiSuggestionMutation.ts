import { useMutation, useQueryClient } from "@tanstack/react-query";
import { poster } from "@/lib/api/utils/poster";
import { ThreadSuggestionRequest } from "@/types/request.types";
import toast from "react-hot-toast";

/**
 * Triggers a Gemini pull request suggestion.
 * * @param owner: Owner of the repository.
 * @param repo: Name of the repository.
 * @param pullNumber: Pull request number.
 * @param commentId: We only allow one suggestion at a time per thread, so we use thread id to identify queries
 * @returns: TanStack mutation result to execute the suggestion request.
 */
export function useGeminiSuggestionMutation(
  owner: string,
  repo: string,
  pullNumber: string,
  commentId: number,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getGeminiSuggestionMutationKey(commentId),
    mutationFn: async (requestParams: ThreadSuggestionRequest) => {
      return poster(
        `/api/v1/${owner}/${repo}/pulls/${pullNumber}/suggest`,
        JSON.stringify(requestParams),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["review-comments", owner, repo, pullNumber],
      });
      toast.success("Suggestion made!");
    },
    onError: () => {
      toast.error("Failed to post comment.");
    },
  });
}

function getGeminiSuggestionMutationKey(commentId: number) {
  const MUTATION_KEY_PREFIX = "create-gemini-suggestion";
  return [MUTATION_KEY_PREFIX, commentId];
}
