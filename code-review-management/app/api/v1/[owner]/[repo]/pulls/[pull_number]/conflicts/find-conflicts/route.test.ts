import { GET } from "./route"; // Adjust path as needed
import { getToken, JWT } from "next-auth/jwt";
import { Octokit } from "octokit";
import { getMergeConflict } from "../_utils/merge-conflict-finder/get-merge";
import { AllowanceError } from "../_utils/merge-conflict-finder/detect-modified";
import { TargetFeatureParamsSchema } from "../_utils/merge-github.types";

// --- Polyfills for Jest (Next.js Web APIs) ---
if (typeof global.Request === "undefined") {
  global.Request = class Request {
    url: string;
    method: string;
    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method || "GET";
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

jest.mock("../_utils/merge-conflict-finder/get-merge", () => ({
  getMergeConflict: jest.fn(),
}));

jest.mock("../_utils/merge-github.types", () => ({
  TargetFeatureParamsSchema: {
    safeParse: jest.fn(),
  },
}));

// Mock the custom AllowanceError so instanceof checks work
jest.mock("../_utils/merge-conflict-finder/detect-modified", () => {
  class MockAllowanceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AllowanceError";
    }
  }
  return {
    AllowanceError: MockAllowanceError,
  };
});

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    pull_number: string;
  }>;
};

describe("GET /api/v1/{owner}/{repo}/pulls/{pull_number}/conflicts/merge-conflict", () => {
  let mockRequest: Request;
  let mockContext: RouteContext;
  let consoleLogSpy: jest.SpyInstance;

  const validQueryParams = {
    target_branch: "main",
    feature_branch: "feature-branch",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Create a GET request with query parameters
    const url = new URL("http://localhost:3000/api/v1/test-owner/test-repo/pulls/1/conflicts/merge-conflict");
    url.searchParams.append("target_branch", "main");
    url.searchParams.append("feature_branch", "feature-branch");

    mockRequest = new Request(url.toString(), { method: "GET" });

    mockContext = {
      params: Promise.resolve({
        owner: "test-owner",
        repo: "test-repo",
        pull_number: "1",
      }),
    };

    // Default successful Zod mock
    jest.mocked(TargetFeatureParamsSchema.safeParse).mockReturnValue({
      success: true,
      data: validQueryParams,
    } as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("Authentication", () => {
    it("should return 401 when token is null", async () => {
      jest.mocked(getToken).mockResolvedValue(null);

      const response = await GET(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(jest.mocked(getToken)).toHaveBeenCalledWith({
        req: mockRequest,
        secret: process.env.AUTH_SECRET,
        cookieName: "authjs.session-token", // Standard dev fallback
      });
    });

    it("should return 401 when accessToken is null", async () => {
      const mockToken: JWT = { githubId: "123", githubLogin: "testuser", accessToken: null as any };
      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest, mockContext);
      expect(response.status).toBe(401);
    });

    it("should return 401 when githubId is null", async () => {
      const mockToken: JWT = { accessToken: "valid", githubLogin: "testuser", githubId: null };
      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest, mockContext);
      expect(response.status).toBe(401);
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue({
        accessToken: "valid-token",
        githubId: "123",
        githubLogin: "testuser",
      });
    });

    it("should return 400 when query parameter validation fails", async () => {
      jest.mocked(TargetFeatureParamsSchema.safeParse).mockReturnValue({
        success: false,
        error: { format: () => "Invalid query details" },
      } as any);

      const response = await GET(mockRequest, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid query parameters");
      expect(data.details).toBe("Invalid query details");
    });

    it("should return 406 when owner or repo is missing from context", async () => {
      const badContext: RouteContext = {
        params: Promise.resolve({
          owner: "", // Falsy owner
          repo: "test-repo",
          pull_number: "1",
        }),
      };

      const response = await GET(mockRequest, badContext);
      const data = await response.json();

      expect(response.status).toBe(406);
      expect(data.error).toBe("Missing required parameters");
      expect(consoleLogSpy).toHaveBeenCalledWith("Missing params!");
    });
  });

  describe("Successful Requests", () => {
    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue({
        accessToken: "valid-token",
        githubId: "123",
        githubLogin: "testuser",
      });
    });

    it("should fetch merge conflicts and return 200", async () => {
      const mockMergeResult = { targetShaAtMerge: "sha123", mergedFiles: [] };
      jest.mocked(getMergeConflict).mockResolvedValue(mockMergeResult);

      const response = await GET(mockRequest, mockContext);

      // Verify Octokit initialization
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({ auth: "valid-token" });

      // Verify getMergeConflict was called with the correct mapped parameters
      expect(getMergeConflict).toHaveBeenCalledWith(
        {
          owner: "test-owner",
          repo: "test-repo",
          targetBranch: "main",
          featureBranch: "feature-branch",
        },
        expect.any(Object) // Octokit instance
      );

      // Verify response
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const data = await response.json();
      expect(data).toEqual(mockMergeResult);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue({
        accessToken: "valid-token",
        githubId: "123",
        githubLogin: "testuser",
      });
    });

    it("should return 403 when getMergeConflict throws an AllowanceError", async () => {
      const allowanceErr = new AllowanceError("Out of tokens");
      jest.mocked(getMergeConflict).mockRejectedValue(allowanceErr);

      const response = await GET(mockRequest, mockContext);
      const text = await response.text();

      expect(response.status).toBe(403);
      expect(text).toBe("Not enough tokens");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Error in merge conflict finder:"));
    });

    it("should return 500 when getMergeConflict throws a generic error", async () => {
      const genericErr = new Error("GitHub API timeout");
      jest.mocked(getMergeConflict).mockRejectedValue(genericErr);

      const response = await GET(mockRequest, mockContext);
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).toBe("Server error");
    });
  });
});