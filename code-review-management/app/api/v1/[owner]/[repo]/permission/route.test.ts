/*
UNIT TESTS
/api/v1/{owner}/{repo}/permission
*/

import { GET } from "./route";
import { Octokit } from "octokit";
import { getToken, JWT } from "next-auth/jwt";
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
      getCollaboratorPermissionLevel: jest.Mock;
    };
  };
}

describe("GET /api/v1/{owner}/{repo}/permission", () => {
  const mockPermission = {
    permission: "admin",
    role_name: "admin",
    user: getDefaultUser(),
    extraField: "blah",
  };

  const mockPermissionWithoutExtraField = {
    permission: "admin",
    role_name: "admin",
    user: getDefaultUser(),
  };

  const mockContext = {
    owner: "mock-owner",
    repo: "mock-repo",
  };

  const mockOctokitInstance: MockOctokitInstance = {
    rest: {
      repos: {
        getCollaboratorPermissionLevel: jest.fn(),
      },
    },
  };

  let mockRequest: Request;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = new Request(
      "http://localhost:3000/api/v1/mock-owner/mock-repo/permission",
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
          setTimeout(() => resolve(mockContext), 0);
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
          setTimeout(() => resolve(mockContext), 0);
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
          setTimeout(() => resolve(mockContext), 0);
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
          setTimeout(() => resolve(mockContext), 0);
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
          setTimeout(() => resolve(mockContext), 0);
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

    it("should return 200 with permission when authenticated", async () => {
      mockOctokitInstance.rest.repos.getCollaboratorPermissionLevel.mockResolvedValue(
        {
          data: mockPermissionWithoutExtraField,
        },
      );

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(() => resolve(mockContext), 0);
        }),
      });

      expect(response.status).toBe(200);
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({
        auth: "valid-token",
      });
      expect(
        mockOctokitInstance.rest.repos.getCollaboratorPermissionLevel,
      ).toHaveBeenCalledWith({
        owner: mockContext.owner,
        repo: mockContext.repo,
        username: "testuser",
      });

      const data: unknown = await response.json();
      expect(data).not.toBeNull();
      expect(typeof data).toBe("object");
    });

    it("should filter permission using CollaboratorPermsSchema", async () => {
      mockOctokitInstance.rest.repos.getCollaboratorPermissionLevel.mockResolvedValue(
        {
          data: mockPermission,
        },
      );

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(() => resolve(mockContext), 0);
        }),
      });

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).not.toHaveProperty("extraField");
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
      const mockInvalidPermission = {
        // Invalid data that will fail CollaboratorPermsSchema.parse
        permission: 123, // Should be string
        role_name: "admin",
        user: getDefaultUser(),
      };

      mockOctokitInstance.rest.repos.getCollaboratorPermissionLevel.mockResolvedValue(
        {
          data: mockInvalidPermission,
        },
      );

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(() => resolve(mockContext), 0);
        }),
      });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });

    it("should return 500 for unknown errors", async () => {
      mockOctokitInstance.rest.repos.getCollaboratorPermissionLevel.mockRejectedValue(
        new Error("Unknown error"),
      );

      const response = await GET(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
        }>((resolve) => {
          setTimeout(() => resolve(mockContext), 0);
        }),
      });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });
  });
});
