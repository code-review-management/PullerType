/*
UNIT TESTS
/api/v1/{owner}/{repo}/commit/{ref}/diff
*/

import { GET } from "./route";
import { Octokit } from "octokit";
import { getToken, JWT } from "next-auth/jwt";

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
      getCommit: jest.Mock;
    };
  };
}

describe("GET /api/v1/{owner}/{repo}/commit/{ref}/diff", () => {
  const mockContext = { owner: "mock-owner", repo: "mock-repo", ref: "abc123" };
  const mockOctokitInstance: MockOctokitInstance = {
    rest: { repos: { getCommit: jest.fn() } },
  };
  let mockRequest: Request;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new Request("http://localhost:3000/api/v1/mock-owner/mock-repo/commit/abc123/diff");
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

    it("should return 200 with commit diff when authenticated", async () => {
      mockOctokitInstance.rest.repos.getCommit.mockResolvedValue({
        data: "diff content",
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve(mockContext),
      });

      expect(response.status).toBe(200);
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({
        auth: "valid-token",
      });
      expect(mockOctokitInstance.rest.repos.getCommit).toHaveBeenCalledWith({
        owner: "mock-owner",
        repo: "mock-repo",
        ref: "abc123",
        mediaType: { format: "diff" },
      });

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

    it("should return 500 for unknown errors", async () => {
      mockOctokitInstance.rest.repos.getCommit.mockRejectedValue(
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
