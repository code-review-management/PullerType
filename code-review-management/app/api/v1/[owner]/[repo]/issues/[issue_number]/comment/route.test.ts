/*
UNIT TESTS
/api/v1/{owner}/{repo}/issues/{issue_number}/comment
*/

import { POST } from "./route";
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
    issues: {
      createComment: jest.Mock;
    };
  };
}

describe("POST /api/v1/{owner}/{repo}/issues/{issue_number}/comment", () => {
  const mockIssueComment = {
    id: 0,
    body: "test comment",
    user: getDefaultUser(),
    created_at: "",
    updated_at: "",
    author_association: "CONTRIBUTOR",
    extraField: "blah",
  };

  const mockIssueCommentWithoutExtraField = {
    id: 0,
    body: "test comment",
    user: getDefaultUser(),
    created_at: "",
    updated_at: "",
    author_association: "CONTRIBUTOR",
  };

  const mockRequestBody = {
    body: "test comment",
  };

  const mockContext = {
    owner: "mock-owner",
    repo: "mock-repo",
    issue_number: "123",
  };

  const mockOctokitInstance: MockOctokitInstance = {
    rest: {
      issues: {
        createComment: jest.fn(),
      },
    },
  };

  let mockRequest: Request;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = new Request(
      "http://localhost:3000/api/v1/mock-owner/mock-repo/issues/123/comment",
      {
        method: "POST",
        body: JSON.stringify(mockRequestBody),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    jest
      .mocked(Octokit)
      .mockImplementation(() => mockOctokitInstance as unknown as Octokit);
  });

  describe("Authentication", () => {
    it("should return 401 when token is null", async () => {
      jest.mocked(getToken).mockResolvedValue(null);

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
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

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
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

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
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

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
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

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
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

    it("should return 200 with comment when authenticated", async () => {
      mockOctokitInstance.rest.issues.createComment.mockResolvedValue({
        data: mockIssueCommentWithoutExtraField,
      });

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
        }>((resolve) => {
          setTimeout(() => resolve(mockContext), 0);
        }),
      });

      expect(response.status).toBe(200);
      expect(jest.mocked(Octokit)).toHaveBeenCalledWith({
        auth: "valid-token",
      });
      expect(
        mockOctokitInstance.rest.issues.createComment,
      ).toHaveBeenCalledWith({
        owner: mockContext.owner,
        repo: mockContext.repo,
        issue_number: Number(mockContext.issue_number),
        body: mockRequestBody.body,
      });

      const data: unknown = await response.json();
      expect(data).not.toBeNull();
      expect(typeof data).toBe("object");
    });

    it("should filter comment using IssueCommentSchema", async () => {
      mockOctokitInstance.rest.issues.createComment.mockResolvedValue({
        data: mockIssueComment,
      });

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
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
      const mockInvalidIssueComment = {
        // Invalid data that will fail IssueCommentSchema.parse
        id: "invalid-id", // Should be number
        user: getDefaultUser(),
        created_at: "",
        updated_at: "",
        author_association: "CONTRIBUTOR",
      };

      mockOctokitInstance.rest.issues.createComment.mockResolvedValue({
        data: mockInvalidIssueComment,
      });

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
        }>((resolve) => {
          setTimeout(() => resolve(mockContext), 0);
        }),
      });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Server error");
    });

    it("should return 500 for unknown errors", async () => {
      mockOctokitInstance.rest.issues.createComment.mockRejectedValue(
        new Error("Unknown error"),
      );

      const response = await POST(mockRequest, {
        params: new Promise<{
          owner: string;
          repo: string;
          issue_number: string;
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

