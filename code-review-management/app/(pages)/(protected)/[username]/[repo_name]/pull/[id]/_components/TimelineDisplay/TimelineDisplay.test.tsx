import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewComment, TimelineEvent } from "@/types/github.types";
import TimelineDisplay, {
  TimelineCommit,
  TimelineEventDisplay,
  TimelineReview,
} from "./TimelineDisplay";
import type { processedTimelineEvent } from "../../_utils/timeline-utils";
import { createExampleUser } from "@/mocks/tests/users";
import {
  createAssignedEvent,
  createClosedEvent,
  createCommentedEvent,
  createCommittedEvent,
  createExampleReviewEventWithComments1,
  createReviewRequestedEvent,
  createReviewWithEmptyCreatedAtComment,
  createReviewedEvent,
} from "@/mocks/tests/timeline-events";

const mockUseTimelineQuery = jest.fn();
const mockUseOverflows = jest.fn();
const mockProcessTimeline = jest.fn();

jest.mock("@/lib/api/queries/useTimelineQuery", () => ({
  useTimelineQuery: (...args: unknown[]) => mockUseTimelineQuery(...args),
}));

jest.mock("@/lib/api/hooks/useAutoFetchAllPages", () => ({
  useAutoFetchAllPages: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
}));

jest.mock("../../changes/_hooks/useOverflows", () => ({
  useOverflows: (...args: unknown[]) => mockUseOverflows(...args),
}));

jest.mock("../../_utils/timeline-utils", () => {
  const actual = jest.requireActual("../../_utils/timeline-utils");
  return {
    ...actual,
    processTimeline: (...args: unknown[]) => mockProcessTimeline(...args),
  };
});

jest.mock("@/app/(pages)/_components/Divider/Divider", () => ({
  __esModule: true,
  default: () => <div data-testid="divider" />,
}));

jest.mock("../PRViewComment/PRViewComment", () => ({
  __esModule: true,
  default: ({
    username,
    createdAt,
    description,
    avatarUrl,
    inTimeline,
  }: {
    username: string;
    createdAt: string;
    description: string;
    avatarUrl?: string;
    inTimeline?: boolean;
  }) => (
    <div
      data-testid="pr-view-comment"
      data-avatar-url={avatarUrl ?? ""}
      data-created-at={createdAt}
      data-description={description}
      data-in-timeline={inTimeline ? "true" : "false"}
      data-username={username}
    />
  ),
}));

const defaultProps = {
  username: "owner",
  repoName: "repo",
  id: "1",
};

function mockTimelineQuery({
  data = [],
  isPending = false,
  isError = false,
}: {
  data?: TimelineEvent[];
  isPending?: boolean;
  isError?: boolean;
}) {
  mockUseTimelineQuery.mockReturnValue({
    data,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetching: false,
    isPending,
    isError,
  });
}

function mockProcessedTimeline({
  beforeCloseTimeline = [],
  afterCloseTimeline = [],
}: {
  beforeCloseTimeline?: processedTimelineEvent[];
  afterCloseTimeline?: processedTimelineEvent[];
}) {
  mockProcessTimeline.mockReturnValue({
    beforeCloseTimeline,
    afterCloseTimeline,
  });
}

function createMergedEvent({
  id,
  actor,
}: {
  id: number;
  actor: ReturnType<typeof createExampleUser>;
}): TimelineEvent {
  return {
    id,
    url: "",
    actor,
    event: "merged",
    created_at: "",
    state_reason: null,
  };
}

