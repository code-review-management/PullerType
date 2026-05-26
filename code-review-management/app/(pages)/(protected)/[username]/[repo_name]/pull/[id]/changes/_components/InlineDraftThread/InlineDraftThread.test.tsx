import "@testing-library/jest-dom";
import { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  getExampleFileDraftThreadItem1,
  getExampleLineDraftThreadItem1,
  getLineDraftThreadItemVariants,
} from "@/mocks/tests/threads";
import { getDefaultAuthenticatedSession } from "@/mocks/tests/session";
import userEvent from "@testing-library/user-event";
import InlineDraftThread from "./InlineDraftThread";

const mockUseSession = jest.fn();
const mockClearHighlight = jest.fn();
const mockSetDraftThreads = jest.fn();
const mockUseMutationInFlight = jest.fn();
const mockGetCreateReviewCommentMutationKey = jest.fn();
const mockDeleteDraftThread = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

jest.mock("../../_contexts/ClearHighlightContext", () => ({
  useClearHighlightContext: () => ({
    clearHighlight: mockClearHighlight,
  }),
}));

jest.mock("../../_contexts/DraftThreadsContext", () => ({
  useDraftThreadsContext: () => ({
    setDraftThreads: mockSetDraftThreads,
  }),
}));

jest.mock("@/lib/api/hooks/useMutationInFlight", () => ({
  useMutationInFlight: () => mockUseMutationInFlight(),
}));

jest.mock("@/lib/api/mutations/useCreateReviewCommentMutation", () => ({
  getCreateReviewCommentMutationKey: () =>
    mockGetCreateReviewCommentMutationKey(),
}));

jest.mock("../../_utils/comment-utils", () => ({
  deleteDraftThread: () => mockDeleteDraftThread(),
}));

jest.mock("@components/CancelButton/CancelButton", () => ({
  __esModule: true,
  default: ({
    onClick,
    tooltipContent,
  }: {
    onClick: () => void;
    tooltipContent: string;
  }) => (
    <div
      data-testid="cancel-button"
      data-tooltip-content={tooltipContent}
      onClick={onClick}
    />
  ),
}));

jest.mock("../DraftEditorActions/DraftEditorActions", () => ({
  __esModule: true,
  default: () => <div data-testid="draft-editor-actions" />,
}));

jest.mock("../InlineCommentEntry/InlineCommentEntry", () => ({
  __esModule: true,
  default: ({
    avatar,
    username,
    defaultEditable,
    editorActions,
  }: {
    avatar: string;
    username: string;
    defaultEditable: boolean;
    editorActions: ReactNode;
  }) => (
    <div
      data-testid="inline-comment-entry"
      data-avatar={avatar}
      data-username={username}
      data-default-editable={defaultEditable}
    >
      {editorActions}
    </div>
  ),
}));

jest.mock("../InlineThreadHeader/InlineThreadHeader", () => ({
  __esModule: true,
  default: ({ title, actions }: { title: string; actions: ReactNode }) => (
    <div data-testid="inline-thread-header" data-title={title}>
      {actions}
    </div>
  ),
}));

