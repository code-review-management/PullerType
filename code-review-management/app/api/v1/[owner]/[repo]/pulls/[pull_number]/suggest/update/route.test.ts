import { POST } from "./route";
import { getToken, JWT } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";
import { updateGeminiComment } from "@/lib/api/gemini/geminiCommentor";
import { SuggestionCommentUpdateRequestSchema } from "@/types/request.types";

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
    SuggestionCommentUpdateRequestSchema: {
        safeParse: jest.fn(),
    },
}));

// Mock zod treeifyError but keep actual Zod objects working if needed
jest.mock("zod", () => {
    const actualZod = jest.requireActual("zod");
    return {
        ...actualZod,
        treeifyError: jest.fn(() => "mocked-treeify-error"),
    };
});

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

type RouteContext = {
    params: Promise<{
        owner: string;
        repo: string;
        pull_number: string;
    }>;
};

describe("POST /api/v1/{owner}/{repo}/pulls/{pull_number}/suggest/update", () => {
    let mockRequest: Request;
    let mockContext: RouteContext;

    // Body matches the expected Zod Schema
    const mockRequestBody = {
        githubCommentId: 12345,
        deletionContent: "- const old = true;",
        additionContent: "+ const new = true;",
        relativeLineLocation: 5,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequest = new Request(
            "http://localhost:3000/api/v1/test-owner/test-repo/pulls/1/suggest/update",
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
        jest.mocked(SuggestionCommentUpdateRequestSchema.safeParse).mockReturnValue({
            success: true,
            data: mockRequestBody,
        } as unknown as ReturnType<typeof SuggestionCommentUpdateRequestSchema.safeParse>);
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

        it("should return 400 with treeified error details when schema parsing fails", async () => {
            // Mocking a failure from the zod schema parser
            jest.mocked(SuggestionCommentUpdateRequestSchema.safeParse).mockReturnValue({
                success: false,
                error: new Error("Mock Zod Error"),
            } as unknown as ReturnType<typeof SuggestionCommentUpdateRequestSchema.safeParse>);

            const response = await POST(mockRequest, mockContext);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Invalid query parameters");
            expect(data.details).toBe("mocked-treeify-error"); // Comes from our zod treeifyError mock
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

        it("should return 200 and the updated GitHub comment", async () => {
            // Use 'as unknown as Awaited<ReturnType<typeof updateGeminiComment>>' 
            // to bypass the strict type requirements for this mock data
            const mockGithubComment = {
                id: 12345,
                body: "Updated comment body",
                url: "https://api.github.com/comments/12345",
            } as unknown as Awaited<ReturnType<typeof updateGeminiComment>>;

            jest.mocked(updateGeminiComment).mockResolvedValue(mockGithubComment);

            const response = await POST(mockRequest, mockContext);

            // Verify Octokit instantiation and Commentor call
            expect(jest.mocked(Octokit)).toHaveBeenCalledWith({ auth: "valid-token" });
            expect(jest.mocked(updateGeminiComment)).toHaveBeenCalledWith(
                expect.any(Object), // octokit instance
                "test-owner",       // owner
                "test-repo",        // repo
                mockRequestBody     // suggestionUpdateData
            );

            // Verify Response
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toEqual({
                id: 12345,
                body: "Updated comment body",
                url: "https://api.github.com/comments/12345",
            });
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

        it("should return 500 when updateGeminiComment returns null", async () => {
            // Testing the explicit null check inside the try block
            jest.mocked(updateGeminiComment).mockResolvedValue(null);

            const response = await POST(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(text).toContain(
                "Server error: Error: Error occured in update function, it returned null"
            );
        });

        it("should handle Octokit RequestError and return its status", async () => {
            const mockError = new RequestError("Validation Failed", 422, {
                request: { method: "POST", url: "https://api.github.com", headers: {} },
            });

            jest.mocked(updateGeminiComment).mockRejectedValue(mockError);

            const response = await POST(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(422);
            expect(text).toBe("Validation Failed");
        });

        it("should return 500 for generic unknown errors thrown during update", async () => {
            jest.mocked(updateGeminiComment).mockRejectedValue(new Error("Database connection lost"));

            const response = await POST(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(text).toContain("Server error: Error: Database connection lost");
        });
    });
});