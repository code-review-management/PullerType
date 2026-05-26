import { Review, User } from "@/types/github.types";
import ReviewApprove from "@/public/icons/userList/review_approve.svg";
import ReviewRequestChanges from "@/public/icons/userList/review_request_changes.svg";
import ReviewComment from "@/public/icons/userList/review_comment.svg";
import ReviewWaiting from "@/public/icons/userList/review_waiting.svg";

// Combines states from review state with "REQUESTED" and "ASSIGNED"
type listedUserState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "DISMISSED"
  | "REQUESTED"
  | "ASSIGNED";

export type listedUser = {
  state: listedUserState;
  user: User;
};

/**
 * Sorts list of `listedUser`s, first prioritizing users with REQUESTED status
 * and then sorting by username.
 *
 * @param userList Array of `listedUser` objects
 * @returns Sorted array of `listedUser` objects
 */
export function sortUserList(userList: listedUser[]) {
  return userList.sort((userA, userB) => {
    // Prioritize REQUESTED state objects
    if (userA.state === "REQUESTED" && userB.state !== "REQUESTED") return -1;
    if (userB.state === "REQUESTED" && userA.state !== "REQUESTED") return 1;

    // Alphabetical sort
    return userA.user.login.localeCompare(userB.user.login);
  });
}

/**
 * Given a list of requested reviewers and reviews left of the PR,
 * aggregated into a single list of sorted `listedReviewer` objects
 *
 * @param requested_reviewers List of requested users (`User` objects returned by API)
 * @param reviews List of reviews (`Review` objects returned by API)
 * @returns Array of `listedReviewer` objects with assigned state, sorted
 */
export function buildReviewerList(
  requested_reviewers: User[],
  reviews: Review[],
): listedUser[] {
  const reviewerIdMapping = new Map<number, listedUser>();

  reviews.forEach((review) => {
    if (!review.user) return;
    reviewerIdMapping.set(review.user.id, {
      state: review.state as listedUserState,
      user: review.user,
    });
  });

  requested_reviewers.forEach((reviewer) => {
    if (!reviewer) return;
    reviewerIdMapping.set(reviewer.id, { state: "REQUESTED", user: reviewer });
  });

  return sortUserList(Array.from(reviewerIdMapping.values()));
}

/**
 * Given a list of users, give them the ASSIGNED state as `listedUser` and sort them.
 *
 * @param assignees Array of `User` objects
 * @returns Array of `listedUser` objects
 */
export function buildAssigneeList(assignees: User[]): listedUser[] {
  return sortUserList(
    assignees.flatMap((assignee) => ({
      state: "ASSIGNED",
      user: assignee,
    })),
  );
}

/**
 * Given a `listedUser` object, return appropriate icon tooltip text.
 *
 * @param user `listedUser`
 * @returns Tooltip text
 */
function getUserIconTooltipText(user: listedUser) {
  const state = user.state;
  const username = user.user.login;
  return (() => {
    switch (state) {
      case "APPROVED":
        return `${username} approved these changes`;
      case "CHANGES_REQUESTED":
        return `${username} requested changes`;
      case "COMMENTED":
        return `${username} left review comments`;
      case "DISMISSED":
        return `${username} previously left a review`;
      case "REQUESTED":
        return `Awaiting requested review from ${username}`;
      default:
        return "";
    }
  })();
}

type listedUserStateIcon = { src: string; size: number; tooltip?: string };

// Map `listedUserState` to an icon and icon size
const LISTED_USER_STATE_ICONS: Record<
  listedUserState,
  listedUserStateIcon | null
> = {
  APPROVED: { src: ReviewApprove, size: 18 },
  CHANGES_REQUESTED: { src: ReviewRequestChanges, size: 18 },
  COMMENTED: { src: ReviewComment, size: 18 },
  DISMISSED: { src: ReviewComment, size: 18 },
  REQUESTED: { src: ReviewWaiting, size: 8 },
  ASSIGNED: null,
};

/**
 * Given a `listedUser` object, return image props including
 * src, size, and tooltip text.
 *
 * @param user `listedUser` object
 * @returns `listedUserStateIcon` to use as props for image
 */
export function getListedUserIcon(user: listedUser) {
  const tooltip = getUserIconTooltipText(user);
  return { ...LISTED_USER_STATE_ICONS[user.state], tooltip };
}
