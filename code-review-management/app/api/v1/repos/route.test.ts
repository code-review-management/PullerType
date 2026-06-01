/*
UNIT TESTS
/api/v1/repos
*/

import { GET } from "./route";
import { Octokit } from "octokit";
import { getToken, JWT } from "next-auth/jwt";
import { getDefaultRepo } from "@/mocks/tests/repos";
import { getDefaultUser } from "@/mocks/tests/users";

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
    repos: {
      listForAuthenticatedUser: jest.Mock;
    };
  };
}

describe("GET /api/v1/repos", () => {
  const mockRepos = [getDefaultRepo()];
  const mockOctokitInstance: MockOctokitInstance = {
    rest: {
      repos: {
        listForAuthenticatedUser: jest.fn(),
      },
    },
  };
  let mockRequest: Request;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = new Request("http://localhost:3000/api/v1/repos");
    jest
      .mocked(Octokit)
      .mockImplementation(() => mockOctokitInstance as unknown as Octokit);
  });

  describe("Authentication", () => {
    it("should return 401 when token is null", async () => {
      jest.mocked(getToken).mockResolvedValue(null);

      const response = await GET(mockRequest);

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

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
    });

    it("should return 401 when accessToken is null", async () => {
      const mockToken: JWT = {
        accessToken: undefined,
        githubId: "12345",
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
    });

    it("should return 401 when githubId is null", async () => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubId: null,
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
    });

    it("should return 401 when githubId is undefined", async () => {
      const mockToken: JWT = {
        accessToken: "valid-token",
        githubLogin: "testuser",
      };

      jest.mocked(getToken).mockResolvedValue(mockToken);

      const response = await GET(mockRequest);

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

    it("should return 200 with repos when authenticated", async () => {
      mockOctokitInstance.rest.repos.listForAuthenticatedUser.mockResolvedValue(
        {
          data: mockRepos,
        },
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({
        auth: "valid-token",
      });
      expect(
        mockOctokitInstance.rest.repos.listForAuthenticatedUser,
      ).toHaveBeenCalled();

      const data: unknown = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should filter repos using RepoSchema", async () => {
      mockOctokitInstance.rest.repos.listForAuthenticatedUser.mockResolvedValue(
        {
          data: [
            {
              id: 0,
              name: "",
              full_name: "",
              owner: getDefaultUser(),
              html_url: "",
              description: "",
              created_at: "",
              updated_at: "",
              pushed_at: "",
              stargazers_count: 0,
              watchers_count: 0,
              open_issues_count: 0,
              has_pull_requests: true,
              visibility: "public",
              extraField: "blah",
            },
          ],
        },
      );

      const response = await GET(mockRequest);
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
          // Invalid data that will fail RepoSchema.parse
          id: "invalid-id", // Should be number
        },
      ];

      mockOctokitInstance.rest.repos.listForAuthenticatedUser.mockResolvedValue(
        {
          data: mockRepos,
        },
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });

    it("should return 500 for unknown errors", async () => {
      mockOctokitInstance.rest.repos.listForAuthenticatedUser.mockRejectedValue(
        new Error("Unknown error"),
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });
  });
});
