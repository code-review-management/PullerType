import { TimelineEvent, User } from "@/types/github.types";

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
}): TimelineEvent {
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
}): TimelineEvent {
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
}): TimelineEvent {
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
}): TimelineEvent {
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

export function createClosedEvent({ id, actor }: { id: number; actor: User }): TimelineEvent {
    return {
        id,
        url: "",
        actor,
        event: "closed",
        created_at: "",
        state_reason: null,
    };
}