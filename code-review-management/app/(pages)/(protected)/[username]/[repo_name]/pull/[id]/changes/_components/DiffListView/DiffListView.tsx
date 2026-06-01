import { useMemo } from "react";
import { parseDiff } from "react-diff-view";
import { useDraftThreadsContext } from "../../_contexts/DraftThreadsContext";
import { useActiveDiffs } from "../../_hooks/useActiveDiffs";
import { useChangesViewMode } from "../../_hooks/useChangesViewMode";
import { usePublishedThreadsByDiff } from "../../_hooks/usePublishedThreadsByDiff";
import { FileDiff, PullRequest } from "@/types/github.types";
import { PublishedThreads } from "../../_hooks/usePublishedThreads";
import {
  getActivePath,
  fixParsedDiffPaths,
  buildFileDiffMap,
} from "../../_utils/diff-utils";
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

  const { diffs, isMappingError } = useMemo(() => {
    if (!diffString) return { diffs: [], isMappingError: false };
    const parsedDiffs = parseDiff(diffString, { nearbySequences: "zip" });
    fixParsedDiffPaths(diffString, parsedDiffs);
    orderParsedDiffs(parsedDiffs, flatFileTree);

    const { diffs, isMappingError } = buildFileDiffMap(
      parsedDiffs,
      flatFileTree,
    );
    return { diffs, isMappingError };
  }, [diffString, flatFileTree]);

  const publishedThreadsByDiff = usePublishedThreadsByDiff(
    publishedThreads,
    diffs,
  );

  if (isPending) return <DiffListViewSkeleton />;
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
      {isMappingError && <MappingErrorBanner />}
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

function DiffListViewSkeleton() {
  const SKELETON_FLEX_GROWS = [3, 2, 4, 2];
  return (
    <div className={styles.skeletonWrapper}>
      {SKELETON_FLEX_GROWS.map((grow, idx) => (
        <div
          key={idx} // Use index since array is static.
          className={styles.skeletonItem}
          style={{ flexGrow: grow }}
        />
      ))}
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

function MappingErrorBanner() {
  return (
    <AlertBanner variant="error">
      Not all files in this pull request could be matched with data from GitHub.
      Affected files may not display header stats or inline comments.
      Commenting, navigating from the file tree, and jumping to comments from
      the side panel may not work as expected.
    </AlertBanner>
  );
}
