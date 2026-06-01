import "@testing-library/jest-dom";
import { ContextType, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { getExamplePull1 } from "@/mocks/tests/pulls";
import { getDefaultCommit, getDefaultCommitList } from "@/mocks/tests/commits";
import { CommitPickerContext } from "../../../_contexts/CommitPickerContext";
import { useListCommitsQuery } from "@/lib/api/queries/useListCommitsQuery";
import userEvent from "@testing-library/user-event";
import CommitPicker from "./CommitPicker";

const mockUseRouterPush = jest.fn();
const mockUseAutoFetchAllPages = jest.fn();
const mockUseListCommitsQuery = jest.fn();
const mockUseCommitPickerContext = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
}));

jest.mock("@bprogress/next/app", () => ({
  useRouter: () => ({
    push: mockUseRouterPush,
  }),
}));

jest.mock("@/lib/api/hooks/useAutoFetchAllPages", () => ({
  useAutoFetchAllPages: () => mockUseAutoFetchAllPages(),
}));

jest.mock("@/lib/api/queries/useListCommitsQuery", () => ({
  // Forward args to mock so we can check the params. We cannot directly do
  // `useListCommitsQuery: mockUseListCommitsQuery` due to initialization error.
  useListCommitsQuery: (...args: unknown[]) => mockUseListCommitsQuery(...args),
}));

jest.mock("../../../_contexts/CommitPickerContext", () => ({
  useCommitPickerContext: () => mockUseCommitPickerContext(),
}));

jest.mock("../../../_utils/date-utils", () => ({
  formatDate: () => "formatted-date",
}));

jest.mock("@components/ErrorMessage/ErrorMessage", () => ({
  __esModule: true,
  default: ({ resource }: { resource: string }) => (
    <div data-testid="error-message" data-resource={resource} />
  ),
}));

jest.mock("@components/IconTooltip/IconTooltip", () => ({
  __esModule: true,
  default: ({ id }: { id: string }) => (
    <div data-testid="icon-tooltip" data-id={id} />
  ),
}));

jest.mock("@components/LoadingSpinner/LoadingSpinner", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-spinner" />,
}));

