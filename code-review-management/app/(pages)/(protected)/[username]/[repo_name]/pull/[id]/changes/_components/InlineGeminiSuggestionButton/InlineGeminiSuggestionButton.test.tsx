import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InlineGeminiSuggestionButton from "./InlineGeminiSuggestionButton";
import { PublishedThreadItem } from "../../_hooks/usePublishedThreads";

const mockMutate = jest.fn();
const mockUseGeminiSuggestionMutation = jest.fn();

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
}));

jest.mock("@/lib/api/mutations/useGeminiSuggestionMutation", () => ({
  useGeminiSuggestionMutation: (
    username: string, 
    repoName: string, 
    id: string, 
    threadId: string
  ) => mockUseGeminiSuggestionMutation(username, repoName, id, threadId),
}));

describe("InlineGeminiSuggestionButton", () => {
  const mockThread = {
    id: "thread-123",
    path: "src/utils/index.ts",
    side: "RIGHT",
    start_line: 15,
    line: 20,
    comments: [
      {
        commit_id: "sha-abc-123",
        body: "Sample comment",
      },
    ],
  } as unknown as PublishedThreadItem;

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseGeminiSuggestionMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it("renders the suggest button and icon", () => {
    render(<InlineGeminiSuggestionButton thread={mockThread} />);
    
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("Suggest")).toBeInTheDocument();
    expect(screen.getByAltText("AI Star")).toBeInTheDocument();
  });

  it("renders the pending state correctly", () => {
    mockUseGeminiSuggestionMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    
    render(<InlineGeminiSuggestionButton thread={mockThread} />);
    expect(screen.getByText("Pending...")).toBeInTheDocument();
  });

  it("calls the mutation hook with correct route and thread IDs", () => {
    render(<InlineGeminiSuggestionButton thread={mockThread} />);
    
    expect(mockUseGeminiSuggestionMutation).toHaveBeenCalledWith(
      "owner",
      "repo",
      "1",
      "thread-123"
    );
  });

  it("calls mutate with request params using start_line if it exists", async () => {
    const user = userEvent.setup();
    render(<InlineGeminiSuggestionButton thread={mockThread} />);
    
    await user.click(screen.getByRole("button"));
    
    expect(mockMutate).toHaveBeenCalledWith({
      id: mockThread.id,
      filePath: mockThread.path,
      side: mockThread.side,
      line: mockThread.start_line,
      sha: mockThread.comments[0].commit_id,
      comments: mockThread.comments,
    });
  });

  it("calls mutate with request params using line if start_line is null", async () => {
    const user = userEvent.setup();
    const threadWithoutStartLine = {
      ...mockThread,
      start_line: null,
    } as unknown as PublishedThreadItem;
    
    render(<InlineGeminiSuggestionButton thread={threadWithoutStartLine} />);
    
    await user.click(screen.getByRole("button"));
    
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        line: mockThread.line,
      })
    );
  });

  it("does not call mutate if both start_line and line are null", async () => {
    const user = userEvent.setup();
    const threadWithoutAnyLines = {
      ...mockThread,
      start_line: null,
      line: null,
    } as unknown as PublishedThreadItem;
    
    render(<InlineGeminiSuggestionButton thread={threadWithoutAnyLines} />);
    
    await user.click(screen.getByRole("button"));
    
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not call mutate if the mutation is currently pending", async () => {
    const user = userEvent.setup();
    mockUseGeminiSuggestionMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    
    render(<InlineGeminiSuggestionButton thread={mockThread} />);
    
    await user.click(screen.getByRole("button"));
    
    expect(mockMutate).not.toHaveBeenCalled();
  });
});