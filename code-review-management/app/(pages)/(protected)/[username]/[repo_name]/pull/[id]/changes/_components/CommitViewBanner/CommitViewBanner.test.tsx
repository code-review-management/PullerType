import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommitViewBanner from "./CommitViewBanner";

const mockSetSelectedSha = jest.fn();
const mockRouterPush = jest.fn();
const mockUseChangesViewMode = jest.fn();
const mockUsePermissionChecks = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
}));

jest.mock("@bprogress/next/app", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock("../../../_contexts/CommitPickerContext", () => ({
  useCommitPickerContext: () => ({
    setSelectedSha: mockSetSelectedSha,
  }),
}));

jest.mock("../../_hooks/useChangesViewMode", () => ({
  useChangesViewMode: () => mockUseChangesViewMode(),
}));

jest.mock("../../../_hooks/usePermissionChecks", () => ({
  usePermissionChecks: () => mockUsePermissionChecks(),
}));

describe("CommitViewBanner", () => {
  const mockSha = "ab102f9301df14";

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseChangesViewMode.mockReturnValue({
      mode: "single-commit",
    });
    mockUsePermissionChecks.mockReturnValue({
      hasCommentPermission: true,
    });
  });

  it("renders info icon", () => {
    render(<CommitViewBanner sha={mockSha} />);
    expect(screen.getByAltText("Info")).toBeInTheDocument();
  });

  it("renders correct message for single commit mode", () => {
    render(<CommitViewBanner sha={mockSha} />);
    expect(screen.getByTestId("commit-view-banner")).toHaveTextContent(
      "Commenting disabled \u2014 viewing commit ab102f9",
    );
  });

  it("renders correct message for cumulative commit mode", () => {
    mockUseChangesViewMode.mockReturnValue({
      mode: "cumulative-commit",
    });
    render(<CommitViewBanner sha={mockSha} />);
    expect(screen.getByTestId("commit-view-banner")).toHaveTextContent(
      "Commenting disabled \u2014 viewing changes from merge base to commit ab102f9",
    );
  });

  it("renders back to all changes button", () => {
    render(<CommitViewBanner sha={mockSha} />);
    expect(
      screen.getByRole("button", { name: "Back to all changes" }),
    ).toBeInTheDocument();
  });

  it("routes the user to the default changes page on button click", async () => {
    const user = userEvent.setup();
    render(<CommitViewBanner sha={mockSha} />);
    await user.click(
      screen.getByRole("button", { name: "Back to all changes" }),
    );
    expect(mockRouterPush).toHaveBeenCalledWith("/owner/repo/pull/1/changes");
  });

  it("sets the selected sha to null on button click", async () => {
    const user = userEvent.setup();
    render(<CommitViewBanner sha={mockSha} />);
    await user.click(
      screen.getByRole("button", { name: "Back to all changes" }),
    );
    expect(mockSetSelectedSha).toHaveBeenCalledWith(null);
  });
});
