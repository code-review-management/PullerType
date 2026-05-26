import Divider from "@/app/(pages)/_components/Divider/Divider";
import styles from "./TimelineDisplay.module.css";
import { ReactNode, useState } from "react";
import { useParams } from "next/navigation";
import {
  EventType,
  processedTimelineEvent,
  processTimeline,
  isReviewState,
} from "../../_utils/timeline-utils";
import Image from "next/image";
import Link from "next/link";
import PRViewComment from "../PRViewComment/PRViewComment";
import { useTimelineQuery } from "@/lib/api/queries/useTimelineQuery";
import { PullParams } from "@/types/routing.types";
import { ReviewComment } from "@/types/github.types";
import { useOverflows } from "../../changes/_hooks/useOverflows";
import { useAutoFetchAllPages } from "@/lib/api/hooks/useAutoFetchAllPages";

/**
 * Renders the timeline of events.
 */
export default function TimelineDisplay({
  username,
  repoName,
  id,
}: {
  username: string;
  repoName: string;
  id: string;
}) {
  const { data, fetchNextPage, hasNextPage, isFetching, isPending, isError } =
    useTimelineQuery(username, repoName, id);
  useAutoFetchAllPages(hasNextPage, isFetching, fetchNextPage);

  // TODO: Replace with proper loading/error UI.
  if (isPending) return <div>Loading timeline...</div>;
  if (isError) return <div>Failed to load timeline.</div>;

  const { beforeCloseTimeline, afterCloseTimeline } = processTimeline(data);

  return (
    <div className={styles.timeline}>
      {afterCloseTimeline.map((event: processedTimelineEvent) => {
        if (event.displayType !== "hidden") {
          return (
            <TimelineEventDisplay
              key={`after-close-timeline-${event.eventKey}`}
              event={event}
            />
          );
        }
        return;
      })}
      <div className={styles.beforeCloseTimeline}>
        {beforeCloseTimeline.map((event: processedTimelineEvent) => {
          if (event.displayType !== "hidden") {
            return (
              <TimelineEventDisplay
                key={`before-close-timeline-${event.eventKey}`}
                event={event}
              />
            );
          }
          return;
        })}
        <div className={styles.timelineLineBackground} />
      </div>
    </div>
  );
}

/**
 * Renders an event in the timeline. Content and styling is dynamic based on event type.
 * TODO: Get info not provided by timeline endpoint (commit pfps, branch name)
 * TODO: Use branch name and get commit SHA correctly for merge and delete events
 * @param event Object representing the event from the timeline.
 */
function TimelineEventDisplay({ event }: { event: processedTimelineEvent }) {
  if (event.displayType === "hidden") {
    console.log(`"${event.eventType}" hidden`); // TODO: REMOVE THIS DEBUG PRINT
    return;
  }
  if (event.displayType === "other") {
    if (event.eventType === "committed") {
      return event.eventObj ? <TimelineCommit event={event} /> : <div />;
    } else if (event.eventType === "closed") {
      return <Divider />;
      {
        /** TODO: make custom divider */
      }
    } else if (event.eventType === "commented") {
      if (!event.eventObj) return;
      return (
        <PRViewComment
          username={event.actor1 || ""}
          createdAt={
            "created_at" in event.eventObj ? event.eventObj.created_at : ""
          }
          description={
            "body" in event.eventObj ? event.eventObj.body || "" : ""
          }
          avatarUrl={
            "user" in event.eventObj
              ? event.eventObj.user.avatar_url
              : undefined
          }
          inTimeline
        />
      );
    } else {
      console.log(`"${event.eventType}" as 'other' display type not supported`); // TODO: REMOVE THIS DEBUG PRINT
      return;
    }
  }
  if (isReviewState(event.eventType)) {
    return <TimelineReview event={event} />;
  }
  if (event.displayType === "single_link") {
    return (
      <TimelineEventSmall eventType={event.eventType} iconName={event.iconName}>
        <p>
          <UserLink username={event.actor1 || ""} /> {event.message}
        </p>
      </TimelineEventSmall>
    );
  }
  if (event.displayType === "double_link") {
    return (
      <TimelineEventSmall eventType={event.eventType} iconName={event.iconName}>
        <p>
          <UserLink username={event.actor1 || ""} /> {event.message}{" "}
          <UserLink username={event.actor2 || ""} />
        </p>
      </TimelineEventSmall>
    );
  } else {
    console.log(`"${event.eventType}" not supported`); // TODO: REMOVE THIS DEBUG PRINT
    return;
  }
}

function ExpandableCommitText({
  full_sha,
  abbr_sha,
  message,
}: {
  full_sha: string;
  abbr_sha: string;
  message: string;
}) {
  const { username, repo_name, id } = useParams<PullParams>();
  const isOverflow = useOverflows(abbr_sha);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.expandableCommitText}>
      <Link
        className={styles.commitSha}
        href={`/${username}/${repo_name}/pull/${id}/changes?sha=${full_sha}`}
      >
        #{abbr_sha}
      </Link>{" "}
      <p
        className={styles.commitMessage}
        id={`commit-${abbr_sha}-message`}
        style={{
          ...(!isExpanded
            ? {
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }
            : {}),
        }}
      >
        {message}
      </p>
      {isOverflow && (
        <button
          className={styles.expandButton}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <Image
            src="/icons/action_dots.svg"
            alt="Expand"
            width={20}
            height={10}
          />
        </button>
      )}
    </div>
  );
}

