import { useMemo } from "react";
import { parseDiff } from "react-diff-view";
import { useDraftThreadsContext } from "../../_contexts/DraftThreadsContext";
import { useActiveDiffs } from "../../_hooks/useActiveDiffs";
import { useChangesViewMode } from "../../_hooks/useChangesViewMode";
import { usePublishedThreadsByDiff } from "../../_hooks/usePublishedThreadsByDiff";
import { FileDiff, PullRequest } from "@/types/github.types";
import { PublishedThreads } from "../../_hooks/usePublishedThreads";
import { getActivePath, fixParsedDiffPaths } from "../../_utils/diff-utils";
import { orderParsedDiffs } from "../../_utils/filetree-utils";
import AlertBanner from "@components/AlertBanner/AlertBanner";
import ErrorMessage from "@components/ErrorMessage/ErrorMessage";
import FileDiffView from "../FileDiffView/FileDiffView";
import IconTooltip from "@components/IconTooltip/IconTooltip";
import styles from "./DiffListView.module.css";

const MAX_EXPANDED_DIFFS_ON_LOAD = 30;

export default function DiffListView({
  pull,
  flatFileTree,
  publishedThreads,
  sha,
  externalHref,
}: {
  pull: PullRequest;
  flatFileTree: FileDiff[];
  publishedThreads: PublishedThreads;
  sha: string | null;
  externalHref?: string;
}) {
  const { draftThreads, setDraftThreads } = useDraftThreadsContext();
  const { mode } = useChangesViewMode();
  const { diffString, isPending, isError, error } = useActiveDiffs(pull);

  const diffs = useMemo(() => {
    if (!diffString) return []; // Fallback to handle type errors, but won't render during loading/error state.
    const parsedDiffs = parseDiff(diffString, { nearbySequences: "zip" });

    fixParsedDiffPaths(diffString, parsedDiffs);
    orderParsedDiffs(parsedDiffs, flatFileTree);

    // Ordered `parsedDiffs` array has 1-1 matching with ordered `flatFileTree` array.
    return parsedDiffs.map((diff, index) => ({
      diff,
      fileMeta: flatFileTree.at(index),
    }));
  }, [diffString, flatFileTree]);

  const publishedThreadsByDiff = usePublishedThreadsByDiff(
    publishedThreads,
    diffs,
  );

  // TODO: Replace with proper loading UI.
  if (isPending) return <div>Loading diffs...</div>;
  if (isError) {
    return (
      <ErrorMessage error={error} resource="diff" externalHref={externalHref} />
    );
  }

  // Compare two commits API returns a maximum of 300 file objects. This is a
  // limitation that can break the UI, so show an error if react-diff-view
  // parses more than 300 files from the diff-string.
  if (mode === "cumulative-commit" && diffs.length > 300) {
    return (
      <ErrorMessage
        error={null}
        resource="cumulative-diff"
        externalHref={externalHref}
      />
    );
  }

  return (
    <div className={`${styles.diffListView} ${sha ? styles.extraPadding : ""}`}>
      {diffs.length > MAX_EXPANDED_DIFFS_ON_LOAD && <OptimizationBanner />}
      {diffs.map(({ diff, fileMeta }, idx) => {
        const activePath = getActivePath(diff.type, diff.oldPath, diff.newPath);
        const diffId = diff.oldPath + "-" + diff.newPath;
        const tooltips = (
          <>
            <IconTooltip id={`tooltip-collapse-diff-${diffId}`} />
            <IconTooltip id={`tooltip-file-comment-${diffId}`} />
            <IconTooltip id={`tooltip-copy-${diff.oldPath}`} />
            <IconTooltip id={`tooltip-copy-${diff.newPath}`} />
          </>
        );

        return (
          <div key={diffId}>
            {tooltips}
            <FileDiffView
              diff={diff}
              fileMeta={fileMeta}
              viewType="split"
              publishedThreads={publishedThreadsByDiff[activePath]}
              draftThreadsByLine={draftThreads[activePath]}
              setDraftThreads={setDraftThreads}
              isCommitView={mode !== "pr"}
              isExpandedDefault={idx < MAX_EXPANDED_DIFFS_ON_LOAD}
            />
          </div>
        );
      })}
    </div>
  );
}

function OptimizationBanner() {
  return (
    <AlertBanner>
      To optimize performance, only the first {MAX_EXPANDED_DIFFS_ON_LOAD} files
      are expanded by default.
    </AlertBanner>
  );
}
