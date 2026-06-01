import { TimelineEvent } from "@/types/github.types";

/**
 * Possible string values for "event" field of objects returned in timeline event API response.
 * This union includes all event types that are currently supported by the frontend.
 * TODO: Add more supported event types
 */
export type EventType =
  | "approved"
  | "assigned"
  | "changes_requested"
  | "commented"
  | "commented_review"
  | "committed"
  | "closed"
  | "dismissed"
  | "head_ref_deleted"
  | "merged"
  | "ready_for_review"
  | "renamed"
  | "review_dismissed"
  | "review_requested"
  | "reviewed"
  | "err";

/**
 * Possible states a "review" type event can have
 * Used to check if an event is a review when rendering it in TimelineEvent component.
 */
const REVIEW_STATES = [
  "approved",
  "commented_review",
  "changes_requested",
  "dismissed",
];

export function isReviewState(state: string) {
  return REVIEW_STATES.includes(state);
}

// Events that follow the single link structure "[actor1] {message}".
const SINGLE_EVENTS = [
  "approved",
  "changes_requested",
  "commented_review",
  "dismissed",
  "head_ref_deleted",
  "merged",
  "ready_for_review",
  "renamed",
  "review_dismissed",
  "reviewed",
];

/**
 * Events that follow the double link structure "[actor1] {message} [actor2]" when rendered
 * For example: "octocat requested a review from octodog"
 */
const DOUBLE_EVENTS = ["assigned", "review_requested"];

// Events that do not follow common "single link" or "double link" structures when rendered
const OTHER_EVENTS = ["committed", "closed", "commented", ...REVIEW_STATES];

/**
 * Raw events returned from API response will be parsed into timelineEvents
 * timelineEvents are then rendered in the timeline display
 */
export interface processedTimelineEvent {
  eventObj: TimelineEvent;
  eventKey: string;
  iconName: string;
  message: string;
  displayType: "single_link" | "double_link" | "other" | "hidden";
  eventType: EventType;
  actor1: string | null;
  actor2: string | null;
}

/**
 * Map event types to icons
 */
const ICONS: Record<EventType, string> = {
  approved: "approved",
  assigned: "user",
  changes_requested: "changes_requested",
  commented: "",
  commented_review: "eye",
  committed: "commit",
  closed: "",
  dismissed: "eye",
  err: "",
  head_ref_deleted: "branch",
  merged: "merge",
  ready_for_review: "eye",
  renamed: "pencil",
  review_dismissed: "x",
  review_requested: "eye",
  reviewed: "eye",
};

/**
 * Map event types to message texts
 */
const MESSAGES: Record<EventType, string> = {
  approved: "approved these changes",
  assigned: "assigned this to",
  changes_requested: "requested changes",
  closed: "",
  commented: "",
  commented_review: "left a review",
  committed: "",
  dismissed: "previously reviewed",
  err: "Error! Could not fetch event message",
  head_ref_deleted: "deleted the branch",
  merged: "merged this pull request",
  ready_for_review: "marked this pull request as ready for review",
  renamed: "renamed the pull request to",
  review_dismissed: "dismissed a review",
  review_requested: "requested a review from",
  reviewed: "reviewed",
};

/**
 *
 * @param eventObj TimelineEvent object
 * @returns The username of "actor1" for this event, or null.
 */
export function getActor1(eventObj: TimelineEvent) {
  if (eventObj === null) {
    return null;
  }
  if (eventObj.event === "review_requested") {
    return eventObj.review_requester?.login || eventObj.actor?.login || null;
  }
  if ("actor" in eventObj) {
    return eventObj.actor.login;
  }
  if ("user" in eventObj) {
    return eventObj.user.login;
  }
  return null;
}

/**
 *
 * @param eventObj TimelineEvent object
 * @returns The username of "actor2" for this event, or null.
 */
export function getActor2(eventObj: TimelineEvent) {
  if (eventObj === null) {
    return null;
  }
  if (eventObj.event === "review_requested") {
    return eventObj.requested_reviewer?.login;
  }
  if (eventObj.event === "assigned") {
    return eventObj.assignee?.login;
  }
  return null;
}

/**
 * Generate the string that is appended to the key of a TimelineEvent rendered with .map()
 * @param eventObj TimelineEvent object
 * @param idx The index of the event in the current render-list
 * @returns
 */
export function getEventKey(eventObj: TimelineEvent) {
  if (eventObj === null) {
    return null;
  }
  if ("id" in eventObj) {
    return `${eventObj.event}-${eventObj.id}`;
  }
  if ("sha" in eventObj) {
    return `${eventObj.event}-${eventObj.sha}`;
  }
  return null;
}

/**
 * Parse TimelineEvent objects into processedTimelineEvent objects.
 * @param eventObj TimelineEvent object
 * @param idx Index of the event in the timeline
 * @returns A single timelineEvent object.
 */
export function getTimelineEvent(
  eventObj: TimelineEvent,
  idx: number,
): processedTimelineEvent {
  if (eventObj === null) {
    return {
      eventObj,
      eventKey: "", // No key needed, this event will not be rendered
      iconName: "",
      message: "",
      displayType: "hidden",
      eventType: "err",
      actor1: null,
      actor2: null,
    };
  }

  const eventType = (() => {
    if (eventObj.event === "reviewed") {
      if (eventObj.state?.toLowerCase() === "commented")
        return "commented_review";
      return eventObj.state?.toLowerCase();
    }
    return eventObj.event;
  })() as EventType;

  const displayType = (() => {
    if (OTHER_EVENTS.includes(eventObj.event)) {
      return "other";
    }
    if (DOUBLE_EVENTS.includes(eventObj.event)) {
      return "double_link";
    }
    if (SINGLE_EVENTS.includes(eventObj.event)) {
      return "single_link";
    }
    return "hidden";
  })();

  // TODO: Get correct approval status even when review is stale/dismissed

  const iconName = ICONS[eventType as EventType];
  const message = MESSAGES[eventType as EventType];

  const actor1 = getActor1(eventObj);
  const actor2 = getActor2(eventObj);
  const eventKey = getEventKey(eventObj) || idx.toString();

  return {
    eventObj,
    eventKey,
    iconName,
    message,
    displayType,
    eventType,
    actor1,
    actor2,
  };
}

/**
 * Given interfaced raw timeline API, return two arrays of processed processedTimelineEvent objects.
 * @param timeline Raw timeline API data
 * @returns {beforeCloseTimeline, afterCloseTimeline}
 *    beforeCloseTimeline: All events before the pull request was closed, if it was closed. Otherwise contains all events.
 *    afterCloseTimeline: All events including and after the pull request was closed, if it was closed. Otherwise is empty.
 */
export function processTimeline(timeline: TimelineEvent[]): {
  beforeCloseTimeline: processedTimelineEvent[];
  afterCloseTimeline: processedTimelineEvent[];
} {
  const processedTimeline = timeline
    .toReversed()
    .map((eventObj, idx) => getTimelineEvent(eventObj, idx));
  const closedIdx = processedTimeline.findIndex(
    (event) => event.eventObj && event.eventObj.event === "closed",
  );
  if (closedIdx !== -1) {
    return {
      beforeCloseTimeline: processedTimeline.slice(closedIdx, timeline.length),
      afterCloseTimeline: processedTimeline.slice(0, closedIdx),
    };
  } else {
    return { beforeCloseTimeline: processedTimeline, afterCloseTimeline: [] };
  }
}
