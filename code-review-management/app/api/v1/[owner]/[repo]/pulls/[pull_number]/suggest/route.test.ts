import { POST } from "./route";
import { getToken, JWT } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";
import { generateSuggestion } from "@/lib/api/gemini/geminiOrchestrator";
import { ThreadSuggestionRequestSchema } from "@/types/request.types";

// Mock next-auth/jwt
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

// Mock Orchestrator
jest.mock("@/lib/api/gemini/geminiOrchestrator", () => ({
  generateSuggestion: jest.fn(),
}));

// Mock local utilities
jest.mock("@/app/api/_utils/cookie-utils", () => ({
  getCookieName: jest.fn(() => "authjs.session-token"),
}));

// Mock Zod schemas
jest.mock("@/types/request.types", () => ({
  ThreadSuggestionRequestSchema: {
    safeParse: jest.fn(),
  },
}));

// Define a strict type for the mock request to avoid 'any'
interface MockRequestOptions {
  method: string;
  url: string;
  headers: Record<string, string>;
}

// Mock octokit
jest.mock("octokit", () => ({
  RequestError: class extends Error {
    status: number;
    request: MockRequestOptions;

    constructor(message: string, status: number, options: { request: MockRequestOptions }) {
      super(message);
      this.status = status;
      this.name = "RequestError";
      this.request = options.request;
    }
  },
  Octokit: jest.fn(),
}));

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    pull_number: string;
  }>;
};

describe("POST /api/v1/{owner}/{repo}/pulls/{pull_number}/suggest", () => {
  let mockRequest: Request;
  let mockContext: RouteContext;
  const mockRequestBody = { threadId: "thread-123", comment: "Can we improve this?" };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = new Request(
      "http://localhost:3000/api/v1/test-owner/test-repo/pulls/1/suggest",
      {
        method: "POST",
        body: JSON.stringify(mockRequestBody),
        headers: { "Content-Type": "application/json" },
      }
    );

    mockContext = {
      params: Promise.resolve({
        owner: "test-owner",
        repo: "test-repo",
        pull_number: "1",
      }),
    };

    // Default successful schema mock
    jest.mocked(ThreadSuggestionRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: mockRequestBody,
    } as unknown as ReturnType<typeof ThreadSuggestionRequestSchema.safeParse>);
  });

  describe("Authentication", () => {
    it("should return 401 when token is null", async () => {
      jest.mocked(getToken).mockResolvedValue(null);

      const response = await POST(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(jest.mocked(getToken)).toHaveBeenCalledWith({
        req: mockRequest,
        secret: process.env.AUTH_SECRET,
        cookieName: "authjs.session-token",
      });
    });

    it("should return 401 when accessToken is undefined", async () => {
      const mockToken: JWT = {
        githubId: "12345",
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await POST(mockRequest, mockContext);

      expect(response.status).toBe(401);
    });

    it("should return 401 when githubId is null", async () => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubId: null,
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await POST(mockRequest, mockContext);

      expect(response.status).toBe(401);
    });
  });

  describe("Validation & Bad Requests", () => {
    beforeEach(() => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubId: "12345",
        githubLogin: "testuser",
      };
      jest.mocked(getToken).mockResolvedValue(mockToken);
    });

    it("should return 400 when owner, repo, or pull_number is missing", async () => {
      const badContext: RouteContext = {
        params: Promise.resolve({
          owner: "", // Missing owner
          repo: "test-repo",
          pull_number: "1",
        }),
      };

      const response = await POST(mockRequest, badContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 400 when pull_number is not a valid number (NaN)", async () => {
      const badContext: RouteContext = {
        params: Promise.resolve({
          owner: "test-owner",
          repo: "test-repo",
          pull_number: "invalid-string", // Will evaluate to NaN
        }),
      };

      const response = await POST(mockRequest, badContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 400 and extract error message when schema parsing fails", async () => {
      // Mocking the specific error structure the route expects: JSON.parse(reqArgs.error.message)[0]["message"]
      const mockErrorArray = [{ message: "Invalid thread structure provided" }];
      
      jest.mocked(ThreadSuggestionRequestSchema.safeParse).mockReturnValue({
        success: false,
        error: {
          message: JSON.stringify(mockErrorArray),
        },
      } as unknown as ReturnType<typeof ThreadSuggestionRequestSchema.safeParse>);

      const response = await POST(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid thread structure provided");
    });
  });

  describe("Successful requests", () => {
    beforeEach(() => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubId: "12345",
        githubLogin: "testuser",
      };
      jest.mocked(getToken).mockResolvedValue(mockToken);
    });

    it("should return 200 and call generateSuggestion with correct parameters", async () => {
      jest.mocked(generateSuggestion).mockResolvedValue(undefined);

      const response = await POST(mockRequest, mockContext);

      // Verify Octokit instantiation
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({ auth: "valid-token" });

      // Verify orchestrator call 
      // Note: We use expect.any(Object) for Octokit since it's instantiated inside the route
      expect(jest.mocked(generateSuggestion)).toHaveBeenCalledWith(
        expect.any(Object), // octokit instance
        mockRequestBody,    // reqArgs.data
        "test-owner",       // owner
        "test-repo",        // repo
        1                   // castedPullNumber
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ message: "Success" });
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubId: "12345",
        githubLogin: "testuser",
      };
      jest.mocked(getToken).mockResolvedValue(mockToken);
    });

    it("should handle Octokit RequestError and return its status", async () => {
      const mockError = new RequestError("Rate Limit Exceeded", 429, {
        request: { method: "POST", url: "https://api.github.com", headers: {} },
      });

      // Mock the orchestrator to throw the Octokit error
      jest.mocked(generateSuggestion).mockRejectedValue(mockError);

      const response = await POST(mockRequest, mockContext);
      const text = await response.text();

      expect(response.status).toBe(429);
      expect(text).toBe("Rate Limit Exceeded");
    });

    it("should return 500 for generic unknown errors", async () => {
      jest.mocked(generateSuggestion).mockRejectedValue(new Error("AI Model Timeout"));

      const response = await POST(mockRequest, mockContext);
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).toContain("Server error: Error: AI Model Timeout");
    });
  });
});