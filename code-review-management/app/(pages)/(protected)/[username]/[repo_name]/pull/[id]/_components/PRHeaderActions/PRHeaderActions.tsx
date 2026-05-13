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
  const [activePopover, setActivePopover] = useState<PRHeaderPopovers | null>(null);
  const { hasCommentPermission, hasWritePermission } = usePermissionChecks();

  const togglePopover = (popover: PRHeaderPopovers) => {
    setActivePopover((prev) => (prev === popover ? null : popover));
  };
  const toggleReview = () => togglePopover("review");
  const toggleMerge = () => togglePopover("merge");
  const toggleCommit = () => togglePopover("commit");

  const showReviewButton = hasCommentPermission;
  const showMergeButton = hasWritePermission && !pull.merged && pull.state === "open";
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
          popoverContent={<AddReviewPopover pull={pull} togglePopover={toggleReview} />}
          onToggle={toggleReview}
        />
      )}
      {showMergeButton && (
        <PRHeaderPopoverButton
          buttonLabel="Merge"
          isPopoverOpen={activePopover === "merge"}
          popoverContent={<MergePopover pull={pull} togglePopover={toggleMerge} />}
          onToggle={toggleMerge}
          // TODO: Also disable if the user does not have appropriate write permissions.
          isDisabled={isMergeDisabled}
          {...(isMergeDisabled && {
            // TODO: Replace with more descriptive message.
            tooltip: "Pull request cannot be merged",
          })}
        />
      )}
    </>
  );
}
