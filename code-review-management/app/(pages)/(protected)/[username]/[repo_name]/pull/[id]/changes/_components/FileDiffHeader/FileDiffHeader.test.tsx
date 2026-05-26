import "@testing-library/jest-dom";
import { act, ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { createFileMetaItem } from "@/mocks/tests/filetree";
import userEvent from "@testing-library/user-event";
import FileDiffHeader from "./FileDiffHeader";

jest.mock("../FileStatusChip/FileStatusChip", () => ({
  __esModule: true,
  default: () => <div data-testid="file-status-chip" />,
}));

const mockSetIsExpanded = jest.fn();
const mockCreateFileDraftThread = jest.fn();

const defaultProps: ComponentProps<typeof FileDiffHeader> = {
  diffType: "modify",
  oldPath: "old-path.ts",
  newPath: "new-path.ts",
  isExpanded: true,
  setIsExpanded: mockSetIsExpanded,
  createFileDraftThread: mockCreateFileDraftThread,
  isCommentingDisabled: false,
};

describe("FileDiffHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("chevron", () => {
    it("renders a downward chevron when expanded", () => {
      render(<FileDiffHeader {...defaultProps} isExpanded />);
      expect(
        screen.getByAltText("Chevron icon pointing down"),
      ).toBeInTheDocument();
    });

    it("renders a rightward chevron when collapsed", () => {
      render(<FileDiffHeader {...defaultProps} isExpanded={false} />);
      expect(
        screen.getByAltText("Chevron icon pointing right"),
      ).toBeInTheDocument();
    });

    it("calls setIsExpanded when chevron is clicked", async () => {
      const user = userEvent.setup();
      render(<FileDiffHeader {...defaultProps} />);
      await user.click(screen.getByAltText("Chevron icon pointing down"));
      expect(mockSetIsExpanded).toHaveBeenCalledTimes(1);
    });

    it("toggles boolean in setIsExpanded callback", async () => {
      const user = userEvent.setup();
      render(<FileDiffHeader {...defaultProps} />);
      await user.click(screen.getByAltText("Chevron icon pointing down"));
      // Docs: https://jestjs.io/docs/mock-functions#mock-property
      // Access the argument passed to `setIsExpanded` mock (i.e., `(prev) => !prev`).
      const toggleExpanded = mockSetIsExpanded.mock.lastCall[0];
      expect(toggleExpanded(true)).toBe(false);
      expect(toggleExpanded(false)).toBe(true);
    });
  });

  describe("file-level comment button", () => {
    it("renders button if not in commit view", () => {
      render(<FileDiffHeader {...defaultProps} isCommentingDisabled={false} />);
      expect(
        screen.getByRole("button", { name: "File-level comment" }),
      ).toBeInTheDocument();
    });

    it("does not render button if in commit view", () => {
      render(<FileDiffHeader {...defaultProps} isCommentingDisabled />);
      expect(
        screen.queryByRole("button", { name: "File-level comment" }),
      ).not.toBeInTheDocument();
    });

    it("calls createFileDraftThread when button is clicked", async () => {
      const user = userEvent.setup();
      render(<FileDiffHeader {...defaultProps} />);
      await user.click(
        screen.getByRole("button", { name: "File-level comment" }),
      );
      expect(mockCreateFileDraftThread).toHaveBeenCalledTimes(1);
    });
  });

  describe("file path", () => {
    it("renders both paths with an arrow for renamed files", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ status: "renamed" })}
        />,
      );
      expect(screen.getByText("old-path.ts")).toBeInTheDocument();
      expect(screen.getByText("\u2192")).toBeInTheDocument();
      expect(screen.getByText("new-path.ts")).toBeInTheDocument();
    });

    it("renders the old path for deleted files", () => {
      render(<FileDiffHeader {...defaultProps} diffType="delete" />);
      expect(screen.getByText("old-path.ts")).toBeInTheDocument();
      expect(screen.queryByText("new-path.ts")).not.toBeInTheDocument();
    });

    it("renders the new path for non-deleted files", () => {
      render(<FileDiffHeader {...defaultProps} diffType="modify" />);
      expect(screen.getByText("new-path.ts")).toBeInTheDocument();
      expect(screen.queryByText("old-path.ts")).not.toBeInTheDocument();
    });
  });

  describe("file meta", () => {
    it("renders the change count when fileMeta is provided", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ status: "renamed" })}
        />,
      );
      expect(screen.getByTestId("change-count")).toBeInTheDocument();
    });

    it("does not render the change count when fileMeta is omitted", () => {
      render(<FileDiffHeader {...defaultProps} />);
      expect(screen.queryByTestId("change-count")).not.toBeInTheDocument();
    });

    it("renders the file status chip when fileMeta is provided", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ status: "renamed" })}
        />,
      );
      expect(screen.getByTestId("file-status-chip")).toBeInTheDocument();
    });

    it("does not render the file status chip when fileMeta is omitted", () => {
      render(<FileDiffHeader {...defaultProps} />);
      expect(screen.queryByTestId("file-status-chip")).not.toBeInTheDocument();
    });
  });

  describe("ChangeCount", () => {
    it("renders deletions when greater than zero", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ deletions: 3, additions: 0 })}
        />,
      );
      expect(screen.getByText("-3")).toBeInTheDocument();
    });

    it("renders additions when greater than zero", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ deletions: 0, additions: 5 })}
        />,
      );
      expect(screen.getByText("+5")).toBeInTheDocument();
    });

    it("renders both deletions and additions when greater than zero", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ deletions: 3, additions: 5 })}
        />,
      );
      expect(screen.getByText("-3")).toBeInTheDocument();
      expect(screen.getByText("+5")).toBeInTheDocument();
    });

    it("does not render deletions nor additions when zero", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ deletions: 0, additions: 0 })}
        />,
      );
      expect(screen.queryByTestId("change-count")).not.toBeInTheDocument();
    });
  });

  describe("TruncatedPath", () => {
    /**
     * Docs:
     * 1. https://testing-library.com/docs/using-fake-timers/
     * Setup fake timers, and exit tests by restoring real timers.
     *
     * 2. https://testing-library.com/docs/user-event/options/#advancetimers
     * Setup user with advance timers.
     */
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("copies the path to clipboard when clicked", async () => {
      const user = userEvent.setup({
        advanceTimers: jest.advanceTimersByTime,
      });
      render(<FileDiffHeader {...defaultProps} diffType="modify" />);
      await user.click(screen.getByText("new-path.ts"));

      // Docs: https://stackoverflow.com/a/72584756
      const clipboardText = await navigator.clipboard.readText();
      expect(clipboardText).toBe("new-path.ts");
    });

    /**
     * Docs:
     * 1. https://stackoverflow.com/questions/71286328/react-testing-library-waiting-for-state-update-before-testing-component
     * Use `waitFor` to wait for state setters to cause update.
     */
    it("updates tooltip content when clicked and unhovered", async () => {
      const user = userEvent.setup({
        advanceTimers: jest.advanceTimersByTime,
      });
      render(<FileDiffHeader {...defaultProps} />);
      const path = screen.getByText("new-path.ts").parentElement!;

      await user.click(path);
      // Use `waitFor` to wait for `setCopied(true)` to cause re-render.
      await waitFor(() =>
        expect(path).toHaveAttribute("data-tooltip-content", "Copied"),
      );

      await user.unhover(path);
      // Use `act` to flush state setter. Otherwise, causes error.
      act(() => jest.advanceTimersByTime(200));
      expect(path).toHaveAttribute("data-tooltip-content", "Copy");
    });
  });
});
