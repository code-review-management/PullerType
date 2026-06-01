import { useParams } from "next/navigation";
import { useRouter } from "@bprogress/next/app";
import { Dispatch, ReactNode, SetStateAction, SubmitEvent } from "react";
import { PullParams } from "@/types/routing.types";
import { Commit, PullRequest } from "@/types/github.types";
import { useAutoFetchAllPages } from "@/lib/api/hooks/useAutoFetchAllPages";
import { useListCommitsQuery } from "@/lib/api/queries/useListCommitsQuery";
import { useCommitPickerContext } from "../../../_contexts/CommitPickerContext";
import { formatDate } from "../../../_utils/date-utils";
import ErrorMessage from "@components/ErrorMessage/ErrorMessage";
import IconTooltip from "@components/IconTooltip/IconTooltip";
import LoadingSpinner from "@components/LoadingSpinner/LoadingSpinner";
import PopoverContent from "@components/PopoverContent/PopoverContent";
import SubmitButton from "@components/SubmitButton/SubmitButton";
import styles from "./CommitPicker.module.css";

const VIEW_MODES = [
  {
    isCumulative: false,
    label: "Single",
    tooltip: "View only the changes introduced by this commit",
  },
  {
    isCumulative: true,
    label: "Cumulative",
    tooltip: "View all changes from the merge base to this commit",
  },
];

export default function CommitPicker({ pull }: { pull: PullRequest }) {
  const router = useRouter();
  const { username, repo_name, id } = useParams<PullParams>();
  const { selectedSha, setSelectedSha, isCumulative, setIsCumulative } =
    useCommitPickerContext();

  const {
    data: commits,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isPending,
    isError,
    error,
  } = useListCommitsQuery(username, repo_name, id, pull.head?.sha ?? "");
  useAutoFetchAllPages(hasNextPage, isFetching, fetchNextPage);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const base = `/${username}/${repo_name}/pull/${id}/changes`;
    if (!selectedSha) return router.push(base);

    const params = new URLSearchParams({ sha: selectedSha });
    if (isCumulative) params.set("cumulative", "true");
    router.push(`${base}?${params.toString()}`);
  };

  return (
    <PopoverContent>
      <form className={styles.container} onSubmit={handleSubmit}>
        {isPending ? (
          <LoadingSpinner centered />
        ) : isError ? (
          <ErrorMessage error={error} resource="commit list" />
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.title} data-testid="commit-title">
                Commits{" "}
                <span className={styles.count} data-testid="commit-count">
                  {commits?.length ?? ""}
                </span>
              </div>
              <ViewModeToggle
                isCumulative={isCumulative}
                setIsCumulative={setIsCumulative}
                isDisabled={selectedSha === null}
              />
            </div>
            <div className={styles.list} data-testid="commit-list">
              <CommitOption
                value={null}
                checked={selectedSha === null}
                onChange={setSelectedSha}
              >
                <span className={styles.message}>Show all changes</span>
              </CommitOption>
              {commits?.map((commit) => (
                <CommitOption
                  key={commit.sha}
                  value={commit.sha}
                  checked={selectedSha === commit.sha}
                  onChange={setSelectedSha}
                >
                  <CommitDetails commit={commit} />
                </CommitOption>
              ))}
            </div>
            <div className={styles.submit}>
              <SubmitButton label="View changes" isDisabled={false} />
            </div>
          </>
        )}
      </form>
      <IconTooltip id="tooltip-commit-view-mode" positionStrategy="fixed" />
    </PopoverContent>
  );
}

function CommitDetails({ commit }: { commit: Commit }) {
  return (
    <span className={styles.info}>
      <span className={styles.message}>{commit.commit.message}</span>
      <span className={styles.meta}>
        <span className={styles.sha}>{commit.sha.slice(0, 7)}</span>
        <span>{commit.commit.author.name}</span>
        <span>{formatDate(new Date(commit.commit.author.date))}</span>
      </span>
    </span>
  );
}

function CommitOption({
  value,
  checked,
  onChange,
  children,
}: {
  value: string | null;
  checked: boolean;
  onChange: Dispatch<SetStateAction<string | null>>;
  children: ReactNode;
}) {
  return (
    <label className={`${styles.option} ${checked ? styles.checked : ""}`}>
      <input
        type="radio"
        name="commit"
        value={value ?? ""}
        required
        checked={checked}
        onChange={() => onChange(value)}
        className={styles.radio}
      />
      {children}
    </label>
  );
}

function ViewModeToggle({
  isCumulative,
  setIsCumulative,
  isDisabled,
}: {
  isCumulative: boolean;
  setIsCumulative: Dispatch<SetStateAction<boolean>>;
  isDisabled: boolean;
}) {
  return (
    <div className={styles.viewModeToggle}>
      {VIEW_MODES.map(({ isCumulative: isCumulativeMode, label, tooltip }) => (
        <button
          key={label}
          type="button"
          disabled={isDisabled}
          onClick={() => setIsCumulative(isCumulativeMode)}
          data-tooltip-id="tooltip-commit-view-mode"
          data-tooltip-content={
            isDisabled ? "Select a commit to use this option" : tooltip
          }
          data-tooltip-place="bottom"
          data-tooltip-delay-show={100}
          className={`${styles.viewModeButton} ${isCumulative === isCumulativeMode && !isDisabled ? styles.activeViewMode : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
