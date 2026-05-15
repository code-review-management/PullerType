import { POST } from "./route";
import { getToken, JWT } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";
import { updateGeminiComment } from "@/lib/api/gemini/geminiCommentor";
import { SuggestionCommitRequestShema } from "@/types/request.types";
import { PullRequestSchema, GitHubFileDataSchema } from "@/types/github.types";

// Mock next-auth/jwt
jest.mock("next-auth/jwt", () => ({
    getToken: jest.fn(),
}));

// Mock Commentor
jest.mock("@/lib/api/gemini/geminiCommentor", () => ({
    updateGeminiComment: jest.fn(),
}));

// Mock local utilities
jest.mock("@/app/api/_utils/cookie-utils", () => ({
    getCookieName: jest.fn(() => "authjs.session-token"),
}));

// Mock Zod schemas
jest.mock("@/types/request.types", () => ({
    SuggestionCommitRequestShema: {
        safeParse: jest.fn(),
    },
}));

jest.mock("@/types/github.types", () => ({
    PullRequestSchema: {
        parse: jest.fn(),
    },
    GitHubFileDataSchema: {
        parse: jest.fn(),
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

        constructor(
            message: string,
            status: number,
            options: { request: MockRequestOptions }
        ) {
            super(message);
            this.status = status;
            this.name = "RequestError";
            this.request = options.request;
        }
    },
    Octokit: jest.fn(),
}));

// Define types for our mocks
interface MockOctokitInstance {
    rest: {
        pulls: {
            get: jest.Mock;
        };
        repos: {
            getContent: jest.Mock;
            createOrUpdateFileContents: jest.Mock;
        };
    };
}

type RouteContext = {
    params: Promise<{
        owner: string;
        repo: string;
        pull_number: number;
    }>;
};

