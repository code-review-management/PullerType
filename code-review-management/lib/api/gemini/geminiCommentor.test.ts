import { commentGeminiSuggestion, updateGeminiComment } from "./geminiCommentor"; // Update with your actual filename
import { Octokit } from "octokit";
import { CommentSchema, Comment } from "@/types/github.types";
import {
  CodeEditResponse,
  SuggestionCommentUpdateRequest,
  ThreadSuggestionRequest,
} from "@/types/request.types";

// Mock the GitHub types schema
jest.mock("@/types/github.types", () => ({
  CommentSchema: {
    parse: jest.fn(),
  },
}));

describe("geminiCommentor", () => {
  let mockOctokit: Octokit;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;

  const mockOwner = "test-owner";
  const mockRepo = "test-repo";
  const mockPullNumber = 42;

  beforeAll(() => {
    // Backup console methods
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Silence console output for error tests
    console.error = jest.fn();
    console.log = jest.fn();

    // Create deeply-typed mock Octokit instance
    mockOctokit = {
      rest: {
        pulls: {
          createReplyForReviewComment: jest.fn(),
          updateReviewComment: jest.fn(),
        },
      },
    } as unknown as Octokit;
  });

  afterAll(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe("commentGeminiSuggestion", () => {
    const mockFileContext = "line 1\nline 2\nline 3\nline 4\nline 5";
    
    // Casting as unknown first if ThreadSuggestionRequest has other irrelevant required fields
    const mockThread: ThreadSuggestionRequest = {
      id: 123,
      line: 1,
      filePath: "src/test.ts",
      sha: "mock-sha",
      side: "RIGHT",
      comments: [],
    } as unknown as ThreadSuggestionRequest;

    it("should successfully format and post a markdown reply", async () => {
      const mockSuggestion: CodeEditResponse = {
        deleteRange: { minInclusiveLine: 2, maxExclusiveLine: 4 }, // Targets lines 2 and 3
        additionBlock: { insertionCode: "new line 2\nnew line 3" },
      };

      jest.mocked(mockOctokit.rest.pulls.createReplyForReviewComment).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof mockOctokit.rest.pulls.createReplyForReviewComment>>
      );

      await commentGeminiSuggestion(
        mockOctokit,
        mockOwner,
        mockRepo,
        mockPullNumber,
        mockSuggestion,
        mockFileContext,
        mockThread
      );

      // OPTION 2: Use objectContaining and stringMatching to verify the payload in one clean pass
      expect(mockOctokit.rest.pulls.createReplyForReviewComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: mockOwner,
          repo: mockRepo,
          pull_number: mockPullNumber,
          comment_id: mockThread.id,
          // Using regex stringMatching to verify multiple parts of the markdown body at once
          body: expect.stringMatching(/<!--\[Gemini Suggestion#HLTP\]\[1\]-->[\s\S]*- line 2[\s\S]*- line 3[\s\S]*\+ new line 2[\s\S]*\+ new line 3/),
        })
      );
    });

    it("should catch and log errors if Octokit fails", async () => {
      const mockSuggestion: CodeEditResponse = {
        deleteRange: { minInclusiveLine: 1, maxExclusiveLine: 1 }, // No deletions
        additionBlock: { insertionCode: "insertion" },
      };

      const mockError = new Error("GitHub API Error");
      jest.mocked(mockOctokit.rest.pulls.createReplyForReviewComment).mockRejectedValue(mockError);

      await commentGeminiSuggestion(
        mockOctokit,
        mockOwner,
        mockRepo,
        mockPullNumber,
        mockSuggestion,
        mockFileContext,
        mockThread
      );

      expect(console.error).toHaveBeenCalledWith("Failed to reply to review comment:", mockError);
    });
  });

  describe("updateGeminiComment", () => {
    const mockSuggestionData: SuggestionCommentUpdateRequest = {
      githubCommentId: 456,
      deletionContent: "old content",
      additionContent: "new content",
      relativeLineLocation: 5,
    };

    it("should successfully update the comment with default 'taken' flag (false)", async () => {
      const mockParsedComment = { id: 456, body: "updated body" } as unknown as Comment;
      
      jest.mocked(mockOctokit.rest.pulls.updateReviewComment).mockResolvedValue({
        data: { id: 456 },
      } as unknown as Awaited<ReturnType<typeof mockOctokit.rest.pulls.updateReviewComment>>);

      jest.mocked(CommentSchema.parse).mockReturnValue(mockParsedComment);

      const result = await updateGeminiComment(mockOctokit, mockOwner, mockRepo, mockSuggestionData);

      // OPTION 2: Object containing check
      expect(mockOctokit.rest.pulls.updateReviewComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: mockOwner,
          repo: mockRepo,
          comment_id: mockSuggestionData.githubCommentId,
          // Ensure it has the base tag but DOES NOT have the [Commited] tag
          body: expect.stringMatching(/<!--\[Gemini Suggestion#HLTP\]\[5\]-->/),
        })
      );
      
      expect(CommentSchema.parse).toHaveBeenCalledWith({ id: 456 });
      expect(result).toEqual(mockParsedComment);
    });

    it("should successfully update the comment with 'taken' flag set to true", async () => {
      const mockParsedComment = { id: 456, body: "updated body" } as unknown as Comment;
      
      jest.mocked(mockOctokit.rest.pulls.updateReviewComment).mockResolvedValue({
        data: { id: 456 },
      } as unknown as Awaited<ReturnType<typeof mockOctokit.rest.pulls.updateReviewComment>>);

      jest.mocked(CommentSchema.parse).mockReturnValue(mockParsedComment);

      const result = await updateGeminiComment(
        mockOctokit, 
        mockOwner, 
        mockRepo, 
        mockSuggestionData, 
        true
      );

      // OPTION 2: Object containing check for the "Commited" state
      expect(mockOctokit.rest.pulls.updateReviewComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: mockOwner,
          repo: mockRepo,
          comment_id: mockSuggestionData.githubCommentId,
          // Verify both the specific header and the tag suffix
          body: expect.stringMatching(/### Gemini Suggestion \(Commited\)[\s\S]*<!--\[Gemini Suggestion#HLTP\]\[5\]\[Commited\]-->/),
        })
      );
      
      expect(result).toEqual(mockParsedComment);
    });

    it("should return null and log an error if Octokit throws", async () => {
      const mockError = new Error("Rate Limit Exceeded");
      jest.mocked(mockOctokit.rest.pulls.updateReviewComment).mockRejectedValue(mockError);

      const result = await updateGeminiComment(mockOctokit, mockOwner, mockRepo, mockSuggestionData);

      expect(console.log).toHaveBeenCalledWith("Error occured when updating gemini suggestion: Error: Rate Limit Exceeded");
      expect(result).toBeNull();
      expect(CommentSchema.parse).not.toHaveBeenCalled();
    });

    it("should return null and log an error if Zod parsing fails", async () => {
      jest.mocked(mockOctokit.rest.pulls.updateReviewComment).mockResolvedValue({
        data: { id: 456 },
      } as unknown as Awaited<ReturnType<typeof mockOctokit.rest.pulls.updateReviewComment>>);

      const mockZodError = new Error("Invalid Schema");
      jest.mocked(CommentSchema.parse).mockImplementation(() => {
        throw mockZodError;
      });

      const result = await updateGeminiComment(mockOctokit, mockOwner, mockRepo, mockSuggestionData);

      expect(console.log).toHaveBeenCalledWith("Error occured when updating gemini suggestion: Error: Invalid Schema");
      expect(result).toBeNull();
    });
  });
});