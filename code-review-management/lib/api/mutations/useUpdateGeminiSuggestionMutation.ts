import { useMutation, useQueryClient } from "@tanstack/react-query";
import { poster } from "../utils/poster";
import { SuggestionCommentUpdateRequest } from "@/types/request.types";
import toast from "react-hot-toast";

/**
 * updates a gemini comment.
 *
 * @param owner: Owner of the repository.
 * @param repo: Name of the repository.
 * @param pullNumber: Pull request number.
 * @returns: TanStack query updating the suggestion comment.
 */
export function useUpdateGeminiSuggestionMutation(
  owner: string,
  repo: string,
  pullNumber: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-suggest", owner, repo, pullNumber],
    mutationFn: async (suggestionData: SuggestionCommentUpdateRequest) =>
      poster(
        `/api/v1/${owner}/${repo}/pulls/${pullNumber}/suggest/update`,
        JSON.stringify(suggestionData),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["review-comments", owner, repo, pullNumber],
      });
      toast.success("Suggestion successfully updated!");
    },
    onError: () => {
      toast.error("Failed to update suggestion.");
    },
  });
}
