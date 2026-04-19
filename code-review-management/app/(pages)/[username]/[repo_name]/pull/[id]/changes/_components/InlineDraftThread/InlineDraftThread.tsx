import { useSession } from "next-auth/react";
import { useClearHighlightContext } from "../../_contexts/ClearHighlightContext";
import { useDraftThreadsContext } from "../../_contexts/DraftThreadsContext";
import { useMutationInFlight } from "@/lib/api/hooks/useMutationInFlight";
import { getCreateReviewCommentMutationKey } from "@/lib/api/mutations/useCreateReviewCommentMutation";
import { DraftThreadItem } from "../../_hooks/useDraftThreads";
import { deleteDraftThread } from "../../_utils/comment-utils";
import CancelButton from "@components/CancelButton/CancelButton";
import DraftEditorActions, { DraftItem } from "../DraftEditorActions/DraftEditorActions";
import InlineCommentEntry from "../InlineCommentEntry/InlineCommentEntry";
import InlineThreadHeader from "../InlineThreadHeader/InlineThreadHeader";
import styles from "./InlineDraftThread.module.css";

/**
 * Displays a draft thread that is anchored to specific lines in a file diff.
 * Contains an editor where the user can draft a comment associated with those
 * lines, and begin a new thread upon submission.
 *
 * @param draft: `DraftThreadItem` object containing data about the draft thread.
 */
export default function InlineDraftThread({
  draft,
}: {
  draft: DraftThreadItem;
}) {
  const { data: session } = useSession();
  const { setDraftThreads } = useDraftThreadsContext();
  const { clearHighlight } = useClearHighlightContext();

  const handleCancel = () => {
    deleteDraftThread(draft, setDraftThreads);
    // Clear highlight if it is currently associated with the draft to be deleted.
    if (draft.subjectType === "line") {
      clearHighlight({
        start: draft.start,
        end: draft.end,
        side: draft.side,
      });
    }
  };

  const draftItem: DraftItem = { type: "thread", payload: draft };
  const isSubmitPending = useMutationInFlight({
    mutationKey: getCreateReviewCommentMutationKey(draftItem),
  });

  return (
    <div className={styles.thread}>
      <InlineThreadHeader
        title={getThreadTitle(draft)}
        actions={
          !isSubmitPending && (
            <CancelButton
              onClick={handleCancel}
              tooltipContent="Cancel draft"
            />
          )
        }
      />
      <div className={styles.comment}>
        <InlineCommentEntry
          avatar={session?.user.image ?? "/mock/octocat.png"}
          username={session?.user.githubLogin ?? ""}
          defaultEditable={true}
          editorActions={<DraftEditorActions draft={draftItem} />}
        />
      </div>
    </div>
  );
}

/**
 * Gets the header text for the draft thread. Indicates which sides and lines
 * the draft is anchored to.
 *
 * TODO: Only indicate the side ("R" or "L") if it is a modified file.
 * Otherwise, if it is a new file or deleted file, react-diff-view does not do a
 * split view, so it does not make sense to show "R" or "L".
 *
 * @param draft: `DraftThreadItem` object containing data about the draft thread.
 */
function getThreadTitle(draft: DraftThreadItem) {
  if (draft.subjectType === "file") return "Draft on file-level";

  const side = draft.side === "new" ? "R" : "L";
  const end = `${side}${draft.end}`;

  if (draft.start !== draft.end) {
    const start = `${side}${draft.start}`;
    return `Draft on lines ${start} to ${end}`;
  }

  return `Draft on line ${end}`;
}
