import {
  AssignIssueEvent,
  CommentEvent,
  CommittedEvent,
  ReviewComment,
  ReviewedEvent,
  ReviewRequestEvent,
  TimelineEvent,
  User,
} from "@/types/github.types";
import { getExampleInlineCommentWithUser } from "./comments";
import { processedTimelineEvent } from "@/app/(pages)/(protected)/[username]/[repo_name]/pull/[id]/_utils/timeline-utils";

export function createReviewRequestedEvent({
  id,
  actor,
  reviewRequester,
  requestedReviewer,
}: {
  id: number;
  actor: User;
  reviewRequester: User;
  requestedReviewer: User;
}): ReviewRequestEvent {
  return {
    id,
    url: "",
    actor,
    event: "review_requested",
    created_at: "",
    review_requester: reviewRequester,
    requested_reviewer: requestedReviewer,
  };
}

export function createAssignedEvent({
  id,
  actor,
  assignee,
}: {
  id: number;
  actor: User;
  assignee: User;
}): AssignIssueEvent {
  return {
    id,
    url: "",
    actor,
    event: "assigned",
    created_at: "",
    assignee,
  };
}

export function createReviewedEvent({
  id,
  user,
  state,
}: {
  id: number;
  user: User;
  state: string;
}): ReviewedEvent {
  return {
    id,
    event: "reviewed",
    user,
    body: null,
    state,
    submitted_at: "",
    updated_at: "",
    author_association: "CONTRIBUTOR",
  };
}

export function createCommittedEvent({
  sha,
  authorName,
}: {
  sha: string;
  authorName: string;
}): CommittedEvent {
  return {
    event: "committed",
    sha,
    url: "",
    author: {
      date: "",
      email: "",
      name: authorName,
    },
    committer: {
      date: "",
      email: "",
      name: "Committer",
    },
    message: "test commit",
  };
}

export function createClosedEvent({
  id,
  actor,
}: {
  id: number;
  actor: User;
}): TimelineEvent {
  return {
    id,
    url: "",
    actor,
    event: "closed",
    created_at: "",
    state_reason: null,
  };
}

export function createCommentedEvent({
  id,
  actor,
  body,
  createdAt,
}: {
  id: number;
  actor: User;
  body: string;
  createdAt: string;
}): CommentEvent {
  return {
    id,
    url: "",
    actor,
    event: "commented",
    created_at: createdAt,
    updated_at: createdAt,
    body,
    user: actor,
    author_association: "CONTRIBUTOR",
    reactions: {
      total_count: 0,
      "+1": 0,
      "-1": 0,
      laugh: 0,
      hooray: 0,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
  };
}

export function createReviewEventWithComments(
  reviewer: User,
  comments: ReviewComment[],
): TimelineEvent {
  return {
    ...createReviewedEvent({
      id: 15,
      user: reviewer,
      state: "COMMENTED",
    }),
    comments: comments,
  };
}

export function createExampleReviewEventWithComments1(reviewer: User) {
  return createReviewEventWithComments(reviewer, [
    getExampleInlineCommentWithUser(reviewer),
  ]);
}

export function createReviewWithEmptyCreatedAtComment(
  reviewer: User,
): processedTimelineEvent {
  return {
    iconName: "",
    message: "",
    actor1: reviewer.login,
    actor2: null,
    displayType: "other",
    eventType: "commented_review",
    eventObj: {
      ...createReviewedEvent({
        id: 42,
        user: reviewer,
        state: "COMMENTED",
      }),
      comments: [
        { ...getExampleInlineCommentWithUser(reviewer), created_at: undefined },
      ],
    } as unknown as TimelineEvent,
    eventKey: "reviewed-42",
  };
}