jest.mock("@components/PopoverContent/PopoverContent", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

jest.mock("@components/SubmitButton/SubmitButton", () => ({
  __esModule: true,
  default: ({ label, isDisabled }: { label: string; isDisabled: boolean }) => (
    <button
      data-testid="submit-button"
      data-label={label}
      data-disabled={isDisabled}
    />
  ),
}));

describe("CommitPicker", () => {
  const mockPull = getExamplePull1();
  const mockCommitList = getDefaultCommitList();
  const mockSetSelectedSha = jest.fn();
  const mockSetIsCumulative = jest.fn();
  const mockFetchNextPage = jest.fn();

  const defaultCommitPickerContext: ContextType<typeof CommitPickerContext> = {
    selectedSha: null,
    setSelectedSha: mockSetSelectedSha,
    isCumulative: false,
    setIsCumulative: mockSetIsCumulative,
  };

  const defaultListCommitsQuery: Partial<
    ReturnType<typeof useListCommitsQuery>
  > = {
    data: [],
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
    isFetching: false,
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseCommitPickerContext.mockReturnValue(defaultCommitPickerContext);
    mockUseListCommitsQuery.mockReturnValue(defaultListCommitsQuery);
  });

  describe("layout", () => {
    it("wraps its content in a popover", () => {
      const { container } = render(<CommitPicker pull={mockPull} />);
      expect(container.firstElementChild).toHaveAttribute(
        "data-testid",
        "popover-content",
      );
    });

    it("renders the commit view mode tooltip with the correct id", () => {
      render(<CommitPicker pull={mockPull} />);
      expect(screen.getByTestId("icon-tooltip")).toHaveAttribute(
        "data-id",
        "tooltip-commit-view-mode",
      );
    });
  });

  describe("list commits query", () => {
    describe("query arguments", () => {
      it("uses an empty sha when the pull head is undefined", () => {
        const pullWithoutHead = { ...mockPull, head: undefined };
        render(<CommitPicker pull={pullWithoutHead} />);
        expect(mockUseListCommitsQuery).toHaveBeenCalledWith(
          "owner",
          "repo",
          "1",
          "",
        );
      });

      it("uses the pull head sha when defined", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(mockUseListCommitsQuery).toHaveBeenCalledWith(
          "owner",
          "repo",
          "1",
          mockPull.head!.sha,
        );
      });
    });

    describe("query states", () => {
      it("renders a loading spinner while pending", () => {
        mockUseListCommitsQuery.mockReturnValue({
          ...defaultListCommitsQuery,
          isPending: true,
        });
        render(<CommitPicker pull={mockPull} />);
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      });

      describe("on error", () => {
        it("renders an error message", () => {
          mockUseListCommitsQuery.mockReturnValue({
            ...defaultListCommitsQuery,
            isError: true,
          });
          render(<CommitPicker pull={mockPull} />);
          expect(screen.getByTestId("error-message")).toBeInTheDocument();
        });

        it("passes the commit list resource to the error message", () => {
          mockUseListCommitsQuery.mockReturnValue({
            ...defaultListCommitsQuery,
            isError: true,
          });
          render(<CommitPicker pull={mockPull} />);
          expect(screen.getByTestId("error-message")).toHaveAttribute(
            "data-resource",
            "commit list",
          );
        });
      });

      it("renders the commit list on success", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(screen.getByTestId("commit-list")).toBeInTheDocument();
      });
    });
  });

  describe("header", () => {
    beforeEach(() => {
      mockUseListCommitsQuery.mockReturnValue({
        ...defaultListCommitsQuery,
        data: mockCommitList,
      });
    });

    describe("title", () => {
      it("displays 'Commits' title alongside the list length", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(screen.getByTestId("commit-title")).toHaveTextContent(
          `Commits ${mockCommitList.length}`,
        );
      });

      it("renders an empty count when commits data is undefined", () => {
        mockUseListCommitsQuery.mockReturnValue({
          ...defaultListCommitsQuery,
          data: undefined,
        });
        render(<CommitPicker pull={mockPull} />);
        expect(screen.getByTestId("commit-count")).toBeEmptyDOMElement();
      });
    });

    describe("view mode toggle", () => {
      it("renders both 'Single' and 'Cumulative' buttons", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(
          screen.getByRole("button", { name: "Single" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Cumulative" }),
        ).toBeInTheDocument();
      });

      describe("when no commit is selected", () => {
        beforeEach(() => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: null,
          });
        });

        it("disables both buttons", () => {
          render(<CommitPicker pull={mockPull} />);
          expect(screen.getByRole("button", { name: "Single" })).toBeDisabled();
          expect(
            screen.getByRole("button", { name: "Cumulative" }),
          ).toBeDisabled();
        });

        it("shows the disabled message on both buttons", () => {
          const message = "Select a commit to use this option";
          render(<CommitPicker pull={mockPull} />);
          expect(
            screen.getByRole("button", { name: "Single" }),
          ).toHaveAttribute("data-tooltip-content", message);
          expect(
            screen.getByRole("button", { name: "Cumulative" }),
          ).toHaveAttribute("data-tooltip-content", message);
        });

        it("does not apply the active class to either button", () => {
          render(<CommitPicker pull={mockPull} />);
          expect(
            screen.getByRole("button", { name: "Single" }),
          ).not.toHaveClass("activeViewMode");
          expect(
            screen.getByRole("button", { name: "Cumulative" }),
          ).not.toHaveClass("activeViewMode");
        });
      });

      describe("when a commit is selected", () => {
        beforeEach(() => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: "test-selected-sha",
          });
        });

        it("enables both buttons", () => {
          render(<CommitPicker pull={mockPull} />);
          expect(screen.getByRole("button", { name: "Single" })).toBeEnabled();
          expect(
            screen.getByRole("button", { name: "Cumulative" }),
          ).toBeEnabled();
        });

        it("shows the single-commit tooltip on 'Single'", () => {
          render(<CommitPicker pull={mockPull} />);
          expect(
            screen.getByRole("button", { name: "Single" }),
          ).toHaveAttribute(
            "data-tooltip-content",
            "View only the changes introduced by this commit",
          );
        });

        it("shows the cumulative-commit tooltip on 'Cumulative'", () => {
          render(<CommitPicker pull={mockPull} />);
          expect(
            screen.getByRole("button", { name: "Cumulative" }),
          ).toHaveAttribute(
            "data-tooltip-content",
            "View all changes from the merge base to this commit",
          );
        });

        it("applies the active class to 'Single' when isCumulative is false", () => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: "test-selected-sha",
            isCumulative: false,
          });
          render(<CommitPicker pull={mockPull} />);
          expect(screen.getByRole("button", { name: "Single" })).toHaveClass(
            "activeViewMode",
          );
          expect(
            screen.getByRole("button", { name: "Cumulative" }),
          ).not.toHaveClass("activeViewMode");
        });

        it("applies the active class to 'Cumulative' when isCumulative is true", () => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: "test-selected-sha",
            isCumulative: true,
          });
          render(<CommitPicker pull={mockPull} />);
          expect(
            screen.getByRole("button", { name: "Cumulative" }),
          ).toHaveClass("activeViewMode");
          expect(
            screen.getByRole("button", { name: "Single" }),
          ).not.toHaveClass("activeViewMode");
        });

        it("calls setIsCumulative with true when 'Cumulative' is clicked", async () => {
          const user = userEvent.setup();
          render(<CommitPicker pull={mockPull} />);
          await user.click(screen.getByRole("button", { name: "Cumulative" }));
          expect(mockSetIsCumulative).toHaveBeenCalledWith(true);
        });

        it("calls setIsCumulative with false when 'Single' is clicked", async () => {
          const user = userEvent.setup();
          render(<CommitPicker pull={mockPull} />);
          await user.click(screen.getByRole("button", { name: "Single" }));
          expect(mockSetIsCumulative).toHaveBeenCalledWith(false);
        });
      });
    });
  });

  describe("commit list", () => {
    beforeEach(() => {
      mockUseListCommitsQuery.mockReturnValue({
        ...defaultListCommitsQuery,
        data: mockCommitList,
      });
    });

    describe("'Show all changes' option", () => {
      it("renders the option", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(
          screen.getByRole("radio", { name: "Show all changes" }),
        ).toBeInTheDocument();
      });

      describe("when no commit is selected", () => {
        beforeEach(() => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: null,
          });
        });

        it("is checked", () => {
          render(<CommitPicker pull={mockPull} />);
          expect(
            screen.getByRole("radio", { name: "Show all changes" }),
          ).toBeChecked();
        });
      });

      describe("when a commit is selected", () => {
        beforeEach(() => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: "test-selected-sha",
          });
        });

        it("is not checked", () => {
          render(<CommitPicker pull={mockPull} />);
          expect(
            screen.getByRole("radio", { name: "Show all changes" }),
          ).not.toBeChecked();
        });

        it("calls setSelectedSha with null when clicked", async () => {
          const user = userEvent.setup();
          render(<CommitPicker pull={mockPull} />);
          await user.click(
            screen.getByRole("radio", { name: "Show all changes" }),
          );
          expect(mockSetSelectedSha).toHaveBeenCalledWith(null);
        });
      });
    });

    describe("commit option", () => {
      it("renders a radio for each commit", () => {
        render(<CommitPicker pull={mockPull} />);
        mockCommitList.forEach((commit) => {
          expect(screen.getByDisplayValue(commit.sha)).toBeInTheDocument();
        });
      });

      it("displays the truncated sha for each commit", () => {
        render(<CommitPicker pull={mockPull} />);
        mockCommitList.forEach((commit) => {
          expect(screen.getByText(commit.sha.slice(0, 7))).toBeInTheDocument();
        });
      });

      it("displays the commit message for each commit", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(
          screen.getAllByText(mockCommitList[0].commit.message),
        ).toHaveLength(mockCommitList.length);
      });

      it("displays the author name for each commit", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(
          screen.getAllByText(mockCommitList[0].commit.author.name),
        ).toHaveLength(mockCommitList.length);
      });

      it("displays the formatted date for each commit", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(screen.getAllByText("formatted-date")).toHaveLength(
          mockCommitList.length,
        );
      });

      describe("when its sha matches the selected sha", () => {
        const selectedCommit = mockCommitList[0];

        beforeEach(() => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: selectedCommit.sha,
          });
        });

        it("is checked", () => {
          render(<CommitPicker pull={mockPull} />);
          expect(screen.getByDisplayValue(selectedCommit.sha)).toBeChecked();
        });

        it("leaves the other commits unchecked", () => {
          render(<CommitPicker pull={mockPull} />);
          mockCommitList
            .filter((commit) => commit.sha !== selectedCommit.sha)
            .forEach((commit) => {
              expect(screen.getByDisplayValue(commit.sha)).not.toBeChecked();
            });
        });
      });

      describe("when its sha does not match the selected sha", () => {
        it("is not checked", () => {
          render(<CommitPicker pull={mockPull} />);
          mockCommitList.forEach((commit) => {
            expect(screen.getByDisplayValue(commit.sha)).not.toBeChecked();
          });
        });

        it("calls setSelectedSha with its sha when clicked", async () => {
          const user = userEvent.setup();
          const targetCommit = mockCommitList[0];
          render(<CommitPicker pull={mockPull} />);
          await user.click(screen.getByDisplayValue(targetCommit.sha));
          expect(mockSetSelectedSha).toHaveBeenCalledWith(targetCommit.sha);
        });
      });
    });
  });

  describe("form submission", () => {
    const mockCommit = getDefaultCommit();

    beforeEach(() => {
      mockUseListCommitsQuery.mockReturnValue({
        ...defaultListCommitsQuery,
        data: [mockCommit],
      });
    });

    describe("submit button", () => {
      it("renders in the document", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(screen.getByTestId("submit-button")).toBeInTheDocument();
      });

      it("shows 'View changes' label", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(screen.getByTestId("submit-button")).toHaveAttribute(
          "data-label",
          "View changes",
        );
      });

      it("is enabled", () => {
        render(<CommitPicker pull={mockPull} />);
        expect(screen.getByTestId("submit-button")).toHaveAttribute(
          "data-disabled",
          "false",
        );
      });
    });

    describe("navigation on submit", () => {
      describe("when no commit is selected", () => {
        beforeEach(() => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: null,
          });
        });

        it("navigates to the changes page", async () => {
          const user = userEvent.setup();
          render(<CommitPicker pull={mockPull} />);
          await user.click(screen.getByTestId("submit-button"));

          expect(mockUseRouterPush).toHaveBeenCalledWith(
            "/owner/repo/pull/1/changes",
          );
        });
      });

      describe("when a commit is selected", () => {
        it("navigates only with the sha param when isCumulative is false", async () => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: mockCommit.sha,
            isCumulative: false,
          });

          const user = userEvent.setup();
          render(<CommitPicker pull={mockPull} />);
          await user.click(screen.getByTestId("submit-button"));

          expect(mockUseRouterPush).toHaveBeenCalledWith(
            `/owner/repo/pull/1/changes?sha=${mockCommit.sha}`,
          );
        });

        it("navigates with the sha and cumulative params when isCumulative is true", async () => {
          mockUseCommitPickerContext.mockReturnValue({
            ...defaultCommitPickerContext,
            selectedSha: mockCommit.sha,
            isCumulative: true,
          });

          const user = userEvent.setup();
          render(<CommitPicker pull={mockPull} />);
          await user.click(screen.getByTestId("submit-button"));

          expect(mockUseRouterPush).toHaveBeenCalledWith(
            `/owner/repo/pull/1/changes?sha=${mockCommit.sha}&cumulative=true`,
          );
        });
      });
    });
  });
});
