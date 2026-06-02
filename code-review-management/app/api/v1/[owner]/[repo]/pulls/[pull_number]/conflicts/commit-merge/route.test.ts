import { POST } from "./route"; 
import { getToken, JWT } from "next-auth/jwt";
import { Octokit } from "octokit";
import { commitMergeChanges } from "@/app/api/v1/[owner]/[repo]/pulls/[pull_number]/conflicts/_utils/merge-commiter/push-merge";
import { MergeCommitPayloadSchema } from "@/app/api/v1/[owner]/[repo]/pulls/[pull_number]/conflicts/_utils/merge-github.types";

// --- Polyfills for Jest (Next.js Web APIs) ---
if (typeof global.Request === "undefined") {
  global.Request = class Request {
    url: string;
    method: string;
    bodyText: string;
    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method || "GET";
      this.bodyText = init?.body || "";
    }
    async json() {
      return JSON.parse(this.bodyText);
    }
  } as any;
}

if (typeof global.Response === "undefined") {
  global.Response = class Response {
    status: number;
    body: any;
    headers: Map<string, string>;
    constructor(body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }
    async text() {
      return String(this.body);
    }
    static json(data: any, init?: any) {
      return new Response(JSON.stringify(data), init);
    }
  } as any;
}

// --- Mocks ---
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("octokit", () => ({
  Octokit: jest.fn(),
}));

jest.mock(
  "@/app/api/v1/[owner]/[repo]/pulls/[pull_number]/conflicts/_utils/merge-commiter/push-merge",
  () => ({
    commitMergeChanges: jest.fn(),
  })
);

jest.mock(
  "@/app/api/v1/[owner]/[repo]/pulls/[pull_number]/conflicts/_utils/merge-github.types",
  () => ({
    MergeCommitPayloadSchema: {
      safeParse: jest.fn(),
    },
  })
);

describe("POST /api/v1/{owner}/{repo}/pulls/{pull_number}/conflicts/commit-merge", () => {
  let mockRequest: Request;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  const mockRequestBody = {
    mergeCommitData: {
      owner: "test-owner",
      repo: "test-repo",
      targetMergeSha: "base-sha",
      targetBranch: "main",
      featureBranch: "feature-branch",
    },
    mergeContent: [
      { filename: "src/index.ts", content: "resolved text" },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Spies to keep test output clean from intentional errors/logs
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    mockRequest = new Request(
      "http://localhost:3000/api/v1/test-owner/test-repo/pulls/1/conflicts/commit-merge",
      {
        method: "POST",
        body: JSON.stringify(mockRequestBody),
        headers: { "Content-Type": "application/json" },
      }
    );

    // Default successful Zod parsing
    jest.mocked(MergeCommitPayloadSchema.safeParse).mockReturnValue({
      success: true,
      data: mockRequestBody,
    } as any);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("Authentication", () => {
    it("should return 401 when token is null", async () => {
      jest.mocked(getToken).mockResolvedValue(null);

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      
      // Verify it used the correct cookie key (authjs.session-token for test/dev environment)
      expect(jest.mocked(getToken)).toHaveBeenCalledWith({
        req: mockRequest,
        secret: process.env.AUTH_SECRET,
        cookieName: "authjs.session-token", 
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Unauthorized request"));
    });

    it("should return 401 when accessToken is null", async () => {
      const mockToken: JWT = { 
        githubId: "12345", 
        githubLogin: "testuser",
        accessToken: null as any 
      };
      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await POST(mockRequest);
      expect(response.status).toBe(401);
    });

    it("should return 401 when githubId is null", async () => {
      const mockToken: JWT = { 
        accessToken: "valid-token", 
        githubLogin: "testuser",
        githubId: null 
      };
      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await POST(mockRequest);
      expect(response.status).toBe(401);
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue({
        accessToken: "valid-token",
        githubId: "12345",
        githubLogin: "testuser",
      });
    });

    it("should return 400 when body validation fails", async () => {
      // Mock Zod failing
      jest.mocked(MergeCommitPayloadSchema.safeParse).mockReturnValue({
        success: false,
        error: { issues: [{ message: "Invalid payload" }] },
      } as any);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.issues[0].message).toBe("Invalid payload");
      
      // Ensure we didn't proceed to commit logic
      expect(commitMergeChanges).not.toHaveBeenCalled();
    });
  });

  describe("Successful Requests", () => {
    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue({
        accessToken: "valid-token",
        githubId: "12345",
        githubLogin: "testuser",
      });
    });

    it("should process the merge, call commitMergeChanges, and return 200", async () => {
      jest.mocked(commitMergeChanges).mockResolvedValue(true);

      const response = await POST(mockRequest);

      // Verify Octokit was instantiated with the user's token
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({ auth: "valid-token" });

      // Verify core logic was called with the right destructured arguments
      expect(commitMergeChanges).toHaveBeenCalledWith(
        mockRequestBody.mergeCommitData,
        mockRequestBody.mergeContent,
        expect.any(Object) // The Octokit instance
      );

      // Verify response
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBe(true);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue({
        accessToken: "valid-token",
        githubId: "12345",
        githubLogin: "testuser",
      });
    });

    it("should return 500 when commitMergeChanges throws an error", async () => {
      const mockError = new Error("GitHub API rate limit exceeded");
      jest.mocked(commitMergeChanges).mockRejectedValue(mockError);

      const response = await POST(mockRequest);
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).toBe("Server error");

      // Verify the error was logged internally
      expect(consoleErrorSpy).toHaveBeenCalledWith("Merge commit failed:", mockError);
    });
  });
});