describe("POST /api/v1/{owner}/{repo}/pulls/{pull_number}/suggest/commit", () => {
    let mockRequest: Request;
    let mockContext: RouteContext;
    let mockOctokitInstance: MockOctokitInstance;

    const mockSuggestionData = {
        githubCommentId: 12345,
        deletionContent: "- const old = true;",
        additionContent: "+ const new = true;",
        relativeLineLocation: 5,
    };

    const mockRequestBody = {
        filename: "src/index.ts",
        content: "const new = true;",
        suggestionData: mockSuggestionData,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.AUTH_SECRET = "test-secret";

        mockRequest = new Request(
            "http://localhost:3000/api/v1/test-owner/test-repo/pulls/1/suggest/commit",
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
                pull_number: 1,
            }),
        };

        mockOctokitInstance = {
            rest: {
                pulls: {
                    get: jest.fn(),
                },
                repos: {
                    getContent: jest.fn(),
                    createOrUpdateFileContents: jest.fn(),
                },
            },
        };

        jest
            .mocked(Octokit)
            .mockImplementation(() => mockOctokitInstance as unknown as Octokit);

        // Default successful schema mock
        jest.mocked(SuggestionCommitRequestShema.safeParse).mockReturnValue({
            success: true,
            data: mockRequestBody,
        } as unknown as ReturnType<typeof SuggestionCommitRequestShema.safeParse>);
    });

    describe("Authentication", () => {
        it("should return 401 when token is null", async () => {
            jest.mocked(getToken).mockResolvedValue(null);

            const response = await POST(mockRequest, mockContext);

            expect(response.status).toBe(401);
            expect(jest.mocked(getToken)).toHaveBeenCalledWith({
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

        it("should return 400 when owner or repo is missing", async () => {
            const badContext: RouteContext = {
                params: Promise.resolve({
                    owner: "", // Missing owner
                    repo: "test-repo",
                    pull_number: 1,
                }),
            };

            const response = await POST(mockRequest, badContext);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Missing required parameters");
        });

        it("should return 400 when request schema parsing fails", async () => {
            jest.mocked(SuggestionCommitRequestShema.safeParse).mockReturnValue({
                success: false,
                error: new Error("Invalid Body"),
            } as unknown as ReturnType<typeof SuggestionCommitRequestShema.safeParse>);

            const response = await POST(mockRequest, mockContext);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Missing required parameters");
        });

        it("should return 400 when there is no SHA at PR head", async () => {
            mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: {} });
            jest.mocked(PullRequestSchema.parse).mockReturnValue({
                head: { ref: "feature-branch" },
            } as unknown as ReturnType<typeof PullRequestSchema.parse>);

            mockOctokitInstance.rest.repos.getContent.mockResolvedValue({ data: {} });
            jest.mocked(GitHubFileDataSchema.parse).mockReturnValue({
                sha: undefined, // Simulating missing SHA
            } as unknown as ReturnType<typeof GitHubFileDataSchema.parse>);

            const response = await POST(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(400);
            expect(text).toBe("No SHA at PR head");
        });
    });

    describe("Successful requests", () => {
        const validSha = "6dcb09b5b57875f334f61aebed695e2e4193db5e";
        const branchName = "feature-update";

        beforeEach(() => {
            const mockToken: JWT = {
                accessToken: "valid-token",
                githubId: "12345",
                githubLogin: "testuser",
            };
            jest.mocked(getToken).mockResolvedValue(mockToken);

            // Setup common successful PR & File responses
            mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: {} });
            jest.mocked(PullRequestSchema.parse).mockReturnValue({
                head: { ref: branchName },
            } as unknown as ReturnType<typeof PullRequestSchema.parse>);

            mockOctokitInstance.rest.repos.getContent.mockResolvedValue({ data: {} });
            mockOctokitInstance.rest.repos.createOrUpdateFileContents.mockResolvedValue({});

            // Replaced 'any' with a strictly-typed null assertion
            jest.mocked(updateGeminiComment).mockResolvedValue(
                null as unknown as Awaited<ReturnType<typeof updateGeminiComment>>
            );
        });

        it("should return 200 and execute commit & update simultaneously (Object SHA)", async () => {
            // Mock File schema returning a single object
            jest.mocked(GitHubFileDataSchema.parse).mockReturnValue({
                sha: validSha,
            } as unknown as ReturnType<typeof GitHubFileDataSchema.parse>);

            const response = await POST(mockRequest, mockContext);

            // 1. Verify PR was fetched to get branch
            expect(mockOctokitInstance.rest.pulls.get).toHaveBeenCalledWith({
                owner: "test-owner",
                repo: "test-repo",
                pull_number: 1,
            });

            // 2. Verify File was fetched to get SHA
            expect(mockOctokitInstance.rest.repos.getContent).toHaveBeenCalledWith({
                owner: "test-owner",
                repo: "test-repo",
                path: "src/index.ts",
                ref: branchName,
            });

            // 3. Verify Promise.all parallel calls (Commit)
            expect(mockOctokitInstance.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
                owner: "test-owner",
                repo: "test-repo",
                path: "src/index.ts",
                message: "Commiting suggestion",
                content: Buffer.from("const new = true;").toString("base64"), // Base64 encoded
                sha: validSha,
                branch: branchName,
            });

            // 4. Verify Promise.all parallel calls (Comment Update with flag = true)
            expect(jest.mocked(updateGeminiComment)).toHaveBeenCalledWith(
                expect.any(Object),  // octokit instance
                "test-owner",
                "test-repo",
                mockSuggestionData,
                true                 // The commit flag
            );

            // Verify Response
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toEqual({ message: "Success" });
        });

        it("should extract SHA correctly if GitHubFileDataSchema returns an array (directory)", async () => {
            // Mock File schema returning an array (which can happen if path points to a dir)
            jest.mocked(GitHubFileDataSchema.parse).mockReturnValue([
                { sha: "array-sha-123" },
            ] as unknown as ReturnType<typeof GitHubFileDataSchema.parse>);

            const response = await POST(mockRequest, mockContext);

            expect(mockOctokitInstance.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
                expect.objectContaining({
                    sha: "array-sha-123",
                })
            );

            expect(response.status).toBe(200);
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
            const mockError = new RequestError("Conflict", 409, {
                request: { method: "POST", url: "https://api.github.com", headers: {} },
            });

            // Reject the initial PR fetch to trigger error early
            mockOctokitInstance.rest.pulls.get.mockRejectedValue(mockError);

            const response = await POST(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(409);
            expect(text).toBe("Conflict");
        });

        it("should return 500 for schema parsing errors", async () => {
            mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: {} });
            jest.mocked(PullRequestSchema.parse).mockImplementation(() => {
                throw new Error("Zod parsing error");
            });

            const response = await POST(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(text).toContain("Server error: Error: Zod parsing error");
        });

        it("should return 500 for generic unknown errors during parallel execution", async () => {
            mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: {} });
            jest.mocked(PullRequestSchema.parse).mockReturnValue({
                head: { ref: "main" },
            } as unknown as ReturnType<typeof PullRequestSchema.parse>);

            mockOctokitInstance.rest.repos.getContent.mockResolvedValue({ data: {} });
            jest.mocked(GitHubFileDataSchema.parse).mockReturnValue({
                sha: "valid-sha",
            } as unknown as ReturnType<typeof GitHubFileDataSchema.parse>);

            // Simulate a failure in one of the Promise.all calls
            mockOctokitInstance.rest.repos.createOrUpdateFileContents.mockRejectedValue(
                new Error("Git push failed")
            );

            const response = await POST(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(text).toContain("Server error: Error: Git push failed");
        });
    });
});