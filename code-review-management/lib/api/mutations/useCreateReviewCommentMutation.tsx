import {
  MutationKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { poster } from "../utils/poster";
import { CommentCreateRequest } from "@/types/request.types";
// TODO: Refactor to use a shared types file so we don't have to import from a UI component.
import { DraftItem } from "@/app/(pages)/(protected)/[username]/[repo_name]/pull/[id]/changes/_components/DraftEditorActions/DraftEditorActions";
import PendingReviewError from "@components/PendingReviewError/PendingReviewError";
import toast from "react-hot-toast";

/**
 * Creates a new review comment on the diff of a GitHub pull request.
 *
 * @param owner: Owner of the repository.
 * @param repo: Name of the repository.
 * @param pullNumber: Pull request number.
 * @param draftItem: `DraftItem` representing the review comment to create.
 * @param externalUrl: GitHub URL for the pull request. Used for toast error messages.
 * @returns: TanStack query result containing the newly created comment.
 */
export function useCreateReviewCommentMutation(
  owner: string,
  repo: string,
  pullNumber: string,
  draftItem: DraftItem,
  externalUrl?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getCreateReviewCommentMutationKey(draftItem),
    mutationFn: async (comment: CommentCreateRequest) =>
      poster(
        `/api/v1/${owner}/${repo}/pulls/${pullNumber}/comments`,
        JSON.stringify(comment),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["review-comments", owner, repo, pullNumber],
      });
    },
    onError: (error) => {
      const message = "Failed to post comment.";
      if (error.status === 422) {
        toast.error(
          <PendingReviewError message={message} externalUrl={externalUrl} />,
        );
      } else {
        toast.error(message);
      }
    },
  });
}

export function getCreateReviewCommentMutationKey(
  draftItem: DraftItem,
): MutationKey {
  const MUTATION_KEY_PREFIX = "create-review-comment";

  if (draftItem.type === "reply") {
    const { filename, parentId } = draftItem.payload;
    return [MUTATION_KEY_PREFIX, filename, parentId];
  }

  const { activePath, subjectType } = draftItem.payload;
  if (subjectType === "line") {
    const { start, end, side } = draftItem.payload;
    return [MUTATION_KEY_PREFIX, activePath, start, end, side];
  }

  return [MUTATION_KEY_PREFIX, activePath];
}
