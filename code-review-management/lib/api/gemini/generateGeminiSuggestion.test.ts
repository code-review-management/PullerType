import { callGeminiToGenerateSuggestion } from "./generateGeminiSuggestion"; // Update with your actual filename
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CodeEditResponseSchema } from "@/types/request.types";

// Mock the Gemini SDK and its enums
jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn(),
    SchemaType: {
      OBJECT: "OBJECT",
      INTEGER: "INTEGER",
      STRING: "STRING",
    },
  };
});

// Mock the Zod schema
jest.mock("@/types/request.types", () => ({
  CodeEditResponseSchema: {
    parse: jest.fn(),
  },
}));

// Define strict types for our mocked Gemini return values
interface MockGeminiResponse {
  response: {
    text: () => string;
  };
}

describe("callGeminiToGenerateSuggestion", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalConsoleLog: typeof console.log;

  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn();

  const mockSystemPrompt = "System Instruction";
  const mockUserPrompt = "User Instruction";

  beforeAll(() => {
    // Backup environment and console
    originalEnv = process.env;
    originalConsoleLog = console.log;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Silence console.log to keep test runner output clean
    console.log = jest.fn(); 
    
    // Inject test API key
    process.env = { ...originalEnv, GEMINI_API_KEY: "test-api-key" };

    // Setup the mocked chain: GoogleGenerativeAI -> getGenerativeModel -> generateContent
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });

    jest.mocked(GoogleGenerativeAI).mockImplementation(
      () =>
        ({
          getGenerativeModel: mockGetGenerativeModel,
        } as unknown as GoogleGenerativeAI)
    );
  });

  afterAll(() => {
    // Restore environment and console
    process.env = originalEnv;
    console.log = originalConsoleLog;
  });

  describe("Initialization & Validation", () => {
    it("should throw an error if GEMINI_API_KEY is missing", async () => {
      delete process.env.GEMINI_API_KEY;

      await expect(
        callGeminiToGenerateSuggestion(mockSystemPrompt, mockUserPrompt)
      ).rejects.toThrow("GEMINI_API_KEY is not set in the environment.");

      // Ensure model was never instantiated
      expect(GoogleGenerativeAI).not.toHaveBeenCalled();
    });
  });

  describe("Successful Executions", () => {
    it("should successfully call Gemini, parse an object response, and validate it with Zod", async () => {
      const mockRawResponse = {
        deleteRange: { minInclusiveLine: 1, maxExclusiveLine: 2 },
        additionBlock: { insertionCode: "const a = 1;" },
      };

      const mockGeminiReturn: MockGeminiResponse = {
        response: {
          text: () => JSON.stringify(mockRawResponse),
        },
      };

      mockGenerateContent.mockResolvedValue(
        mockGeminiReturn as unknown as Awaited<ReturnType<typeof mockGenerateContent>>
      );

      jest.mocked(CodeEditResponseSchema.parse).mockReturnValue(
        mockRawResponse as unknown as ReturnType<typeof CodeEditResponseSchema.parse>
      );

      const result = await callGeminiToGenerateSuggestion(mockSystemPrompt, mockUserPrompt);

      // Verify Model Config
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-3-flash-preview",
          systemInstruction: mockSystemPrompt,
          generationConfig: expect.objectContaining({
            responseMimeType: "application/json",
          }),
        })
      );

      // Verify Execution
      expect(mockGenerateContent).toHaveBeenCalledWith(mockUserPrompt);
      expect(jest.mocked(CodeEditResponseSchema.parse)).toHaveBeenCalledWith(mockRawResponse);
      expect(result).toEqual(mockRawResponse);
    });

    it("should extract the first element if Gemini returns a JSON array", async () => {
      const mockRawResponse = {
        deleteRange: { minInclusiveLine: 5, maxExclusiveLine: 5 },
        additionBlock: { insertionCode: "// new comment" },
      };

      // Wrap the response in an array (Simulating Gemini's occasional behavior)
      const mockGeminiReturn: MockGeminiResponse = {
        response: {
          text: () => JSON.stringify([mockRawResponse]),
        },
      };

      mockGenerateContent.mockResolvedValue(
        mockGeminiReturn as unknown as Awaited<ReturnType<typeof mockGenerateContent>>
      );

      jest.mocked(CodeEditResponseSchema.parse).mockReturnValue(
        mockRawResponse as unknown as ReturnType<typeof CodeEditResponseSchema.parse>
      );

      const result = await callGeminiToGenerateSuggestion(mockSystemPrompt, mockUserPrompt);

      // Validation should only receive the extracted object, NOT the array
      expect(jest.mocked(CodeEditResponseSchema.parse)).toHaveBeenCalledWith(mockRawResponse);
      expect(result).toEqual(mockRawResponse);
    });
  });

  describe("Error Handling", () => {
    it("should catch, log, and rethrow errors from the Gemini API", async () => {
      const mockError = new Error("API Limit Reached");
      mockGenerateContent.mockRejectedValue(mockError);

      await expect(
        callGeminiToGenerateSuggestion(mockSystemPrompt, mockUserPrompt)
      ).rejects.toThrow("API Limit Reached");

      expect(console.log).toHaveBeenCalledWith(
        "Error when calling gemini: Error: API Limit Reached"
      );
    });

    it("should catch, log, and rethrow JSON parsing errors", async () => {
      const mockGeminiReturn: MockGeminiResponse = {
        response: {
          text: () => "invalid-json-string",
        },
      };

      mockGenerateContent.mockResolvedValue(
        mockGeminiReturn as unknown as Awaited<ReturnType<typeof mockGenerateContent>>
      );

      await expect(
        callGeminiToGenerateSuggestion(mockSystemPrompt, mockUserPrompt)
      ).rejects.toThrow(SyntaxError);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Error when calling gemini: SyntaxError")
      );
    });

    it("should catch, log, and rethrow Zod validation errors", async () => {
      const mockGeminiReturn: MockGeminiResponse = {
        response: {
          text: () => JSON.stringify({ invalid: "data" }),
        },
      };

      mockGenerateContent.mockResolvedValue(
        mockGeminiReturn as unknown as Awaited<ReturnType<typeof mockGenerateContent>>
      );

      const mockZodError = new Error("Zod Validation Failed");
      jest.mocked(CodeEditResponseSchema.parse).mockImplementation(() => {
        throw mockZodError;
      });

      await expect(
        callGeminiToGenerateSuggestion(mockSystemPrompt, mockUserPrompt)
      ).rejects.toThrow("Zod Validation Failed");

      expect(console.log).toHaveBeenCalledWith(
        "Error when calling gemini: Error: Zod Validation Failed"
      );
    });
  });
});