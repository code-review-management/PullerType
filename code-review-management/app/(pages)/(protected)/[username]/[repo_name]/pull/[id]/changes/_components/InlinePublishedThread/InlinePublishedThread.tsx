import { useSession } from "next-auth/react";
import { useDraftRepliesContext } from "../../_contexts/DraftRepliesContext";
import { useChangesViewMode } from "../../_hooks/useChangesViewMode";
import { DraftReplyItem, getDraftReplyKey } from "../../_hooks/useDraftReplies";
import { usePermissionChecks } from "../../../_hooks/usePermissionChecks";
import { PublishedThreadItem } from "../../_hooks/usePublishedThreads";
import { deleteDraftReply, getBasename } from "../../_utils/comment-utils";
import { createFileDiffId } from "../../_utils/diff-utils";
import { useMutationInFlight } from "@/lib/api/hooks/useMutationInFlight";
import { getCreateReviewCommentMutationKey } from "@/lib/api/mutations/useCreateReviewCommentMutation";
import CancelButton from "@components/CancelButton/CancelButton";
import DraftEditorActions, {
  DraftItem,
} from "../DraftEditorActions/DraftEditorActions";
import InlineCommentEntry from "../InlineCommentEntry/InlineCommentEntry";
import InlineDraftReplyTrigger from "../InlineDraftReplyTrigger/InlineDraftReplyTrigger";
import InlineThreadHeader from "../InlineThreadHeader/InlineThreadHeader";
import styles from "./InlinePublishedThread.module.css";

export type ThreadStatus = "current" | "line-outdated" | "file-detached";
type ThreadViewType = "inline" | "panel";

/**
 * Displays a published thread that is anchored to specific lines in a file diff.
 *
 * @param thread: `PublishedThreadItem` object containing data about the published thread.
 * @param viewType: Where the published thread is rendered.
 * @param status: Status of the thread. Used for displaying stale chips from the
 *                side-panel.
 */
export default function InlinePublishedThread({
  thread,
  viewType,
  status,
}: {
  thread: PublishedThreadItem;
  viewType: ThreadViewType;
  status?: ThreadStatus;
}) {
  const { mode } = useChangesViewMode();
  const { hasCommentPermission } = usePermissionChecks();
  const { draftReplies, setDraftReplies } = useDraftRepliesContext();
  const draftReplyKey = getDraftReplyKey(thread.path, thread.id);
  const isDraftingReply = draftReplyKey in draftReplies;
  let startLine: number | undefined = undefined;
  if (thread.start_line) startLine = thread.start_line;
  else if (thread.line) startLine = thread.line;

  const handleCancelReply = () => {
    deleteDraftReply(draftReplies[draftReplyKey], setDraftReplies);
  };

  const isStale = status && status !== "current";
  const isAnchorEnabled =
    viewType === "panel" && status !== "file-detached" && mode === "pr";

  let anchorHref =
    thread.subject_type === "file"
      ? `file-thread-${thread.id}`
      : `inline-thread-${thread.id}`;
  if (status === "line-outdated") anchorHref = createFileDiffId(thread.path);

  return (
    <div
      className={styles.thread}
      {...(viewType === "inline" && { id: anchorHref })}
    >
      <InlineThreadHeader
        title={getThreadTitle(thread, viewType)}
        {...(viewType === "panel" && { tooltip: thread.path })}
        {...(isAnchorEnabled && { anchorHref: `#${anchorHref}` })}
        {...(isStale && {
          actions: <StaleStatusChip status={status} />,
        })}
      />
      <div className={styles.comments}>
        {thread.comments.map((comment) => (
          <InlineCommentEntry
            key={comment.id}
            commentID={comment.id}
            avatar={comment.user.avatar_url}
            username={comment.user.login}
            created={comment.created_at}
            defaultEditable={false}
            defaultContent={comment.body}
            activePath={comment.path}
            startLine={startLine}
          />
        ))}
        {hasCommentPermission &&
          viewType === "inline" && ( // Reply option currently supported only for inline threads.
            <>
              {isDraftingReply ? (
                <InlineDraftReplyEntry
                  reply={draftReplies[draftReplyKey]}
                  handleCancel={handleCancelReply}
                />
              ) : (
                <InlineDraftReplyTrigger thread={thread} />
              )}
            </>
          )}
      </div>
    </div>
  );
}

function InlineDraftReplyEntry({
  reply,
  handleCancel,
}: {
  reply: DraftReplyItem;
  handleCancel: () => void;
}) {
  const { data: session } = useSession();
  const draftItem: DraftItem = { type: "reply", payload: reply };
  const isSubmitPending = useMutationInFlight({
    mutationKey: getCreateReviewCommentMutationKey(draftItem),
  });

  return (
    <InlineCommentEntry
      avatar={session?.user.image ?? "/mock/octocat.png"}
      username={session?.user.githubLogin ?? ""}
      defaultEditable={true}
      editorActions={<DraftEditorActions draft={draftItem} />}
      headerActions={
        !isSubmitPending && (
          <CancelButton onClick={handleCancel} tooltipContent="Cancel reply" />
        )
      }
    />
  );
}

function StaleStatusChip({
  status,
}: {
  status: "line-outdated" | "file-detached";
}) {
  const isLineOutdated = status === "line-outdated";
  const colorClass = isLineOutdated ? styles.outdated : styles.detached;
  return (
    <div className={`${styles.chip} ${colorClass}`}>
      {isLineOutdated ? "Line outdated" : "File detached"}
    </div>
  );
}

function getThreadTitle(thread: PublishedThreadItem, viewType: ThreadViewType) {
  const basename = getBasename(thread.path);

  let line = thread.line;
  let startLine = thread.start_line;
  if (!line) {
    line = thread.original_line;
    startLine = thread.original_start_line;
  }

  if (thread.subject_type === "file") {
    return viewType === "inline" ? "Thread on file-level" : basename;
  }

  // Placeholder in case the ending line or side are undefined.
  if (!line || !thread.side) {
    return viewType === "inline" ? "Thread on file changes" : basename;
  }

  const formatSide = (side: string) => (side === "RIGHT" ? "R" : "L");
  const endRange = `${formatSide(thread.side)}${line}`;

  // Starting line and side are undefined when it is not a multi-line comment.
  if (thread.start_side && startLine && startLine !== line) {
    const startRange = `${formatSide(thread.start_side)}${startLine}`;
    return viewType === "inline"
      ? `Thread on lines ${startRange} to ${endRange}`
      : `${basename}: ${startRange} to ${endRange}`;
  }

  return viewType === "inline"
    ? `Thread on line ${endRange}`
    : `${basename}: ${endRange}`;
}
