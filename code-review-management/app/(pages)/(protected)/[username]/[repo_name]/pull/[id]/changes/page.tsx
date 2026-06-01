"use client";

import { ReactNode, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PullParams } from "@/types/routing.types";
import { useChangesData } from "./_hooks/useChangesData";
import { useChangesViewMode } from "./_hooks/useChangesViewMode";
import { useDraftReplies } from "./_hooks/useDraftReplies";
import { useDraftThreads } from "./_hooks/useDraftThreads";
import { buildFileTree, flattenFileTree } from "./_utils/filetree-utils";
import { StatusError } from "@/lib/api/errors/statusError";
import ActivityPanel from "./_components/ActivityPanel/ActivityPanel";
import CommitPickerProvider from "../_contexts/CommitPickerContext";
import CommitViewBanner from "./_components/CommitViewBanner/CommitViewBanner";
import DraftRepliesContext from "./_contexts/DraftRepliesContext";
import DraftThreadsContext from "./_contexts/DraftThreadsContext";
import DiffListView from "./_components/DiffListView/DiffListView";
import ErrorMessage from "@components/ErrorMessage/ErrorMessage";
import FileTree from "./_components/FileTree/FileTree";
import LoadingSpinner from "@components/LoadingSpinner/LoadingSpinner";
import PRChangesHeader from "./_components/PRChangesHeader/PRChangesHeader";
import styles from "./page.module.css";

function ChangesProviders({ children }: { children: ReactNode }) {
  const { draftReplies, setDraftReplies } = useDraftReplies();
  const { draftThreads, setDraftThreads } = useDraftThreads();

  return (
    <CommitPickerProvider>
      <DraftRepliesContext value={{ draftReplies, setDraftReplies }}>
        <DraftThreadsContext value={{ draftThreads, setDraftThreads }}>
          {children}
        </DraftThreadsContext>
      </DraftRepliesContext>
    </CommitPickerProvider>
  );
}

export default function Changes() {
  const {
    pull,
    files,
    externalHref,
    publishedThreads,
    isPending,
    isError,
    error,
    errorSource,
  } = useChangesData();
  const { sha, mode } = useChangesViewMode();

  const fileTree = useMemo(() => buildFileTree(files ?? []), [files]);
  const flatFileTree = useMemo(() => flattenFileTree(fileTree), [fileTree]);

  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const toggleActivityPanel = () => setIsActivityPanelOpen((prev) => !prev);

  if (isError && errorSource !== "commit") {
    return (
      <div className={styles.page}>
        <ChangesErrorMessage error={error} errorSource={errorSource} />
      </div>
    );
  }
  // Keep pending check below error check since `useChangesData` conditionally
  // calls APIs (e.g., Compare commit query is disabled until pull.base.sha is
  // defined. However, if the pull request query fails, then the compare commit
  // query is never enabled and will be endlessly pending, so the error message
  // would never show).
  else if (isPending) return <LoadingSpinner centered forPageLevel />;

  return (
    // If SHA query param changes, re-mount entire page.
    <ChangesProviders key={`${sha}-${mode}`}>
      <div className={styles.page}>
        <div className={styles.pageBody}>
          <div className={styles.bodyMain}>
            <PRChangesHeader
              pull={pull!}
              isActivityPanelOpen={isActivityPanelOpen}
              toggleActivityPanel={toggleActivityPanel}
            />
            <div
              className={`${styles.changes} ${isActivityPanelOpen ? styles.changesWithPanel : ""}`}
            >
              {isError ? (
                <ChangesErrorMessage error={error} errorSource={errorSource} />
              ) : (
                <>
                  <FileTree fileTree={fileTree} />
                  <DiffListView
                    pull={pull!}
                    flatFileTree={flatFileTree}
                    // Use non-null assertion since threads are defined if not in pending/error state.
                    publishedThreads={publishedThreads!}
                    externalHref={externalHref}
                    sha={sha}
                  />
                </>
              )}
            </div>
          </div>
          <ActivityPanel
            publishedThreads={publishedThreads!}
            flatFileTree={flatFileTree}
            isOpen={isActivityPanelOpen}
            togglePanel={toggleActivityPanel}
          />
        </div>
        {!isError && sha && <CommitViewBanner sha={sha} />}
      </div>
    </ChangesProviders>
  );
}

function ChangesErrorMessage({
  error,
  errorSource,
}: {
  error: StatusError | null;
  errorSource: string | null;
}) {
  const { username, repo_name, id } = useParams<PullParams>();
  return (
    <>
      {errorSource !== "commit" ? (
        <ErrorMessage
          error={error}
          resource={errorSource}
          {...(error?.status === 404 && {
            internalLabel: "Back to dashboard",
            internalHref: `/dashboard`,
          })}
        />
      ) : (
        <ErrorMessage
          error={error}
          resource={errorSource}
          {...((error?.status === 422 || error?.status === 404) && {
            internalLabel: "Back to all changes",
            internalHref: `/${username}/${repo_name}/pull/${id}/changes`,
          })}
        />
      )}
    </>
  );
}
