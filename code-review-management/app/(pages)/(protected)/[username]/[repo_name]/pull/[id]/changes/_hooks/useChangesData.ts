import { useParams } from "next/navigation";
import { PullParams } from "@/types/routing.types";
import { useAutoFetchAllPages } from "@/lib/api/hooks/useAutoFetchAllPages";
import { useCommitQuery } from "@/lib/api/queries/useCommitQuery";
import { useCompareCommitQuery } from "@/lib/api/queries/useCompareCommitQuery";
import { useListFilesQuery } from "@/lib/api/queries/useListFilesQuery";
import { usePullQuery } from "@/lib/api/queries/usePullQuery";
import { usePublishedThreads } from "./usePublishedThreads";
import { ChangesViewMode, useChangesViewMode } from "./useChangesViewMode";

export function useChangesData() {
  const { username, repo_name, id } = useParams<PullParams>();
  const { sha, mode } = useChangesViewMode();

  const {
    publishedThreads,
    isPending: isPublishedThreadsPending,
    isError: isPublishedThreadsError,
    error: publishedThreadsError,
  } = usePublishedThreads(username, repo_name, id);

  const {
    data: pull,
    isPending: isPullPending,
    isError: isPullError,
    error: pullError,
  } = usePullQuery(username, repo_name, id);

  const {
    data: files,
    hasNextPage: hasNextFilesPage,
    fetchNextPage: fetchNextFilesPage,
    isFetching: isFilesFetching,
    isPending: isFilesPending,
    isError: isFilesError,
    error: filesError,
  } = useListFilesQuery(username, repo_name, id, mode === "pr");
  useAutoFetchAllPages(hasNextFilesPage, isFilesFetching, fetchNextFilesPage);

  const {
    data: commit,
    hasNextPage: hasNextCommitPage,
    fetchNextPage: fetchNextCommitPage,
    isFetching: isCommitFetching,
    isPending: isCommitPending,
    isError: isCommitError,
    error: commitError,
  } = useCommitQuery(username, repo_name, sha ?? "", mode === "single-commit");
  useAutoFetchAllPages(
    hasNextCommitPage,
    isCommitFetching,
    fetchNextCommitPage,
  );

  const {
    data: compareCommit,
    isPending: isCompareCommitPending,
    isError: isCompareCommitError,
    error: compareCommitError,
  } = useCompareCommitQuery(
    username,
    repo_name,
    pull?.base?.sha ?? "",
    sha ?? "",
    mode === "cumulative-commit" && !!pull?.base?.sha,
  );

  let activeFiles = files;
  let activeExternalHref = pull?.html_url;
  let hasNextActiveFilesPage = hasNextFilesPage;
  let isActiveFilesPending = isFilesPending;
  let isActiveFilesError = isFilesError;
  let activeFilesError = filesError;

  if (mode === "single-commit") {
    activeFiles = commit?.files;
    activeExternalHref = commit?.html_url;
    hasNextActiveFilesPage = hasNextCommitPage;
    isActiveFilesPending = isCommitPending;
    isActiveFilesError = isCommitError;
    activeFilesError = commitError;
  } else if (mode === "cumulative-commit") {
    activeFiles = compareCommit?.files;
    activeExternalHref = compareCommit?.html_url;
    hasNextActiveFilesPage = false;
    isActiveFilesPending = isCompareCommitPending;
    isActiveFilesError = isCompareCommitError;
    activeFilesError = compareCommitError;
  }

  return {
    pull,
    files: activeFiles,
    externalHref: activeExternalHref,
    publishedThreads,
    isPending:
      isPullPending ||
      isPublishedThreadsPending ||
      isActiveFilesPending ||
      hasNextActiveFilesPage,
    isError: isPullError || isPublishedThreadsError || isActiveFilesError,
    error: pullError ?? publishedThreadsError ?? activeFilesError ?? null,
    errorSource: getErrorSource(
      isPullError,
      isPublishedThreadsError,
      isActiveFilesError,
      mode,
    ),
  };
}

function getErrorSource(
  isPullError: boolean,
  isPublishedThreadsError: boolean,
  isActiveFilesError: boolean,
  mode: ChangesViewMode,
): "pull request" | "commit" | null {
  if (isPullError || isPublishedThreadsError) return "pull request";
  // Files in default PR-viewing mode are associated with the pull request
  // resource. Otherwise, files in commit-viewing mode are associated with the
  // commit resource.
  if (isActiveFilesError) return mode === "pr" ? "pull request" : "commit";
  return null;
}
