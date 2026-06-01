import { useState } from "react";
import { PullRequest } from "@/types/github.types";
import { canMerge } from "../../_utils/pull-utils";
import { usePermissionChecks } from "../../_hooks/usePermissionChecks";
import Image from "next/image";
import AddReviewPopover from "../AddReviewPopover/AddReviewPopover";
import CommitIcon from "@/public/icons/commit.svg";
import CommitPicker from "../../changes/_components/CommitPicker/CommitPicker";
import HeaderButton from "@components/HeaderButton/HeaderButton";
import MergePopover from "../MergePopover/MergePopover";
import PRHeaderPopoverButton from "../PRHeaderPopoverButton/PRHeaderPopoverButton";
import { useParams } from "next/navigation";

type PRHeaderPopovers = "review" | "merge" | "commit";

/**
 * Shared action buttons for the PR overview and PR changes page-headers. The
 * view button toggles navigation between the two pages.
 *
 * @param viewHref: Where the view button navigates to.
 * @param viewLabel: What the view button displays.
 * @param pull: Pull request data.
 * @param showCommitPicker: Whether the commit picker button should be displayed or not.
 */
export default function PRHeaderActions({
  viewHref,
  viewLabel,
  pull,
  showCommitPicker,
}: {
  viewHref: string;
  viewLabel: string;
  pull: PullRequest;
  showCommitPicker?: boolean;
}) {
  const [activePopover, setActivePopover] = useState<PRHeaderPopovers | null>(
    null,
  );
  const { username, repo_name, id } = useParams();
  const { hasCommentPermission, hasWritePermission } = usePermissionChecks();

  const togglePopover = (popover: PRHeaderPopovers) => {
    setActivePopover((prev) => (prev === popover ? null : popover));
  };
  const toggleReview = () => togglePopover("review");
  const toggleMerge = () => togglePopover("merge");
  const toggleCommit = () => togglePopover("commit");

  const showReviewButton = hasCommentPermission;
  const showMergeButton =
    hasWritePermission && !pull.merged && pull.state === "open";

  const showResolveButton =
    hasWritePermission && pull.state === "open" && pull.mergeable_state === "dirty" && pull.head && pull.base;
  const resolutionHRef = showResolveButton ? `/${username}/${repo_name}/pull/${id}/conflict-resolution?target_branch=${pull.base?.ref}&feature_branch=${pull.head?.ref}` : "";

  const isMergeDisabled = !canMerge(pull);

  return (
    <>
      {showCommitPicker && (
        <PRHeaderPopoverButton
          buttonLabel={<Image src={CommitIcon} alt="Commit" />}
          buttonVariant="secondary"
          isPopoverOpen={activePopover === "commit"}
          popoverContent={<CommitPicker pull={pull} />}
          onToggle={toggleCommit}
        />
      )}
      <HeaderButton href={viewHref} variant="secondary">
        {viewLabel}
      </HeaderButton>
      {showReviewButton && (
        <PRHeaderPopoverButton
          buttonLabel="Add review"
          buttonVariant="secondary"
          isPopoverOpen={activePopover === "review"}
          popoverContent={
            <AddReviewPopover pull={pull} togglePopover={toggleReview} />
          }
          onToggle={toggleReview}
        />
      )}
      {showMergeButton && !showResolveButton && (
        <PRHeaderPopoverButton
          buttonLabel="Merge"
          isPopoverOpen={activePopover === "merge"}
          popoverContent={
            <MergePopover pull={pull} togglePopover={toggleMerge} />
          }
          onToggle={toggleMerge}
          isDisabled={isMergeDisabled}
          {...(isMergeDisabled && {
            tooltip: "Pull request cannot be merged",
          })}
        />
      )}
      {showResolveButton && (
        <HeaderButton href={resolutionHRef} variant="tertiary">
          {"Resolve"}
        </HeaderButton>
      )
      }
    </>
  );
}
