import { ReactNode } from "react";
import { formatDate } from "../../../_utils/date-utils";
import {
  extractSuggestions,
  SuggestiveComment,
} from "../CommentSuggestionEntry/suggestionParser";
import { SuggestionReplacementWidget } from "../CommentSuggestionEntry/SuggestionReplacementWidget";
import MarkdownEditor from "@components/MarkdownEditor/MarkdownEditor";
import UserIcon from "@components/UserIcon/UserIcon";
import styles from "./InlineCommentEntry.module.css";

/**
 * Used to render published and draft comment entries.
 *
 * @param avatar: The link/path to the avatar picture of the comment author.
 * @param username: Username of the comment author.
 * @param created: Date of comment creation.
 * @param defaultEditable: Whether the editor should be editable by default
 * (e.g., false for published comments and true for
 * draft comments)
 * @param defaultContent: Contents of the comment. Can be empty for newly
 *                        created drafts.
 * @param activePath: Path of the file being commented on. Used to highlight llm suggestions
 * @param startLine: Line that the comment is on, if it exists at all. Suggestive comments all have this.
 *                    We use this to render the bounds of each suggestion
 * @param commentID: This is the github ID of the comment. We pass this in to update the suggestion comment
 * @param editorActions: Action buttons to render below the editor content when
 *                       it is editable (e.g., publish buttons).
 * @param headerActions: Action buttons to render on the right-side of the
 *                       comment header.
 */
export default function InlineCommentEntry({
  avatar,
  username,
  created,
  defaultEditable,
  defaultContent,
  activePath,
  startLine,
  commentID,
  editorActions,
  headerActions,
}: {
  avatar: string;
  username: string;
  created?: string;
  defaultEditable: boolean;
  defaultContent?: string;
  activePath?: string;
  startLine?: number;
  commentID?: number;
  editorActions?: ReactNode;
  headerActions?: ReactNode;
}) {
  const suggestiveComment: SuggestiveComment = defaultContent
    ? extractSuggestions(defaultContent)
    : {
      hasSuggestion: false,
      relativeStartLine: 0,
      deletionContent: "",
      additionContent: "",
      isCommited: false,
    };

  if (!activePath) activePath = "";
  if (suggestiveComment.hasSuggestion) {
    if (!startLine) {
      suggestiveComment.hasSuggestion = false;
      startLine = 0;
    }
  } else {
    startLine = 0;
  }

  if (!commentID) {
    suggestiveComment.hasSuggestion = false;
    commentID = 0;
  }

  return (
    <div className={styles.comment}>
      <UserIcon avatarUrl={avatar} username={username} size={22} />
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.metadata}>
            <span className={styles.username}>{username}</span>
            {created && (
              <span className={styles.date}>
                {formatDate(new Date(created))}
              </span>
            )}
          </div>
          {headerActions}
        </div>

        {suggestiveComment.hasSuggestion ? (
          <SuggestionReplacementWidget
            suggestion={suggestiveComment}
            activePath={activePath}
            startLine={startLine}
            commentID={commentID}
          />
        ) : (
          <MarkdownEditor
            defaultEditable={defaultEditable}
            defaultContent={defaultContent}
            actions={editorActions}
          />
        )}
      </div>
    </div>
  );
}
