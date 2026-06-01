import "@testing-library/jest-dom";
import { ComponentProps, ReactNode } from "react";
import { PullRequest } from "@/types/github.types";
import { getExamplePull1 } from "@/mocks/tests/pulls";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PRChangesHeader from "./PRChangesHeader";

jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
}));

jest.mock("../../../_utils/pull-utils", () => ({
  getPullState: () => "draft",
}));

jest.mock("../../../_components/BranchDisplay/BranchDisplay", () => ({
  __esModule: true,
  default: ({ headRef, baseRef }: { headRef: string; baseRef: string }) => (
    <div
      data-testid="branch-display"
      data-head-ref={headRef}
      data-base-ref={baseRef}
    />
  ),
}));

jest.mock("@components/HeaderButton/HeaderButton", () => ({
  __esModule: true,
  default: ({
    variant,
    onClick,
    children,
  }: {
    variant: string;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <div data-testid="header-button" data-variant={variant} onClick={onClick}>
      {children}
    </div>
  ),
}));

jest.mock("@components/PageHeader/PageHeader", () => ({
  __esModule: true,
  default: ({
    leftChildren,
    rightChildren,
    className,
  }: {
    leftChildren: ReactNode;
    rightChildren: ReactNode;
    className: string;
  }) => (
    <div data-testid="page-header" data-classname={className}>
      <div data-testid="page-header-left-children">{leftChildren}</div>
      <div data-testid="page-header-right-children">{rightChildren}</div>
    </div>
  ),
}));

jest.mock("../../../_components/PRHeaderActions/PRHeaderActions", () => ({
  __esModule: true,
  default: ({
    viewHref,
    viewLabel,
    pull,
    showCommitPicker,
  }: {
    viewHref: string;
    viewLabel: string;
    pull: PullRequest;
    showCommitPicker: boolean;
  }) => (
    <div
      data-testid="pr-header-actions"
      data-view-href={viewHref}
      data-view-label={viewLabel}
      data-pull-id={pull.id}
      data-show-commit-picker={showCommitPicker}
    />
  ),
}));

jest.mock("../../../_components/StateChip/StateChip", () => ({
  __esModule: true,
  default: ({ state }: { state: string }) => (
    <div data-testid="state-chip" data-state={state} />
  ),
}));

describe("PRChangesHeader", () => {
  const examplePull1 = getExamplePull1();
  const mockToggleActivityPanel = jest.fn();
  const defaultProps: ComponentProps<typeof PRChangesHeader> = {
    pull: examplePull1,
    isActivityPanelOpen: false,
    toggleActivityPanel: mockToggleActivityPanel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("renders left children", () => {
    it("renders the state chip", () => {
      render(<PRChangesHeader {...defaultProps} />);
      const container = screen.getByTestId("page-header-left-children");
      const element = screen.getByTestId("state-chip");
      expect(container).toContainElement(element);
    });

    it("passes the pull state value to the state chip", () => {
      render(<PRChangesHeader {...defaultProps} />);
      expect(screen.getByTestId("state-chip")).toHaveAttribute(
        "data-state",
        "draft",
      );
    });

    it("renders the pull title heading", () => {
      render(<PRChangesHeader {...defaultProps} />);
      const container = screen.getByTestId("page-header-left-children");
      const element = screen.getByRole("heading", { level: 1 });
      expect(container).toContainElement(element);
    });

    it("uses the correct text for the pull title heading", () => {
      render(<PRChangesHeader {...defaultProps} />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        `${examplePull1.title} #${examplePull1.number}`,
      );
    });

    it("renders the branch display", () => {
      render(<PRChangesHeader {...defaultProps} />);
      const container = screen.getByTestId("page-header-left-children");
      const element = screen.getByTestId("branch-display");
      expect(container).toContainElement(element);
    });

    it("passes the head ref to the branch display", () => {
      render(<PRChangesHeader {...defaultProps} />);
      expect(screen.getByTestId("branch-display")).toHaveAttribute(
        "data-head-ref",
        examplePull1.head?.ref,
      );
    });

    it("passes the base ref to the branch display", () => {
      render(<PRChangesHeader {...defaultProps} />);
      expect(screen.getByTestId("branch-display")).toHaveAttribute(
        "data-base-ref",
        examplePull1.base?.ref,
      );
    });

    it("falls back to empty string when head ref is undefined", () => {
      const mockPull: PullRequest = { ...examplePull1, head: undefined };
      render(<PRChangesHeader {...defaultProps} pull={mockPull} />);
      expect(screen.getByTestId("branch-display")).toHaveAttribute(
        "data-head-ref",
        "",
      );
    });

    it("falls back to empty string when base ref is undefined", () => {
      const mockPull: PullRequest = { ...examplePull1, base: undefined };
      render(<PRChangesHeader {...defaultProps} pull={mockPull} />);
      expect(screen.getByTestId("branch-display")).toHaveAttribute(
        "data-base-ref",
        "",
      );
    });
  });

  describe("renders right children", () => {
    describe("PRHeaderActions", () => {
      it("renders header actions component", () => {
        render(<PRChangesHeader {...defaultProps} />);
        const container = screen.getByTestId("page-header-right-children");
        const element = screen.getByTestId("pr-header-actions");
        expect(container).toContainElement(element);
      });

      it("passes correct view href", () => {
        render(<PRChangesHeader {...defaultProps} />);
        expect(screen.getByTestId("pr-header-actions")).toHaveAttribute(
          "data-view-href",
          "/owner/repo/pull/1",
        );
      });

      it("passes correct view label", () => {
        render(<PRChangesHeader {...defaultProps} />);
        expect(screen.getByTestId("pr-header-actions")).toHaveAttribute(
          "data-view-label",
          "View pull request",
        );
      });

      it("passes correct pull request", () => {
        render(<PRChangesHeader {...defaultProps} />);
        expect(screen.getByTestId("pr-header-actions")).toHaveAttribute(
          "data-pull-id",
          examplePull1.id.toString(),
        );
      });

      it("passes correct boolean to show commit picker", () => {
        render(<PRChangesHeader {...defaultProps} />);
        expect(screen.getByTestId("pr-header-actions")).toHaveAttribute(
          "data-show-commit-picker",
          "true",
        );
      });
    });

    describe("commit picker header button", () => {
      it("renders header button component", () => {
        render(<PRChangesHeader {...defaultProps} />);
        const container = screen.getByTestId("page-header-right-children");
        const element = screen.getByTestId("header-button");
        expect(container).toContainElement(element);
      });

      it("renders commit activity icon", () => {
        render(<PRChangesHeader {...defaultProps} />);
        const container = screen.getByTestId("header-button");
        const element = screen.getByAltText("Comment activity");
        expect(container).toContainElement(element);
      });

      it("applies the activityButtonEnabled class if activity panel is open", () => {
        render(<PRChangesHeader {...defaultProps} isActivityPanelOpen />);
        const element = screen.getByTestId("header-button");
        expect(element.parentElement).toHaveClass("activityButtonEnabled");
      });

      it("does not apply the activityButtonEnabled class if activity panel is closed", () => {
        render(
          <PRChangesHeader {...defaultProps} isActivityPanelOpen={false} />,
        );
        const element = screen.getByTestId("header-button");
        expect(element.parentElement).not.toHaveClass("activityButtonEnabled");
      });

      it("uses the secondary button variant", () => {
        render(<PRChangesHeader {...defaultProps} />);
        expect(screen.getByTestId("header-button")).toHaveAttribute(
          "data-variant",
          "secondary",
        );
      });

      it("toggles the activity panel on click", async () => {
        const user = userEvent.setup();
        render(<PRChangesHeader {...defaultProps} />);
        await user.click(screen.getByTestId("header-button"));
        expect(mockToggleActivityPanel).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("passes the correct styling to PageHeader", () => {
    it("applies the headerWithPanel class if activity panel is open", () => {
      render(<PRChangesHeader {...defaultProps} isActivityPanelOpen />);
      expect(screen.getByTestId("page-header")).toHaveAttribute(
        "data-classname",
        "headerWithPanel",
      );
    });

    it("does not apply the headerWithPanel class if activity panel is closed", () => {
      render(<PRChangesHeader {...defaultProps} isActivityPanelOpen={false} />);
      expect(screen.getByTestId("page-header")).toHaveAttribute(
        "data-classname",
        "",
      );
    });
  });
});
