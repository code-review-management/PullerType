import { TimelineEvent } from "@/types/github.types";
import {
  getActor1,
  getActor2,
  getEventKey,
  getTimelineEvent,
  isReviewState,
  processTimeline,
} from "../timeline-utils";
import { createExampleUser } from "@/mocks/tests/users";
import {
  createAssignedEvent,
  createClosedEvent,
  createCommittedEvent,
  createReviewRequestedEvent,
  createReviewedEvent,
} from "@/mocks/tests/timeline-events";

describe("isReviewState", () => {
  it("returns true for supported review states", () => {
    expect(isReviewState("approved")).toBe(true);
    expect(isReviewState("commented_review")).toBe(true);
    expect(isReviewState("changes_requested")).toBe(true);
    expect(isReviewState("dismissed")).toBe(true);
  });

  it("returns false for non-review states", () => {
    expect(isReviewState("reviewed")).toBe(false);
    expect(isReviewState("assigned")).toBe(false);
    expect(isReviewState("")).toBe(false);
  });
});

describe("getActor1", () => {
  const actor = createExampleUser("actor", 1);
  const reviewer = createExampleUser("reviewer", 2);
  const requester = createExampleUser("requester", 3);

  it("returns null for a null event", () => {
    expect(getActor1(null)).toBeNull();
  });

  it("returns the review requester login for review_requested events", () => {
    const event = createReviewRequestedEvent({
      id: 1,
      actor,
      reviewRequester: requester,
      requestedReviewer: reviewer,
    });
    expect(getActor1(event)).toBe(requester.login);
  });

  it("falls back to actor login when review_requester is missing", () => {
    const event = {
      ...createReviewRequestedEvent({
        id: 1,
        actor,
        reviewRequester: requester,
        requestedReviewer: reviewer,
      }),
      review_requester: undefined,
    } as unknown as TimelineEvent;
    expect(getActor1(event)).toBe(actor.login);
  });

  it("returns null when review_requester and actor are both missing", () => {
    const event = {
      ...createReviewRequestedEvent({
        id: 1,
        actor,
        reviewRequester: requester,
        requestedReviewer: reviewer,
      }),
      review_requester: undefined,
      actor: undefined,
    } as unknown as TimelineEvent;
    expect(getActor1(event)).toBeNull();
  });

  it("returns the actor login for events with an actor field", () => {
    expect(getActor1(createClosedEvent({ id: 2, actor }))).toBe(actor.login);
    expect(
      getActor1(
        createAssignedEvent({
          id: 3,
          actor,
          assignee: reviewer,
        }),
      ),
    ).toBe(actor.login);
  });

  it("returns the user login for reviewed events", () => {
    expect(
      getActor1(
        createReviewedEvent({
          id: 4,
          user: reviewer,
          state: "APPROVED",
        }),
      ),
    ).toBe(reviewer.login);
  });

  it("returns null for committed events", () => {
    expect(
      getActor1(
        createCommittedEvent({
          sha: "abc123",
          authorName: "Author",
        }),
      ),
    ).toBeNull();
  });
});

describe("getActor2", () => {
  const actor = createExampleUser("actor", 1);
  const reviewer = createExampleUser("reviewer", 2);
  const assignee = createExampleUser("assignee", 3);

  it("returns null for a null event", () => {
    expect(getActor2(null)).toBeNull();
  });

  it("returns the requested reviewer login for review_requested events", () => {
    const event = createReviewRequestedEvent({
      id: 1,
      actor,
      reviewRequester: actor,
      requestedReviewer: reviewer,
    });
    expect(getActor2(event)).toBe(reviewer.login);
  });

  it("returns the assignee login for assigned events", () => {
    const event = createAssignedEvent({
      id: 2,
      actor,
      assignee,
    });
    expect(getActor2(event)).toBe(assignee.login);
  });

  it("returns null for events without a second actor", () => {
    expect(getActor2(createClosedEvent({ id: 3, actor }))).toBeNull();
    expect(
      getActor2(
        createReviewedEvent({
          id: 4,
          user: reviewer,
          state: "APPROVED",
        }),
      ),
    ).toBeNull();
    expect(
      getActor2(
        createCommittedEvent({
          sha: "abc123",
          authorName: "Author",
        }),
      ),
    ).toBeNull();
  });
});

describe("getEventKey", () => {
  const actor = createExampleUser("actor", 1);

  it("returns null for a null event", () => {
    expect(getEventKey(null)).toBeNull();
  });

  it("returns event-id for events with an id field", () => {
    expect(getEventKey(createClosedEvent({ id: 10, actor }))).toBe("closed-10");
    expect(
      getEventKey(
        createAssignedEvent({
          id: 11,
          actor,
          assignee: createExampleUser("assignee", 2),
        }),
      ),
    ).toBe("assigned-11");
  });

  it("returns event-sha for committed events", () => {
    expect(
      getEventKey(
        createCommittedEvent({
          sha: "deadbeef",
          authorName: "",
        }),
      ),
    ).toBe("committed-deadbeef");
  });
});

