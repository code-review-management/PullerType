/*
UNIT TESTS
/api/v1/{owner}/{repo}/pulls
*/

import { GET } from "./route";
import { Octokit } from "octokit";
import { getToken, JWT } from "next-auth/jwt";
import { getDefaultUser } from "@/mocks/tests/users";
import { getDefaultPull } from "@/mocks/tests/pulls";
import { getDefaultBranch } from "@/mocks/tests/branches";

// Mock next-auth/jwt
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

// Mock octokit
jest.mock("octokit", () => ({
  RequestError: jest.fn(), // Added this to avoid undefined error
  Octokit: jest.fn(), // Mocked in the beforeEach()
}));

// Define types for our mocks
interface MockOctokitInstance {
  rest: {
    pulls: {
      list: jest.Mock;
    };
  };
}

describe("GET /api/v1/{owner}/{repo}/pulls", () => {
  const mockPullRequests = [getDefaultPull()];
  const mockOctokitInstance: MockOctokitInstance = {
    rest: {
      pulls: {
        list: jest.fn(),
      },
    },
  };
  let mockRequest: Request;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = new Request(
      "http://localhost:3000/api/v1/mock-owner/mock-repo/pulls",
    );
    jest
      .mocked(Octokit)
      .mockImplementation(() => mockOctokitInstance as unknown as Octokit);
  });

  describe("Authentication", () => {
    it("should return 401 when token is null", async () => {
      jest.mocked(getToken).mockResolvedValue(null);

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      expect(response.status).toBe(401);
      expect(getToken).toHaveBeenCalledWith({
        req: mockRequest,
        secret: undefined,
        cookieName: "authjs.session-token",
      });
    });

    it("should return 401 when accessToken is undefined", async () => {
      const mockToken: JWT = {
        githubId: "12345",
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 when accessToken is null", async () => {
      const mockToken: JWT = {
        accessToken: undefined,
        githubId: "12345",
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 when githubId is null", async () => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubId: null,
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 when githubId is undefined", async () => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Successful requests", () => {
    beforeEach(() => {
      // Mock valid token
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubId: "12345",
        githubLogin: "testuser",
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);
    });

    it("should return 200 with pull requests when authenticated", async () => {
      mockOctokitInstance.rest.pulls.list.mockResolvedValue({
        data: mockPullRequests,
      });

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      expect(response.status).toBe(200);
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({
        auth: "valid-token",
      });
      expect(mockOctokitInstance.rest.pulls.list).toHaveBeenCalledWith({
        owner: "mock-owner",
        repo: "mock-repo",
      });

      const data: unknown = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should filter pull requests using PullRequestSchema", async () => {
      mockOctokitInstance.rest.pulls.list.mockResolvedValue({
        data: [
          {
            url: "",
            id: 0,
            html_url: "",
            number: 0,
            state: "open",
            locked: false,
            title: "",
            user: getDefaultUser(),
            body: "",
            created_at: "",
            updated_at: "",
            closed_at: null,
            merged_at: null,
            assignees: [],
            requested_reviewers: [],
            head: getDefaultBranch(),
            base: getDefaultBranch(),
            author_association: "CONTRIBUTOR",
            draft: false,
            assignee: null,
            extraField: "blah",
          },
        ],
      });

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      const data = (await response.json()) as Record<string, unknown>[];

      expect(data[0]).not.toHaveProperty("extraField");
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

    it("should return 500 for parsing errors", async () => {
      const mockRepos = [
        {
          // Invalid data that will fail PullRequestSchema.parse
          id: "invalid-id", // Should be number
        },
      ];

      mockOctokitInstance.rest.pulls.list.mockResolvedValue(
        {
          data: mockRepos,
        },
      );

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });

    it("should return 500 for unknown errors", async () => {
      mockOctokitInstance.rest.pulls.list.mockRejectedValue(
        new Error("Unknown error"),
      );

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(
            () => resolve({ owner: "mock-owner", repo: "mock-repo" }),
            0,
          );
        }),
      });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });
  });
});
