import { useCreateReviewCommentMutation } from "@/lib/api/mutations/useCreateReviewCommentMutation";
import { usePullQuery } from "@/lib/api/queries/usePullQuery";
import { useMarkdownEditorContext } from "@components/MarkdownEditor/MarkdownEditorContext";
import { useDraftRepliesContext } from "../_contexts/DraftRepliesContext";
import { useDraftThreadsContext } from "../_contexts/DraftThreadsContext";
import {
  deleteDraftReply,
  deleteDraftThread,
  getDraftThreadFilePath,
} from "../_utils/comment-utils";
import { toGitHubSide } from "../_utils/diff-utils";
import { DraftItem } from "../_components/DraftEditorActions/DraftEditorActions";
import { PullRequest } from "@/types/github.types";

export function useSubmitDraftItem(
  draft: DraftItem,
  owner: string,
  repo: string,
  pullNumber: string,
) {
  const { setDraftReplies } = useDraftRepliesContext();
  const { setDraftThreads } = useDraftThreadsContext();
  const { editorContent } = useMarkdownEditorContext();
  const {
    data: pull,
    isPending: isPullPending,
    isError: isPullError,
  } = usePullQuery(owner, repo, pullNumber);
  const {
    mutate,
    isPending: isSubmitPending,
    isError: isSubmitError,
  } = useCreateReviewCommentMutation(owner, repo, pullNumber, draft);

  const submitThread = (
    draft: Extract<DraftItem, { type: "thread" }>,
    pull: PullRequest,
  ) => {
    const { payload } = draft;
    const { oldPath, activePath, fileStatus, subjectType } = payload;
    const side = subjectType === "line" ? payload.side : undefined;
    const path = getDraftThreadFilePath(oldPath, activePath, fileStatus, side);

    mutate(
      {
        body: editorContent,
        commit_id: pull.head?.sha ?? "",
        path,
        subject_type: subjectType,
        ...(subjectType === "line" && {
          start_side: toGitHubSide(payload.side),
          side: toGitHubSide(payload.side),
          start_line: payload.start,
          line: payload.end,
        }),
      },
      {
        // Fires after invalidating the TanStack cache for review comments
        // and refetching them.
        onSuccess: () => deleteDraftThread(payload, setDraftThreads),
      },
    );
  };

  const submitReply = (
    draft: Extract<DraftItem, { type: "reply" }>,
    pull: PullRequest,
  ) => {
    mutate(
      {
        body: editorContent,
        commit_id: pull.head?.sha ?? "",
        path: draft.payload.filename,
        in_reply_to: draft.payload.parentId,
      },
      {
        onSuccess: () => deleteDraftReply(draft.payload, setDraftReplies),
      },
    );
  };

  const handleSubmit = () => {
    // On pulls pending, button is already disabled. On pulls error, do nots
    // allow submission.
    if (!pull) return;
    if (draft.type === "thread") {
      submitThread(draft, pull);
    } else {
      submitReply(draft, pull);
    }
  };

  return {
    handleSubmit,
    isSubmitPending,
    isSubmitError,
    isPullPending,
    isPullError,
  };
}