/**
 * Commit event component displayed in timeline.
 * Displays abbreviated SHA, commit message, and user icon.
 * TODO: Get username from somewhere to be able to get user icon src.
 * TODO: Collapse long commit messages by default and implement interactive expand.
 *
 * @param event: Object representing the event that is the commit.
 */
function TimelineCommit({ event }: { event: processedTimelineEvent }) {
  if (!event.eventObj) {
    return;
  }

  const full_sha = "sha" in event.eventObj ? event.eventObj.sha : "";
  const abbr_sha = full_sha.slice(0, 7);
  const message = "message" in event.eventObj ? event.eventObj.message : "";

  return (
    <TimelineEventSmall eventType={event.eventType} iconName={event.iconName}>
      <ExpandableCommitText
        full_sha={full_sha}
        abbr_sha={abbr_sha}
        message={message}
      />
    </TimelineEventSmall>
  );
}

/**
 * Renders a review event on the timeline.
 * Note there are two types of reviews that can be rendered on the timeline: review with comment (body)
 *      and review without comment (body).
 * @param event: Object representing the event that is the review.
 */
function TimelineReview({ event }: { event: processedTimelineEvent }) {
  if (!event.eventObj) {
    return;
  }

  // Review with `comments` array
  if (
    "comments" in event.eventObj &&
    event.eventObj.comments &&
    event.eventObj.comments.length > 0
  ) {
    return event.eventObj.comments.map((comment: ReviewComment) => (
      <PRViewComment
        key={`timeline-review-${event.eventKey}-${comment.id}`}
        username={comment.user?.login || ""}
        createdAt={comment.created_at || ""}
        description={comment.body || ""}
        avatarUrl={comment.user?.avatar_url}
        inTimeline
      />
    ));
  }

  // Review without comments array or comment body
  if ("body" in event.eventObj && event.eventObj.body === null) {
    return (
      <TimelineEventSmall eventType={event.eventType} iconName={event.iconName}>
        <p>
          <UserLink username={event.eventObj.user?.login || ""} />{" "}
          {event.message}
        </p>
      </TimelineEventSmall>
    );
  }

  // Review with comment (body)
  else {
    return <TimelineReviewWithComment event={event} />;
  }
}

/**
 * Renders a review event that has a comment (body).
 * Uses the same comment comopnent as the pull body description (`PullBodyDescription`).
 * @param event: Object representing the event that is the review.
 */
function TimelineReviewWithComment({
  event,
}: {
  event: processedTimelineEvent;
}) {
  if (!event.eventObj || !("state" in event.eventObj)) {
    return;
  }

  return (
    <>
      <TimelineEventSmall
        eventType={event.eventType}
        iconName={event.iconName}
        useLargeIcon={
          event.eventObj.state === "approved" ||
          event.eventObj.state === "changes_requested"
        }
      >
        <p>
          <UserLink username={event.actor1 || ""} /> {event.message}
        </p>
      </TimelineEventSmall>
      <PRViewComment
        username={event.actor1 || ""}
        createdAt={
          "submitted_at" in event.eventObj ? event.eventObj.submitted_at : ""
        }
        description={"body" in event.eventObj ? event.eventObj.body || "" : ""}
        avatarUrl={
          "user" in event.eventObj ? event.eventObj.user.avatar_url : undefined
        }
        inTimeline
      />
    </>
  );
}

/**
 * A one-line event on the timeline including a small icon placed on the timeline "line"
 * and custom content to the right of it.
 *
 * @param event_type: Type of the event
 * @param children: Inner React node
 * @param icon_name: Name of the icon, used to form the Image src displayed
 */
function TimelineEventSmall({
  eventType,
  children,
  iconName,
  useLargeIcon = false,
}: {
  eventType: EventType;
  children: ReactNode;
  iconName: string;
  useLargeIcon?: boolean;
}) {
  const largeIconEventTypes = ["approved", "changes_requested"];
  const isLargeIcon = largeIconEventTypes.includes(eventType);
  const iconSize = isLargeIcon ? 30 : 20;

  return (
    <div className={styles.eventSmall}>
      <div
        className={`${styles.timelineIcon} ${!useLargeIcon && styles.timelineIconPadded}`}
      >
        <Image
          src={`/icons/timeline/${iconName}.svg`}
          alt={`${iconName}`}
          height={iconSize}
          width={iconSize}
        />
      </div>
      {children}
    </div>
  );
}

/**
 * Creates a link element that displays a GitHub username and links to that GitHub profile.
 * Styled for PR view timeline usage.
 * @param username: GitHub username of the user this links to.
 */
function UserLink({ username }: { username: string }) {
  return (
    <a href={`https://github.com/${username}`} className={styles.userLink}>
      {username}
    </a>
  );
}
