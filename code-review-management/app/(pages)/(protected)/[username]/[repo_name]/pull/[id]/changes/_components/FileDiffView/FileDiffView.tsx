import refractor from "refractor";
import {
  Dispatch,
  memo,
  SetStateAction,
  useMemo,
  useRef,
  useState,
} from "react";
import { Fragment } from "react/jsx-runtime";
import {
  Decoration,
  Diff,
  FileData,
  GutterOptions,
  Hunk,
  tokenize,
  ViewType,
} from "react-diff-view";

import { DraftThreads, DraftThreadsByLine } from "../../_hooks/useDraftThreads";
import { useHighlight } from "../../_hooks/useHighlight";
import { usePermissionChecks } from "../../../_hooks/usePermissionChecks";
import { PublishedThreadsByScope } from "../../_hooks/usePublishedThreads";
import { useScrollToId } from "../../_hooks/useScrollToId";
import { createDraftThread } from "../../_utils/comment-utils";
import {
  createFileDiffId,
  getActivePath,
  getLanguage,
  getLoadDiffReason,
} from "../../_utils/diff-utils";
import { getWidgets } from "../../_utils/widget-utils";
import { FileDiff } from "@/types/github.types";
import { ThreadList } from "../InlineThreadList/InlineThreadList";
import ClearHighlightContext from "../../_contexts/ClearHighlightContext";
import EmptyDiff from "../EmptyDiff/EmptyDiff";
import FileDiffHeader from "../FileDiffHeader/FileDiffHeader";
import Gutter from "../Gutter/Gutter";
import LoadDiffPrompt from "../LoadDiffPrompt/LoadDiffPrompt";

import styles from "./FileDiffView.module.css";
import "prism-color-variables/variables.css";
import "react-diff-view/style/index.css";
import "./ReactDiffView.css";

/**
 * Docs:
 * 1. https://github.com/otakustay/react-diff-view?tab=readme-ov-file#render-diff-hunks
 */

export default memo(function FileDiffView({
  diff,
  fileMeta,
  viewType,
  publishedThreads,
  draftThreadsByLine,
  setDraftThreads,
  isCommitView,
  isExpandedDefault,
}: {
  diff: FileData;
  fileMeta?: FileDiff;
  viewType: ViewType;
  publishedThreads: PublishedThreadsByScope;
  draftThreadsByLine: DraftThreadsByLine | undefined; // Undefined when there are no draft threads in the current file.
  setDraftThreads: Dispatch<SetStateAction<DraftThreads>>;
  isCommitView: boolean;
  isExpandedDefault: boolean;
}) {
  const { type: diffType, oldPath, newPath, hunks } = diff;
  const activePath = getActivePath(diffType, oldPath, newPath);

  const { hasCommentPermission } = usePermissionChecks();
  const isCommentingDisabled = isCommitView || !hasCommentPermission;

  const { activeHighlight, highlightEvents, clearHighlight } = useHighlight(
    oldPath,
    activePath,
    fileMeta?.status ?? "",
    setDraftThreads,
    isCommentingDisabled,
  );

  const [isExpanded, setIsExpanded] = useState(isExpandedDefault);
  const loadDiffReason = getLoadDiffReason(hunks, fileMeta);
  const [isDiffLoaded, setIsDiffLoaded] = useState(loadDiffReason === null);

  const fileDiffRef = useRef<HTMLDivElement>(null);
  const { scrollToId } = useScrollToId(
    activePath,
    setIsDiffLoaded,
    setIsExpanded,
    fileDiffRef,
  );

  // Use memoization to reduce lag while highlighting.
  const tokens = useMemo(
    () =>
      tokenize(hunks, {
        highlight: true,
        refractor: refractor,
        language: getLanguage(activePath),
      }),
    [activePath, hunks],
  );

  // Use memoization to avoid re-calculations of widgets while highlighting.
  const widgets = useMemo(() => {
    if (isCommitView) return;
    return getWidgets(
      activePath,
      hunks,
      publishedThreads.lineThreads,
      draftThreadsByLine ?? {},
    );
  }, [
    isCommitView,
    activePath,
    hunks,
    publishedThreads.lineThreads,
    draftThreadsByLine,
  ]);

  const renderGutter = ({ change, side, renderDefault }: GutterOptions) => (
    <Gutter
      change={change}
      side={side}
      renderDefault={renderDefault}
      activeHighlight={activeHighlight}
      isHighlightDisabled={isCommentingDisabled}
    />
  );

  const hasFileLevelThreads =
    publishedThreads.fileThreads.length > 0 ||
    draftThreadsByLine?.["file-level"];

  return (
    <ClearHighlightContext value={{ clearHighlight }}>
      <div
        ref={fileDiffRef}
        className={`${styles.fileDiffView} ${activeHighlight.isHighlighting ? styles.isHighlighting : ""}`}
        id={createFileDiffId(activePath)}
      >
        <FileDiffHeader
          fileMeta={fileMeta}
          diffType={diffType}
          oldPath={oldPath}
          newPath={newPath}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          isCommentingDisabled={isCommentingDisabled}
          createFileDraftThread={() => {
            createDraftThread(setDraftThreads, activePath, {
              oldPath,
              activePath,
              fileStatus: fileMeta?.status ?? "",
              body: "",
              subjectType: "file",
            });
            scrollToId(`file-draft-${activePath}`);
          }}
        />
        <div className={!isExpanded ? styles.collapsed : ""}>
          {hasFileLevelThreads && !isCommitView && (
            <ThreadList
              publishedThreads={publishedThreads.fileThreads}
              draftThread={draftThreadsByLine?.["file-level"]}
            />
          )}
          {!isDiffLoaded && (
            <LoadDiffPrompt
              setIsDiffLoaded={setIsDiffLoaded}
              reason={loadDiffReason}
            />
          )}
          {/* Do not unmount if not loaded so scroll still works. */}
          <div className={!isDiffLoaded ? styles.unloaded : ""}>
            {hunks.length > 0 ? (
              <Diff
                viewType={viewType}
                diffType={diffType}
                hunks={hunks}
                tokens={tokens}
                widgets={widgets}
                renderGutter={renderGutter}
                gutterEvents={highlightEvents}
              >
                {(hunks) =>
                  hunks.map((hunk) => (
                    <Fragment key={hunk.content}>
                      <Decoration>{hunk.content}</Decoration>
                      <Hunk hunk={hunk} />
                    </Fragment>
                  ))
                }
              </Diff>
            ) : (
              <EmptyDiff diff={diff} fileMeta={fileMeta} />
            )}
          </div>
        </div>
      </div>
    </ClearHighlightContext>
  );
});
