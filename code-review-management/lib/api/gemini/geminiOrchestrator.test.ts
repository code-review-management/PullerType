import { generateSuggestion } from "./geminiOrchestrator";
import { Octokit } from "octokit";
import { getFileDiffAndContent } from "./retrieveContext";
import { getSystemPrompt, getUserPrompt } from "./prompt";
import { callGeminiToGenerateSuggestion } from "./generateGeminiSuggestion";
import { commentGeminiSuggestion } from "./geminiCommentor";
import { ThreadSuggestionRequest } from "@/types/request.types";

// Mock the internal dependencies
jest.mock("./retrieveContext", () => ({
  getFileDiffAndContent: jest.fn(),
}));

jest.mock("./prompt", () => ({
  getSystemPrompt: jest.fn(),
  getUserPrompt: jest.fn(),
}));

jest.mock("./generateGeminiSuggestion", () => ({
  callGeminiToGenerateSuggestion: jest.fn(),
}));

jest.mock("./geminiCommentor", () => ({
  commentGeminiSuggestion: jest.fn(),
}));

// Mock console.error to keep the test output clean during error tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

// Define the expected Gemini response type based on your schema
interface MockGeminiResponse {
  deleteRange: {
    minInclusiveLine: number;
    maxExclusiveLine: number;
  };
  additionBlock: {
    insertionCode: string;
  };
}

describe("generateSuggestion Orchestrator", () => {
  const mockOctokit = {} as Octokit; // Orchestrator only passes this down, so an empty object is fine
  const mockOwner = "test-owner";
  const mockRepo = "test-repo";
  const mockPullNumber = 1;

  const mockThreadVal: ThreadSuggestionRequest = {
    filePath: "src/utils.ts",
    line: 42,
    comments: ["Can we optimize this loop?"],
    sha: "mock-sha-123",
  } as unknown as ThreadSuggestionRequest; // Cast as unknown first if ThreadSuggestionRequest has other irrelevant required fields

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Execution", () => {
    it("should successfully orchestrate the flow and call commentGeminiSuggestion", async () => {
      // 1. Setup Mock Returns
      const mockFileContext = { content: "function test() { return true; }" };
      const mockSystemPrompt = "You are an AI assistant.";
      const mockUserPrompt = "Fix this code: function test()...";
      const mockGeminiResponse: MockGeminiResponse = {
        deleteRange: { minInclusiveLine: 40, maxExclusiveLine: 45 },
        additionBlock: { insertionCode: "function test() { return false; }" },
      };

      jest.mocked(getFileDiffAndContent).mockResolvedValue(mockFileContext);
      jest.mocked(getSystemPrompt).mockReturnValue(mockSystemPrompt);
      jest.mocked(getUserPrompt).mockReturnValue(mockUserPrompt);
      jest.mocked(callGeminiToGenerateSuggestion).mockResolvedValue(
        mockGeminiResponse as unknown as Awaited<ReturnType<typeof callGeminiToGenerateSuggestion>>
      );
      jest.mocked(commentGeminiSuggestion).mockResolvedValue(undefined);

      // 2. Execute
      await generateSuggestion(
        mockOctokit,
        mockThreadVal,
        mockOwner,
        mockRepo,
        mockPullNumber
      );

      // 3. Verify Context Retrieval
      expect(jest.mocked(getFileDiffAndContent)).toHaveBeenCalledWith(
        mockOctokit,
        mockOwner,
        mockRepo,
        mockThreadVal.filePath,
        mockThreadVal.sha
      );

      // 4. Verify Prompts
      expect(jest.mocked(getSystemPrompt)).toHaveBeenCalled();
      expect(jest.mocked(getUserPrompt)).toHaveBeenCalledWith(
        mockFileContext,
        mockThreadVal.comments,
        mockThreadVal.line
      );

      // 5. Verify Gemini Call
      expect(jest.mocked(callGeminiToGenerateSuggestion)).toHaveBeenCalledWith(
        mockSystemPrompt,
        mockUserPrompt
      );

      // 6. Verify Commentor Call
      expect(jest.mocked(commentGeminiSuggestion)).toHaveBeenCalledWith(
        mockOctokit,
        mockOwner,
        mockRepo,
        mockPullNumber,
        mockGeminiResponse,
        mockFileContext.content,
        mockThreadVal
      );
    });
  });

  describe("Error Handling", () => {
    it("should catch, log, and rethrow errors from retrieveContext", async () => {
      const mockError = new Error("Failed to fetch file content");
      jest.mocked(getFileDiffAndContent).mockRejectedValue(mockError);

      await expect(
        generateSuggestion(
          mockOctokit,
          mockThreadVal,
          mockOwner,
          mockRepo,
          mockPullNumber
        )
      ).rejects.toThrow("Failed to fetch file content");

      expect(console.error).toHaveBeenCalledWith(
        `Error generating gemini data for ${mockThreadVal.filePath}: `,
        mockError
      );

      // Verify execution stopped
      expect(jest.mocked(getSystemPrompt)).not.toHaveBeenCalled();
      expect(jest.mocked(callGeminiToGenerateSuggestion)).not.toHaveBeenCalled();
    });

    it("should catch, log, and rethrow errors from the Gemini call", async () => {
      const mockFileContext = { content: "const x = 1;" };
      jest.mocked(getFileDiffAndContent).mockResolvedValue(mockFileContext);
      
      const mockError = new Error("Gemini API rate limit exceeded");
      jest.mocked(callGeminiToGenerateSuggestion).mockRejectedValue(mockError);

      await expect(
        generateSuggestion(
          mockOctokit,
          mockThreadVal,
          mockOwner,
          mockRepo,
          mockPullNumber
        )
      ).rejects.toThrow("Gemini API rate limit exceeded");

      expect(console.error).toHaveBeenCalledWith(
        `Error generating gemini data for ${mockThreadVal.filePath}: `,
        mockError
      );

      // Verify commentor was never called
      expect(jest.mocked(commentGeminiSuggestion)).not.toHaveBeenCalled();
    });
  });
});