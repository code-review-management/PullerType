import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionModuleContent, SuggestionPopupProp } from "./SuggestionModulePopup";
import { SuggestionDiffEditorProps } from "./_components/SuggestionDiffEditor";
import { useUpdateGeminiSuggestionMutation } from "@/lib/api/mutations/useUpdateGeminiSuggestionMutation";
import { useCommitGeminiSuggestionMutation } from "@/lib/api/mutations/useCommitGeminiSuggestionMutation";
import { usePullQuery } from "@/lib/api/queries/usePullQuery";

const mockUpdateMutate = jest.fn();
const mockCommitMutate = jest.fn();
const mockOnXClicked = jest.fn();

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
}));

jest.mock("@/lib/api/queries/usePullQuery", () => ({
  usePullQuery: jest.fn(),
}));

jest.mock("@../../../_hooks/usePermissionChecks", () => ({
  usePermissionChecks: jest.fn().mockReturnValue({
    accessType: "write",
    hasCommentPermission: true,
    hasWritePermission: true,
  }),
}));

jest.mock("@/lib/api/mutations/useUpdateGeminiSuggestionMutation", () => ({
  useUpdateGeminiSuggestionMutation: jest.fn(),
}));

// Mock the Commit Mutation
jest.mock("@/lib/api/mutations/useCommitGeminiSuggestionMutation", () => ({
  useCommitGeminiSuggestionMutation: jest.fn(),
}));

// Mock the Editor component to easily trigger onCodeChange
jest.mock("./_components/SuggestionDiffEditor", () => ({
  SuggestionDiffEditor: ({ onCodeChange }: SuggestionDiffEditorProps) => (
    <div data-testid="mock-editor">
      <button
        data-testid="trigger-change"
        onClick={() =>
          onCodeChange(
            "line1\nline2",     // newBeforeCode
            "changedOriginal\n",  // newOriginalCode
            "changedModified\n",  // newModifiedCode
            "line5\nline6"      // newAfterCode
          )
        }
      >
        Trigger Code Change
      </button>
      <button
        data-testid="trigger-revert"
        onClick={() =>
          onCodeChange(
            "line1\nline2",     // original beforeCode
            "line3\nline4",     // original deletionContent
            "newLine3\nnewLine4",// original additionContent
            "line5\nline6"      // original afterCode
          )
        }
      >
        Revert Code Change
      </button>
    </div>
  ),
}));