describe("InlineDraftThread", () => {
  const mockSession = getDefaultAuthenticatedSession();
  const mockFileDraftThread = getExampleFileDraftThreadItem1();
  const mockLineDraftThread = getExampleLineDraftThreadItem1();
  const {
    SINGLE_LINE_NEW_SIDE,
    SINGLE_LINE_OLD_SIDE,
    MULTI_LINE_NEW_SIDE,
    MULTI_LINE_OLD_SIDE,
  } = getLineDraftThreadItemVariants();

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
    });
  });

  describe("container id", () => {
    it("does not assign an id for line-level drafts", () => {
      const { container } = render(
        <InlineDraftThread draft={mockLineDraftThread} />,
      );
      expect(container.firstElementChild).not.toHaveAttribute("id");
    });

    it("assigns an id for file-level drafts", () => {
      const { container } = render(
        <InlineDraftThread draft={mockFileDraftThread} />,
      );
      expect(container.firstElementChild).toHaveAttribute(
        "id",
        `file-draft-${mockFileDraftThread.activePath}`,
      );
    });
  });

  describe("InlineThreadHeader", () => {
    it("renders in the document", () => {
      render(<InlineDraftThread draft={mockLineDraftThread} />);
      expect(screen.getByTestId("inline-thread-header")).toBeInTheDocument();
    });

    describe("title", () => {
      it("shows 'Draft on file-level' for file-level drafts", () => {
        render(<InlineDraftThread draft={mockFileDraftThread} />);
        expect(screen.getByTestId("inline-thread-header")).toHaveAttribute(
          "data-title",
          "Draft on file-level",
        );
      });

      it("shows line range with an 'R' prefix for multi-line drafts on the new side", () => {
        render(<InlineDraftThread draft={MULTI_LINE_NEW_SIDE} />);
        expect(screen.getByTestId("inline-thread-header")).toHaveAttribute(
          "data-title",
          `Draft on lines R${MULTI_LINE_NEW_SIDE.start} to R${MULTI_LINE_NEW_SIDE.end}`,
        );
      });

      it("shows line range with an 'L' prefix for multi-line drafts on the old side", () => {
        render(<InlineDraftThread draft={MULTI_LINE_OLD_SIDE} />);
        expect(screen.getByTestId("inline-thread-header")).toHaveAttribute(
          "data-title",
          `Draft on lines L${MULTI_LINE_OLD_SIDE.start} to L${MULTI_LINE_OLD_SIDE.end}`,
        );
      });

      it("shows line number with an 'R' prefix for single-line drafts on the new side", () => {
        render(<InlineDraftThread draft={SINGLE_LINE_NEW_SIDE} />);
        expect(screen.getByTestId("inline-thread-header")).toHaveAttribute(
          "data-title",
          `Draft on line R${SINGLE_LINE_NEW_SIDE.end}`,
        );
      });

      it("shows line number with an 'L' prefix for single-line drafts on the old side", () => {
        render(<InlineDraftThread draft={SINGLE_LINE_OLD_SIDE} />);
        expect(screen.getByTestId("inline-thread-header")).toHaveAttribute(
          "data-title",
          `Draft on line L${SINGLE_LINE_OLD_SIDE.end}`,
        );
      });
    });

    describe("cancel button", () => {
      it("renders when no submission is in flight", () => {
        mockUseMutationInFlight.mockReturnValue(false);
        render(<InlineDraftThread draft={mockLineDraftThread} />);
        const container = screen.getByTestId("inline-thread-header");
        const element = screen.getByTestId("cancel-button");
        expect(container).toContainElement(element);
      });

      it("does not render when a submission is in flight", () => {
        mockUseMutationInFlight.mockReturnValue(true);
        render(<InlineDraftThread draft={mockLineDraftThread} />);
        expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
      });

      it("shows 'Cancel draft' as the tooltip content", () => {
        mockUseMutationInFlight.mockReturnValue(false);
        render(<InlineDraftThread draft={mockLineDraftThread} />);
        expect(screen.getByTestId("cancel-button")).toHaveAttribute(
          "data-tooltip-content",
          "Cancel draft",
        );
      });

      it("deletes the draft when clicked", async () => {
        const user = userEvent.setup();
        mockUseMutationInFlight.mockReturnValue(false);

        render(<InlineDraftThread draft={mockLineDraftThread} />);
        await user.click(screen.getByTestId("cancel-button"));

        expect(mockDeleteDraftThread).toHaveBeenCalledTimes(1);
      });

      it("clears the highlight when clicked for line-level drafts", async () => {
        const user = userEvent.setup();
        mockUseMutationInFlight.mockReturnValue(false);

        render(<InlineDraftThread draft={mockLineDraftThread} />);
        await user.click(screen.getByTestId("cancel-button"));

        expect(mockClearHighlight).toHaveBeenCalledWith({
          start: mockLineDraftThread.start,
          end: mockLineDraftThread.end,
          side: mockLineDraftThread.side,
        });
      });

      it("does not clear any highlight when clicked for file-level drafts", async () => {
        const user = userEvent.setup();
        mockUseMutationInFlight.mockReturnValue(false);

        render(<InlineDraftThread draft={mockFileDraftThread} />);

        await user.click(screen.getByTestId("cancel-button"));
        expect(mockClearHighlight).not.toHaveBeenCalled();
      });
    });
  });

  describe("InlineCommentEntry", () => {
    it("renders in the document", () => {
      render(<InlineDraftThread draft={mockLineDraftThread} />);
      expect(screen.getByTestId("inline-comment-entry")).toBeInTheDocument();
    });

    it("uses the session image as the avatar", () => {
      render(<InlineDraftThread draft={mockLineDraftThread} />);
      expect(screen.getByTestId("inline-comment-entry")).toHaveAttribute(
        "data-avatar",
        "example-user-image",
      );
    });

    it("uses fallback image as the avatar if session image is missing", () => {
      mockUseSession.mockReturnValue({ data: null });
      render(<InlineDraftThread draft={mockLineDraftThread} />);
      expect(screen.getByTestId("inline-comment-entry")).toHaveAttribute(
        "data-avatar",
        "/mock/octocat.png",
      );
    });

    it("uses the github login as the username", () => {
      render(<InlineDraftThread draft={mockLineDraftThread} />);
      expect(screen.getByTestId("inline-comment-entry")).toHaveAttribute(
        "data-username",
        "example-user-github-login",
      );
    });

    it("uses empty string as the username when github login is missing", () => {
      mockUseSession.mockReturnValue({ data: null });
      render(<InlineDraftThread draft={mockLineDraftThread} />);
      expect(screen.getByTestId("inline-comment-entry")).toHaveAttribute(
        "data-username",
        "",
      );
    });

    it("is editable by default", () => {
      render(<InlineDraftThread draft={mockLineDraftThread} />);
      expect(screen.getByTestId("inline-comment-entry")).toHaveAttribute(
        "data-default-editable",
        "true",
      );
    });

    it("renders the draft editor actions", () => {
      render(<InlineDraftThread draft={mockLineDraftThread} />);
      const container = screen.getByTestId("inline-comment-entry");
      const element = screen.getByTestId("draft-editor-actions");
      expect(container).toContainElement(element);
    });
  });
});