describe("getTimelineEvent", () => {
  const actor = createExampleUser("actor", 1);
  const reviewer = createExampleUser("reviewer", 2);
  const assignee = createExampleUser("assignee", 3);

  it("returns a hidden error event for null input", () => {
    expect(getTimelineEvent(null, 0)).toEqual({
      eventObj: null,
      eventKey: "",
      iconName: "",
      message: "",
      displayType: "hidden",
      eventType: "err",
      actor1: null,
      actor2: null,
    });
  });

  it("maps reviewed events to commented_review when state is commented", () => {
    const event = createReviewedEvent({
      id: 1,
      user: reviewer,
      state: "COMMENTED",
    });
    expect(getTimelineEvent(event, 0)).toMatchObject({
      eventType: "commented_review",
      displayType: "single_link",
      iconName: "eye",
      message: "left a review",
      actor1: reviewer.login,
      actor2: null,
      eventKey: "reviewed-1",
    });
  });

  it("maps reviewed events to their review state otherwise", () => {
    const event = createReviewedEvent({
      id: 2,
      user: reviewer,
      state: "APPROVED",
    });
    expect(getTimelineEvent(event, 0)).toMatchObject({
      eventType: "approved",
      displayType: "single_link",
      iconName: "approved",
      message: "approved these changes",
      eventKey: "reviewed-2",
    });
  });

  it("maps double-link and other display types from raw event type", () => {
    expect(
      getTimelineEvent(
        createAssignedEvent({
          id: 3,
          actor,
          assignee,
        }),
        0,
      ),
    ).toMatchObject({
      eventType: "assigned",
      displayType: "double_link",
      iconName: "user",
      message: "assigned this to",
      actor1: actor.login,
      actor2: assignee.login,
      eventKey: "assigned-3",
    });

    expect(
      getTimelineEvent(createClosedEvent({ id: 4, actor }), 0),
    ).toMatchObject({
      eventType: "closed",
      displayType: "other",
      iconName: "",
      message: "",
      actor1: actor.login,
      actor2: null,
      eventKey: "closed-4",
    });

    expect(
      getTimelineEvent(
        createCommittedEvent({
          sha: "abc123",
          authorName: "Author",
        }),
        0,
      ),
    ).toMatchObject({
      eventType: "committed",
      displayType: "other",
      iconName: "commit",
      message: "",
      actor1: null,
      actor2: null,
      eventKey: "committed-abc123",
    });
  });

  it("falls back to the index string when no event key can be generated", () => {
    const eventWithoutKey = {
      event: "unknown_event",
    } as unknown as TimelineEvent;
    expect(getTimelineEvent(eventWithoutKey, 7).eventKey).toBe("7");
  });
});

describe("processTimeline", () => {
  const reviewer = createExampleUser("reviewer", 1);
  const requester = createExampleUser("requester", 2);
  const assignee = createExampleUser("assignee", 3);
  const closer = createExampleUser("closer", 4);

  it("returns empty arrays for an empty timeline", () => {
    expect(processTimeline([])).toEqual({
      beforeCloseTimeline: [],
      afterCloseTimeline: [],
    });
  });

  it("maps events with expected display metadata and actors", () => {
    const timeline: TimelineEvent[] = [
      createReviewRequestedEvent({
        id: 11,
        actor: requester,
        reviewRequester: requester,
        requestedReviewer: reviewer,
      }),
      createReviewedEvent({
        id: 12,
        user: reviewer,
        state: "COMMENTED",
      }),
      createAssignedEvent({
        id: 13,
        actor: requester,
        assignee,
      }),
      createCommittedEvent({
        sha: "abc123",
        authorName: "Author Name",
      }),
      null,
    ];

    const { beforeCloseTimeline, afterCloseTimeline } =
      processTimeline(timeline);
    expect(afterCloseTimeline).toEqual([]);
    expect(beforeCloseTimeline).toHaveLength(5);

    expect(beforeCloseTimeline[0]).toMatchObject({
      eventType: "err",
      displayType: "hidden",
      iconName: "",
      message: "",
      actor1: null,
      actor2: null,
      eventKey: "",
    });

    expect(beforeCloseTimeline[1]).toMatchObject({
      eventType: "committed",
      displayType: "other",
      iconName: "commit",
      message: "",
      actor1: null,
      actor2: null,
      eventKey: "committed-abc123",
    });

    expect(beforeCloseTimeline[2]).toMatchObject({
      eventType: "assigned",
      displayType: "double_link",
      iconName: "user",
      message: "assigned this to",
      actor1: requester.login,
      actor2: assignee.login,
      eventKey: "assigned-13",
    });

    expect(beforeCloseTimeline[3]).toMatchObject({
      eventType: "commented_review",
      displayType: "single_link",
      iconName: "eye",
      message: "left a review",
      actor1: reviewer.login,
      actor2: null,
      eventKey: "reviewed-12",
    });

    expect(beforeCloseTimeline[4]).toMatchObject({
      eventType: "review_requested",
      displayType: "double_link",
      iconName: "eye",
      message: "requested a review from",
      actor1: requester.login,
      actor2: reviewer.login,
      eventKey: "review_requested-11",
    });
  });

  it("splits events around the first closed event in processed order", () => {
    const timeline: TimelineEvent[] = [
      createReviewRequestedEvent({
        id: 20,
        actor: requester,
        reviewRequester: requester,
        requestedReviewer: reviewer,
      }),
      createClosedEvent({ id: 21, actor: closer }),
      createAssignedEvent({
        id: 22,
        actor: requester,
        assignee,
      }),
      createReviewedEvent({
        id: 23,
        user: reviewer,
        state: "APPROVED",
      }),
    ];

    const { beforeCloseTimeline, afterCloseTimeline } =
      processTimeline(timeline);

    expect(afterCloseTimeline.map((event) => event.eventKey)).toEqual([
      "reviewed-23",
      "assigned-22",
    ]);
    expect(beforeCloseTimeline.map((event) => event.eventKey)).toEqual([
      "closed-21",
      "review_requested-20",
    ]);
  });
});
