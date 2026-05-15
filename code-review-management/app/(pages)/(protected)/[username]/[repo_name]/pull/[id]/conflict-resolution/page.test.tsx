import { render, screen } from "@testing-library/react";
import Page from "./page";
import { useMergeConflictQuery } from "@lib/api/queries/useFindConflictQuery";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
  useSearchParams: () =>
    new URLSearchParams({
      target_branch: "main",
      feature_branch: "feature-update",
    }),
}));

// Mock the React Query hook so we can control its return values
jest.mock("@lib/api/queries/useFindConflictQuery", () => ({
  useMergeConflictQuery: jest.fn(),
}));

// Mock next/dynamic to render a standard component for testing
jest.mock("next/dynamic", () => () => {
  return function MockConflictResolution() {
    return <div data-testid="conflict-resolution" />;
  };
});

describe("Merge Conflicts Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the header with the target branch name", () => {
    (useMergeConflictQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<Page />);
    
    expect(screen.getByText("Merge conflicts from main")).toBeDefined();
  });

  it("renders the loading state", () => {
    (useMergeConflictQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<Page />);
    
    expect(screen.getByText("Loading conflict data...")).toBeDefined();
  });

  it("renders the error state with a specific message", () => {
    (useMergeConflictQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "Network error occurred." },
    });

    render(<Page />);
    
    expect(screen.getByText("Network error occurred.")).toBeDefined();
  });

  it("renders a fallback error state when no error message is provided", () => {
    (useMergeConflictQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: null,
    });

    render(<Page />);
    
    expect(screen.getByText("Error loading conflict data.")).toBeDefined();
  });

  it("renders the ConflictResolution child component on success", () => {
    (useMergeConflictQuery as jest.Mock).mockReturnValue({
      data: {
        mergeOutput: {
          targetShaAtMerge: "abcdef123456",
          mergedFiles: [],
        },
        branchInfoProp: {
          owner: "owner",
          repo: "repo",
          pullId: "1",
          targetBranch: "main",
          featureBranch: "feature-update",
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<Page />);
    
    expect(screen.getByTestId("conflict-resolution")).toBeDefined();
  });
});