describe("SuggestionModuleContent", () => {
  const defaultProps: SuggestionPopupProp = {
    commentID: 101,
    threadLine: 4,
    fullFileCode: "line1\nline2\nline3\nline4\nline5\nline6",
    filename: "src/utils/math.ts",
    replaceStartLine: 2,
    replaceEndLine: 4,
    deletionContent: "line3\nline4",
    additionContent: "newLine3\nnewLine4",
    onXClicked: mockOnXClicked,
  };

  const carriageProps: SuggestionPopupProp = {
    commentID: 101,
    threadLine: 4,
    fullFileCode: "line1\r\nline2\r\nline3\nline4\r\nline5\nline6",
    filename: "src/utils/math.ts",
    replaceStartLine: 2,
    replaceEndLine: 4,
    deletionContent: "line3\r\nline4",
    additionContent: "newLine3\r\nnewLine4",
    onXClicked: mockOnXClicked,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (usePullQuery as jest.Mock).mockReturnValue({
      data: {
        id: 1,
        number: 1,
        state: "open",
        title: "Refactor math utilities",
        body: "This PR introduces suggestions for math.ts",
        head: { ref: "feature/math-update" },
        base: { ref: "main" },
        user: { login: "test-user" },
      },
      isLoading: false,
      isError: false,
    });

    (useUpdateGeminiSuggestionMutation as jest.Mock).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false
    });

    (useCommitGeminiSuggestionMutation as jest.Mock).mockReturnValue({
      mutate: mockCommitMutate,
      isPending: false
    });
  });

  it("renders the header and buttons correctly", () => {
    render(<SuggestionModuleContent {...defaultProps} />);

    expect(screen.getByText("math.ts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Commit" })).toBeInTheDocument();
  });

  it("renders Loading... state when pull data is loading or missing", () => {
    // Override the global mock specifically for this test
    (usePullQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<SuggestionModuleContent {...defaultProps} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows pending states for Update and Commit buttons", () => {
    (useUpdateGeminiSuggestionMutation as jest.Mock).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: true
    });

    (useCommitGeminiSuggestionMutation as jest.Mock).mockReturnValue({
      mutate: mockCommitMutate,
      isPending: true
    });

    render(<SuggestionModuleContent {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Updating..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Committing..." })).toBeInTheDocument();
  });

  it("prevents onUpdateClicked from firing if no changes are made", async () => {
    const user = userEvent.setup();
    render(<SuggestionModuleContent {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Update" }));
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it("calls update mutation with correct payload when code changes and Update is clicked", async () => {
    const user = userEvent.setup();
    render(<SuggestionModuleContent {...defaultProps} />);

    // 1. Trigger a change in the mocked editor
    await user.click(screen.getByTestId("trigger-change"));

    // 2. Click the Update button
    await user.click(screen.getByRole("button", { name: "Update" }));

    // beforeCodeLength for "line1\nline2" is 2
    // relativeLineLocation = 2 + 1 - 4 = -1
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      githubCommentId: 101,
      deletionContent: "changedOriginal\n",
      additionContent: "changedModified\n",
      relativeLineLocation: -1,
    });
  });

  it("disables update functionality if changes are reverted back to original", async () => {
    const user = userEvent.setup();
    render(<SuggestionModuleContent {...defaultProps} />);

    // 1. Change code
    await user.click(screen.getByTestId("trigger-change"));

    // 2. Revert code to original
    await user.click(screen.getByTestId("trigger-revert"));

    // 3. Click the Update button
    await user.click(screen.getByRole("button", { name: "Update" }));

    // Should not fire because changes match initial state
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it("calls commit mutation with correct payload and combined code when Commit is clicked", async () => {
    const user = userEvent.setup();

    // Modify the commit mock to automatically call onSuccess for this test
    mockCommitMutate.mockImplementation((data, options) => {
      if (options?.onSuccess) options.onSuccess();
    });

    render(<SuggestionModuleContent {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Commit" }));

    // fileContent calculation based on initial props:
    // beforeCode: "line1\nline2"
    // additionContent: "newLine3\nnewLine4"
    // afterCode: "line5\nline6"
    const expectedFileContent = "line1\nline2newLine3\nnewLine4line5\nline6";

    // relativeLineLocation = 2 + 1 - 4 = -1
    expect(mockCommitMutate).toHaveBeenCalledWith(
      {
        filename: "src/utils/math.ts",
        content: expectedFileContent,
        suggestionData: {
          githubCommentId: 101,
          deletionContent: "line3\nline4",
          additionContent: "newLine3\nnewLine4",
          relativeLineLocation: -1,
        },
      },
      expect.any(Object) // The options object containing onSuccess
    );

    // Ensure the onSuccess callback properly triggered the X click
    expect(mockOnXClicked).toHaveBeenCalledTimes(1);
  });

  it("calls update mutation with carriage returns", async () => {
    const user = userEvent.setup();
    render(<SuggestionModuleContent {...carriageProps} />);

    // 1. Trigger a change in the mocked editor
    await user.click(screen.getByTestId("trigger-change"));

    // 2. Click the Update button
    await user.click(screen.getByRole("button", { name: "Update" }));

    // beforeCodeLength for "line1\nline2" is 2
    // relativeLineLocation = 2 + 1 - 4 = -1
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      githubCommentId: 101,
      deletionContent: "changedOriginal\r\n",
      additionContent: "changedModified\r\n",
      relativeLineLocation: -1,
    });
  });

  it("calls commit mutation with carriage returns", async () => {
    const user = userEvent.setup();

    mockCommitMutate.mockImplementation((data, options) => {
      if (options?.onSuccess) options.onSuccess();
    });

    render(<SuggestionModuleContent {...carriageProps} />);

    await user.click(screen.getByRole("button", { name: "Commit" }));

    const expectedFileContent = "line1\r\nline2newLine3\r\nnewLine4line5\r\nline6";

    // relativeLineLocation = 2 + 1 - 4 = -1
    expect(mockCommitMutate).toHaveBeenCalledWith(
      {
        filename: "src/utils/math.ts",
        content: expectedFileContent,
        suggestionData: {
          githubCommentId: 101,
          deletionContent: "line3\r\nline4",
          additionContent: "newLine3\r\nnewLine4",
          relativeLineLocation: -1,
        },
      },
      expect.any(Object) // The options object containing onSuccess
    );

    // Ensure the onSuccess callback properly triggered the X click
    expect(mockOnXClicked).toHaveBeenCalledTimes(1);
  });
});