describe("TimelineDisplay", () => {
  const actor = createExampleUser("actor", 1);
  const reviewer = createExampleUser("reviewer", 2);
  const assignee = createExampleUser("assignee", 3);

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimelineQuery({ data: [] });
    mockUseOverflows.mockReturnValue(false);
    mockProcessedTimeline({});
  });

  it("shows a loading message while the timeline query is pending", () => {
    mockTimelineQuery({ isPending: true });
    render(<TimelineDisplay {...defaultProps} />);
    expect(screen.getByText("Loading timeline...")).toBeInTheDocument();
  });

  it("shows an error message when the timeline query fails", () => {
    mockTimelineQuery({ isError: true });
    render(<TimelineDisplay {...defaultProps} />);
    expect(screen.getByText("Failed to load timeline.")).toBeInTheDocument();
  });

  it("calls useTimelineQuery with the provided route params", () => {
    render(<TimelineDisplay {...defaultProps} />);
    expect(mockUseTimelineQuery).toHaveBeenCalledWith("owner", "repo", "1");
  });

  it("passes query timeline data to processTimeline", () => {
    const timeline = [createClosedEvent({ id: 99, actor })];
    mockTimelineQuery({ data: timeline });

    render(<TimelineDisplay {...defaultProps} />);

    expect(mockProcessTimeline).toHaveBeenCalledWith(timeline);
  });

  it("renders double-link timeline events with both actor usernames", () => {
    const reviewRequested = createReviewRequestedEvent({
      id: 10,
      actor,
      reviewRequester: actor,
      requestedReviewer: reviewer,
    });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "double_link",
          eventType: "review_requested",
          eventObj: reviewRequested,
          iconName: "eye",
          message: "requested a review from",
          actor1: actor.login,
          actor2: reviewer.login,
          eventKey: "review_requested-10",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    expect(screen.getByText("requested a review from")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: actor.login })).toHaveAttribute(
      "href",
      `https://github.com/${actor.login}`,
    );
    expect(screen.getByRole("link", { name: reviewer.login })).toHaveAttribute(
      "href",
      `https://github.com/${reviewer.login}`,
    );
  });

  it("renders committed events with a link to the commit changes view", () => {
    const committed = createCommittedEvent({
      sha: "abcdef1234567890",
      authorName: "Author",
    });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "committed",
          eventObj: committed,
          iconName: "commit",
          message: "",
          eventKey: "committed-abcdef1234567890",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    const commitLink = screen.getByRole("link", { name: "#abcdef1" });
    expect(commitLink).toHaveAttribute(
      "href",
      "/owner/repo/pull/1/changes?sha=abcdef1234567890",
    );
    expect(screen.getByText("test commit")).toBeInTheDocument();
  });

  it("renders a divider for closed events", () => {
    const closed = createClosedEvent({ id: 11, actor });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "closed",
          eventObj: closed,
          iconName: "",
          message: "",
          actor1: actor.login,
          eventKey: "closed-11",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);
    expect(screen.getByTestId("divider")).toBeInTheDocument();
  });

  it("renders issue comments with PRViewComment", () => {
    const commented = createCommentedEvent({
      id: 12,
      actor,
      body: "Timeline issue comment",
      createdAt: "2026-01-02T00:00:00Z",
    });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "commented",
          eventObj: commented,
          iconName: "",
          message: "",
          actor1: actor.login,
          eventKey: "commented-12",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    const comment = screen.getByTestId("pr-view-comment");
    expect(comment).toHaveAttribute("data-username", actor.login);
    expect(comment).toHaveAttribute(
      "data-description",
      "Timeline issue comment",
    );
    expect(comment).toHaveAttribute("data-created-at", "2026-01-02T00:00:00Z");
    expect(comment).toHaveAttribute("data-in-timeline", "true");
  });

  it("renders reviews without a body as a single-line timeline event", () => {
    const reviewed = createReviewedEvent({
      id: 13,
      user: reviewer,
      state: "APPROVED",
    });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "single_link",
          eventType: "approved",
          eventObj: reviewed,
          iconName: "approved",
          message: "approved these changes",
          actor1: reviewer.login,
          eventKey: "reviewed-13",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    expect(screen.getByText("approved these changes")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: reviewer.login }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("pr-view-comment")).not.toBeInTheDocument();
  });

  it("renders reviews with a body using PRViewComment", () => {
    const reviewed = {
      ...createReviewedEvent({
        id: 14,
        user: reviewer,
        state: "COMMENTED",
      }),
      body: "Review summary comment",
      submitted_at: "2026-01-03T00:00:00Z",
    } as unknown as TimelineEvent;
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "single_link",
          eventType: "commented_review",
          eventObj: reviewed,
          iconName: "eye",
          message: "left a review",
          actor1: reviewer.login,
          eventKey: "reviewed-14",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    expect(screen.getByText("left a review")).toBeInTheDocument();
    const comment = screen.getByTestId("pr-view-comment");
    expect(comment).toHaveAttribute("data-username", reviewer.login);
    expect(comment).toHaveAttribute(
      "data-description",
      "Review summary comment",
    );
    expect(comment).toHaveAttribute("data-created-at", "2026-01-03T00:00:00Z");
  });

  it("renders reviews with inline review comments", () => {
    const reviewed = createExampleReviewEventWithComments1(reviewer);
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "single_link",
          eventType: "commented_review",
          eventObj: reviewed,
          iconName: "eye",
          message: "left a review",
          actor1: reviewer.login,
          eventKey: "reviewed-15",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    const comment = screen.getByTestId("pr-view-comment");
    expect(comment).toHaveAttribute(
      "data-description",
      "Inline review comment",
    );
    expect(comment).toHaveAttribute("data-created-at", "2026-01-04T00:00:00Z");
  });

  it("does not render hidden timeline events", () => {
    const assigned = createAssignedEvent({
      id: 16,
      actor,
      assignee,
    });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "hidden",
          eventType: "err",
          eventObj: null,
        } as processedTimelineEvent,
        {
          displayType: "double_link",
          eventType: "assigned",
          eventObj: assigned,
          iconName: "user",
          message: "assigned this to",
          actor1: actor.login,
          actor2: assignee.login,
          eventKey: "assigned-16",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    expect(screen.getByText("assigned this to")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: actor.login })).toHaveLength(1);
  });

  it("renders after-close events outside the before-close section", () => {
    const reviewRequested = createReviewRequestedEvent({
      id: 20,
      actor,
      reviewRequester: actor,
      requestedReviewer: reviewer,
    });
    const closed = createClosedEvent({ id: 21, actor });
    const assigned = createAssignedEvent({
      id: 22,
      actor,
      assignee,
    });
    mockProcessedTimeline({
      afterCloseTimeline: [
        {
          displayType: "double_link",
          eventType: "assigned",
          eventObj: assigned,
          iconName: "user",
          message: "assigned this to",
          actor1: actor.login,
          actor2: assignee.login,
          eventKey: "assigned-22",
        } as processedTimelineEvent,
      ],
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "closed",
          eventObj: closed,
          iconName: "",
          message: "",
          actor1: actor.login,
          eventKey: "closed-21",
        } as processedTimelineEvent,
        {
          displayType: "double_link",
          eventType: "review_requested",
          eventObj: reviewRequested,
          iconName: "eye",
          message: "requested a review from",
          actor1: actor.login,
          actor2: reviewer.login,
          eventKey: "review_requested-20",
        } as processedTimelineEvent,
      ],
    });

    const { container } = render(<TimelineDisplay {...defaultProps} />);

    const beforeCloseSection = container.getElementsByClassName(
      "beforeCloseTimeline",
    )[0] as HTMLElement;
    expect(beforeCloseSection).not.toBeNull();

    expect(
      within(beforeCloseSection).getByText("requested a review from"),
    ).toBeInTheDocument();
    expect(
      within(beforeCloseSection).getByTestId("divider"),
    ).toBeInTheDocument();

    expect(screen.getByText("assigned this to")).toBeInTheDocument();
    expect(
      within(beforeCloseSection).queryByText("assigned this to"),
    ).not.toBeInTheDocument();
  });

  it("skips hidden events in the after-close timeline section", () => {
    const assigned = createAssignedEvent({ id: 30, actor, assignee });
    const closed = createClosedEvent({ id: 31, actor });
    mockProcessedTimeline({
      afterCloseTimeline: [
        {
          displayType: "hidden",
          eventType: "err",
          eventObj: null,
        } as processedTimelineEvent,
      ],
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "closed",
          eventObj: closed,
          iconName: "",
          message: "",
          actor1: actor.login,
          eventKey: "closed-31",
        } as processedTimelineEvent,
        {
          displayType: "double_link",
          eventType: "assigned",
          eventObj: assigned,
          iconName: "user",
          message: "assigned this to",
          actor1: actor.login,
          actor2: assignee.login,
          eventKey: "assigned-30",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    expect(screen.getByText("assigned this to")).toBeInTheDocument();
    expect(screen.getByTestId("divider")).toBeInTheDocument();
  });

  it("skips hidden events in the before-close timeline section", () => {
    const reviewRequested = createReviewRequestedEvent({
      id: 33,
      actor,
      reviewRequester: actor,
      requestedReviewer: reviewer,
    });
    const closed = createClosedEvent({ id: 32, actor });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "closed",
          eventObj: closed,
          iconName: "",
          message: "",
          actor1: actor.login,
          eventKey: "closed-32",
        } as processedTimelineEvent,
        {
          displayType: "hidden",
          eventType: "err",
          eventObj: null,
        } as processedTimelineEvent,
        {
          displayType: "double_link",
          eventType: "review_requested",
          eventObj: reviewRequested,
          iconName: "eye",
          message: "requested a review from",
          actor1: actor.login,
          actor2: reviewer.login,
          eventKey: "review_requested-33",
        } as unknown as processedTimelineEvent,
      ],
    });

    const { container } = render(<TimelineDisplay {...defaultProps} />);
    const beforeCloseSection = container.getElementsByClassName(
      "beforeCloseTimeline",
    )[0] as HTMLElement;

    expect(
      within(beforeCloseSection).getByText("requested a review from"),
    ).toBeInTheDocument();
    expect(screen.queryByText("assigned this to")).not.toBeInTheDocument();
  });

  it("renders single-link timeline events such as merged", () => {
    const merged = createMergedEvent({ id: 34, actor });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "single_link",
          eventType: "merged",
          eventObj: merged,
          iconName: "merge",
          message: "merged this pull request",
          actor1: actor.login,
          eventKey: "merged-34",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    expect(screen.getByText("merged this pull request")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: actor.login })).toBeInTheDocument();
  });

  it("renders an empty div when a committed event has no event object", () => {
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "committed",
          eventObj: null,
          iconName: "commit",
        } as processedTimelineEvent,
      ],
    });

    const { container } = render(<TimelineDisplay {...defaultProps} />);
    expect(
      container.querySelector('[class*="eventSmall"]'),
    ).not.toBeInTheDocument();
    expect(container.querySelector("div:empty")).toBeTruthy();
  });

  it("renders an expand button when commit message overflows", async () => {
    mockUseOverflows.mockReturnValue(true);
    const committed = createCommittedEvent({
      sha: "1234567890abcdef",
      authorName: "Author",
    });
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "committed",
          eventObj: committed,
          iconName: "commit",
          message: "",
          eventKey: "committed-1234567890abcdef",
        } as processedTimelineEvent,
      ],
    });

    const user = userEvent.setup();
    render(<TimelineDisplay {...defaultProps} />);

    const expandButton = screen.getByRole("button", { name: "Expand" });
    expect(expandButton).toBeInTheDocument();

    const message = document.getElementById("commit-1234567-message");
    expect(message).toHaveStyle({
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });

    await user.click(expandButton);
    expect(message).not.toHaveStyle({ overflow: "hidden" });
  });

  it("renders reviews with approved state and a body using a large icon", () => {
    const reviewed = {
      ...createReviewedEvent({
        id: 35,
        user: reviewer,
        state: "approved",
      }),
      body: "LGTM!!! :D",
      submitted_at: "2026-01-06T00:00:00Z",
    } as unknown as TimelineEvent;
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "single_link",
          eventType: "approved",
          eventObj: reviewed,
          iconName: "approved",
          message: "approved these changes",
          actor1: reviewer.login,
          eventKey: "reviewed-35",
        } as processedTimelineEvent,
      ],
    });

    const { container } = render(<TimelineDisplay {...defaultProps} />);

    expect(screen.getByText("approved these changes")).toBeInTheDocument();
    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-description",
      "LGTM!!! :D",
    );
    const icon = container.querySelector('img[alt="approved"]');
    expect(icon).toHaveAttribute("height", "30");
    expect(icon).toHaveAttribute("width", "30");
  });

  it("renders issue comments with fallback values when fields are missing", () => {
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "commented",
          eventObj: {
            id: 39,
            url: "",
            actor,
            event: "commented",
            updated_at: "2026-01-09T00:00:00Z",
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
          } as unknown as TimelineEvent,
          actor1: actor.login,
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    const comment = screen.getByTestId("pr-view-comment");
    expect(comment).toHaveAttribute("data-created-at", "");
    expect(comment).toHaveAttribute("data-description", "");
    expect(comment).toHaveAttribute("data-avatar-url", "");
  });

  it("renders issue comments without a user avatar when user is absent", () => {
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "other",
          eventType: "commented",
          eventObj: {
            id: 36,
            url: "",
            actor,
            event: "commented",
            created_at: "2026-01-07T00:00:00Z",
            updated_at: "2026-01-07T00:00:00Z",
            body: null,
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
          } as unknown as TimelineEvent,
          actor1: actor.login,
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    const comment = screen.getByTestId("pr-view-comment");
    expect(comment).toHaveAttribute("data-description", "");
    expect(comment).toHaveAttribute("data-avatar-url", "");
  });

  it("renders inline review comments without a user login", () => {
    const reviewed = {
      ...createReviewedEvent({
        id: 37,
        user: reviewer,
        state: "COMMENTED",
      }),
      comments: [
        {
          pull_request_review_id: 1,
          id: 102,
          diff_hunk: "",
          path: "file.ts",
          commit_id: "abc",
          original_commit_id: "abc",
          user: null,
          body: "Comment without user",
          created_at: "2026-01-08T00:00:00Z",
          updated_at: "2026-01-08T00:00:00Z",
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
          side: "RIGHT",
          author_association: "CONTRIBUTOR",
        } as unknown as ReviewComment,
      ],
    } as unknown as TimelineEvent;
    mockProcessedTimeline({
      beforeCloseTimeline: [
        {
          displayType: "single_link",
          eventType: "commented_review",
          eventObj: reviewed,
          iconName: "eye",
          message: "left a review",
          actor1: reviewer.login,
          eventKey: "reviewed-37",
        } as processedTimelineEvent,
      ],
    });

    render(<TimelineDisplay {...defaultProps} />);

    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-username",
      "",
    );
  });
});

