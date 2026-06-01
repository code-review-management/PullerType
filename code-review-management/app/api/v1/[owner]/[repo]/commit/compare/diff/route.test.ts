/*
UNIT TESTS
/api/v1/{owner}/{repo}/commit/compare/diff
*/

import { GET } from "./route";
import { Octokit } from "octokit";
import { getToken, JWT } from "next-auth/jwt";
import { getDefaultUser } from "@/mocks/tests/users";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("octokit", () => ({
  RequestError: jest.fn(),
  Octokit: jest.fn(),
}));

interface MockOctokitInstance {
  rest: {
    repos: {
      compareCommitsWithBasehead: jest.Mock;
    };
  };
}

describe("GET /api/v1/{owner}/{repo}/commit/compare/diff", () => {
  const mockCompare = {
    base_commit: {
      url: "",
      sha: "base-sha",
      html_url: "",
      commit: { message: "", author: { date: "", email: "", name: "" }, committer: { date: "", email: "", name: "" } },
      author: getDefaultUser(),
      committer: getDefaultUser(),
    },
    merge_base_commit: {
      url: "",
      sha: "merge-base",
      html_url: "",
      commit: { message: "", author: { date: "", email: "", name: "" }, committer: { date: "", email: "", name: "" } },
      author: getDefaultUser(),
      committer: getDefaultUser(),
    },
    html_url: "",
    status: "ahead",
    ahead_by: 1,
    behind_by: 0,
    total_commits: 1,
    files: [],
  };
  const mockOctokitInstance: MockOctokitInstance = {
    rest: { repos: { compareCommitsWithBasehead: jest.fn() } },
  };
  const mockRequest = new Request(
    "http://localhost:3000/api/v1/mock-owner/mock-repo/commit/compare/diff?base=main&head=feature",
  );
  const mockContext = { owner: "mock-owner", repo: "mock-repo" };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Octokit).mockImplementation(() => mockOctokitInstance as unknown as Octokit);
  });

  describe("Authentication", () => {
    it("should return 401 when token is null", async () => {
      jest.mocked(getToken).mockResolvedValue(null);

      const response = await GET(mockRequest, {
        params: Promise.resolve(mockContext),
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
        params: Promise.resolve(mockContext),
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
        params: Promise.resolve(mockContext),
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
        params: Promise.resolve(mockContext),
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
        params: Promise.resolve(mockContext),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Successful requests", () => {
    beforeEach(() => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubId: "12345",
        githubLogin: "testuser",
        expiresAt: Date.now() + 3600000,
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);
    });

    it("should return 200 with compare diff when authenticated", async () => {
      mockOctokitInstance.rest.repos.compareCommitsWithBasehead.mockResolvedValueOnce({
        data: mockCompare,
      });
      mockOctokitInstance.rest.repos.compareCommitsWithBasehead.mockResolvedValueOnce({
        data: "diff data",
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve(mockContext),
      });

      expect(response.status).toBe(200);
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({
        auth: "valid-token",
      });
      expect(mockOctokitInstance.rest.repos.compareCommitsWithBasehead).toHaveBeenCalledTimes(2);
      expect(mockOctokitInstance.rest.repos.compareCommitsWithBasehead).toHaveBeenNthCalledWith(
        1,
        {
          owner: "mock-owner",
          repo: "mock-repo",
          basehead: "main...feature",
        },
      );
      expect(mockOctokitInstance.rest.repos.compareCommitsWithBasehead).toHaveBeenNthCalledWith(
        2,
        {
          owner: "mock-owner",
          repo: "mock-repo",
          basehead: "merge-base...feature",
          mediaType: {
            format: "diff",
          },
        },
      );

      const data: unknown = await response.json();
      expect(typeof data).toBe("string");
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
      mockOctokitInstance.rest.repos.compareCommitsWithBasehead.mockResolvedValueOnce({
        data: { invalid: "payload" },
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve(mockContext),
      });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });

    it("should return 500 for unknown errors", async () => {
      mockOctokitInstance.rest.repos.compareCommitsWithBasehead.mockRejectedValue(
        new Error("Unknown error"),
      );

      const response = await GET(mockRequest, {
        params: Promise.resolve(mockContext),
      });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });
  });
});