describe("TimelineEventDisplay", () => {
  const actor = createExampleUser("actor", 1);
  const reviewer = createExampleUser("reviewer", 2);
  const assignee = createExampleUser("assignee", 3);

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns nothing for hidden events", () => {
    const { container } = render(
      <TimelineEventDisplay
        event={
          {
            displayType: "hidden",
            eventType: "err",
          } as processedTimelineEvent
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(console.log).toHaveBeenCalledWith('"err" hidden');
  });

  it("returns nothing for unsupported other display types", () => {
    const { container } = render(
      <TimelineEventDisplay
        event={
          {
            displayType: "other",
            eventType: "err",
            eventObj: createClosedEvent({ id: 1, actor }),
          } as processedTimelineEvent
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(console.log).toHaveBeenCalledWith(
      "\"err\" as 'other' display type not supported",
    );
  });

  it("returns nothing for unsupported display types", () => {
    const { container } = render(
      <TimelineEventDisplay
        event={
          {
            displayType: "invalid" as processedTimelineEvent["displayType"],
            eventType: "reviewed",
            eventObj: createReviewedEvent({
              id: 1,
              user: actor,
              state: "APPROVED",
            }),
          } as processedTimelineEvent
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(console.log).toHaveBeenCalledWith('"reviewed" not supported');
  });

  it("returns nothing when a commented event has no event object", () => {
    const { container } = render(
      <TimelineEventDisplay
        event={
          {
            displayType: "other",
            eventType: "commented",
            eventObj: null,
          } as processedTimelineEvent
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("returns nothing when a review event has no event object", () => {
    const { container } = render(
      <TimelineEventDisplay
        event={
          {
            displayType: "other",
            eventType: "approved",
            eventObj: null,
          } as processedTimelineEvent
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders single-link events with empty actor fallbacks", () => {
    const { container } = render(
      <TimelineEventDisplay
        event={
          {
            displayType: "single_link",
            eventType: "merged",
            eventObj: createMergedEvent({ id: 40, actor }),
            actor1: null,
            message: "merged this pull request",
            iconName: "merge",
          } as processedTimelineEvent
        }
      />,
    );

    expect(container.querySelector("a.userLink")).toHaveTextContent("");
  });

  it("renders double-link events with empty actor fallbacks", () => {
    const { container } = render(
      <TimelineEventDisplay
        event={
          {
            displayType: "double_link",
            eventType: "assigned",
            eventObj: createAssignedEvent({
              id: 41,
              actor,
              assignee,
            }),
            actor1: null,
            actor2: null,
            message: "assigned this to",
            iconName: "user",
          } as processedTimelineEvent
        }
      />,
    );

    const links = container.querySelectorAll("a.userLink");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("");
    expect(links[1]).toHaveTextContent("");
  });

  it("renders committed events with empty sha and message fallbacks", () => {
    render(
      <TimelineCommit
        event={
          {
            displayType: "other",
            eventType: "committed",
            eventObj: {
              event: "committed",
              url: "",
              author: {
                date: "",
                email: "",
                name: "Author",
              },
              committer: {
                date: "",
                email: "",
                name: "Committer",
              },
            } as unknown as TimelineEvent,
            iconName: "commit",
          } as processedTimelineEvent
        }
      />,
    );

    expect(screen.getByRole("link", { name: "#" })).toBeInTheDocument();
    expect(screen.getByRole("paragraph")).toHaveTextContent("");
  });

  it("renders inline review comments with empty createdAt fallback", () => {
    render(
      <TimelineReview
        event={createReviewWithEmptyCreatedAtComment(reviewer)}
      />,
    );

    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-created-at",
      "",
    );
  });

  it("renders reviews without a body and without a user login", () => {
    render(
      <TimelineReview
        event={
          {
            displayType: "single_link",
            eventType: "approved",
            eventObj: {
              ...createReviewedEvent({
                id: 43,
                user: reviewer,
                state: "APPROVED",
              }),
              user: null,
              body: null,
            } as unknown as TimelineEvent,
            message: "approved these changes",
            iconName: "approved",
          } as processedTimelineEvent
        }
      />,
    );

    expect(screen.getByText("approved these changes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "" })).toBeInTheDocument();
  });

  it("renders reviews with changes_requested state and a body", () => {
    render(
      <TimelineEventDisplay
        event={
          {
            displayType: "single_link",
            eventType: "changes_requested",
            eventObj: {
              ...createReviewedEvent({
                id: 44,
                user: reviewer,
                state: "changes_requested",
              }),
              body: "Please update tests",
            } as unknown as TimelineEvent,
            actor1: reviewer.login,
            message: "requested changes",
            iconName: "changes_requested",
          } as processedTimelineEvent
        }
      />,
    );

    expect(screen.getByText("requested changes")).toBeInTheDocument();
    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-description",
      "Please update tests",
    );
  });

  it("renders commented events with an empty actor fallback", () => {
    render(
      <TimelineEventDisplay
        event={
          {
            displayType: "other",
            eventType: "commented",
            eventObj: createCommentedEvent({
              id: 45,
              actor,
              body: "Comment body",
              createdAt: "",
            }),
            actor1: null,
          } as processedTimelineEvent
        }
      />,
    );

    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-username",
      "",
    );
  });

  it("renders review comments with missing optional review fields", () => {
    render(
      <TimelineEventDisplay
        event={
          {
            displayType: "single_link",
            eventType: "commented_review",
            eventObj: {
              id: 46,
              event: "reviewed",
              state: "COMMENTED",
              body: "Review without optional fields",
              author_association: "CONTRIBUTOR",
            } as unknown as TimelineEvent,
            actor1: null,
            message: "left a review",
            iconName: "eye",
          } as processedTimelineEvent
        }
      />,
    );

    const comment = screen.getByTestId("pr-view-comment");
    expect(comment).toHaveAttribute("data-username", "");
    expect(comment).toHaveAttribute("data-created-at", "");
    expect(comment).toHaveAttribute(
      "data-description",
      "Review without optional fields",
    );
    expect(comment).toHaveAttribute("data-avatar-url", "");
  });

  it("renders review comments without a body field", () => {
    render(
      <TimelineEventDisplay
        event={
          {
            displayType: "single_link",
            eventType: "commented_review",
            eventObj: {
              id: 48,
              event: "reviewed",
              state: "COMMENTED",
              author_association: "CONTRIBUTOR",
            } as unknown as TimelineEvent,
            actor1: reviewer.login,
            message: "left a review",
            iconName: "eye",
          } as processedTimelineEvent
        }
      />,
    );

    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-description",
      "",
    );
  });

  it("renders review comments with an empty body string", () => {
    render(
      <TimelineEventDisplay
        event={
          {
            displayType: "single_link",
            eventType: "commented_review",
            eventObj: {
              id: 49,
              event: "reviewed",
              state: "COMMENTED",
              body: "",
              author_association: "CONTRIBUTOR",
            } as unknown as TimelineEvent,
            actor1: reviewer.login,
            message: "left a review",
            iconName: "eye",
          } as processedTimelineEvent
        }
      />,
    );

    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-description",
      "",
    );
  });

  it("renders inline review comments with an empty body string", () => {
    render(
      <TimelineReview
        event={
          {
            displayType: "other",
            eventType: "commented_review",
            eventObj: {
              ...createReviewedEvent({
                id: 50,
                user: reviewer,
                state: "COMMENTED",
              }),
              comments: [
                {
                  pull_request_review_id: 1,
                  id: 104,
                  diff_hunk: "",
                  path: "file.ts",
                  commit_id: "abc",
                  original_commit_id: "abc",
                  user: reviewer,
                  body: "",
                  created_at: "2026-01-13T00:00:00Z",
                  updated_at: "2026-01-13T00:00:00Z",
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
                  side: "RIGHT",
                  author_association: "CONTRIBUTOR",
                } as unknown as ReviewComment,
              ],
            } as unknown as TimelineEvent,
            eventKey: "reviewed-50",
          } as processedTimelineEvent
        }
      />,
    );

    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-description",
      "",
    );
  });

  it("renders review comments with approved state using a large icon", () => {
    render(
      <TimelineEventDisplay
        event={
          {
            displayType: "single_link",
            eventType: "approved",
            eventObj: {
              ...createReviewedEvent({
                id: 47,
                user: reviewer,
                state: "approved",
              }),
              body: "Approved with comment",
              submitted_at: "2026-01-12T00:00:00Z",
            } as unknown as TimelineEvent,
            actor1: reviewer.login,
            message: "approved these changes",
            iconName: "approved",
          } as processedTimelineEvent
        }
      />,
    );

    expect(screen.getByTestId("pr-view-comment")).toHaveAttribute(
      "data-created-at",
      "2026-01-12T00:00:00Z",
    );
  });

  it("returns nothing when TimelineCommit receives no event object", () => {
    const { container } = render(
      <TimelineCommit
        event={
          {
            displayType: "other",
            eventType: "committed",
            eventObj: null,
            iconName: "commit",
          } as processedTimelineEvent
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("returns nothing when TimelineReview receives no event object", () => {
    const { container } = render(
      <TimelineReview
        event={
          {
            displayType: "other",
            eventType: "approved",
            eventObj: null,
          } as processedTimelineEvent
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("returns nothing when a review-with-comment event has no state", () => {
    const { container } = render(
      <TimelineEventDisplay
        event={
          {
            displayType: "single_link",
            eventType: "commented_review",
            eventObj: {
              id: 38,
              event: "reviewed",
              user: actor,
              body: "Review body",
              submitted_at: "",
              updated_at: "",
              author_association: "CONTRIBUTOR",
            } as unknown as TimelineEvent,
            actor1: actor.login,
            message: "left a review",
            iconName: "eye",
          } as processedTimelineEvent
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
