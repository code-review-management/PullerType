import { GET } from "./route";
import { getToken, JWT } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";
import { FileNameParamsSchema } from "@/types/request.types";
import { PullRequestSchema, FileContentSchema } from "@/types/github.types";

// Mock next-auth/jwt
jest.mock("next-auth/jwt", () => ({
    getToken: jest.fn(),
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

        constructor(message: string, status: number, options: { request: MockRequestOptions }) {
            super(message);
            this.status = status;
            this.name = "RequestError";
            this.request = options.request;
        }
    },
    Octokit: jest.fn(),
}));

// Mock local utilities
jest.mock("@/app/api/_utils/cookie-utils", () => ({
    getCookieName: jest.fn(() => "authjs.session-token"),
}));

// Mock Zod schemas
jest.mock("@/types/request.types", () => ({
    FileNameParamsSchema: {
        safeParse: jest.fn(),
    },
}));

jest.mock("@/types/github.types", () => ({
    PullRequestSchema: {
        parse: jest.fn(),
    },
    FileContentSchema: {
        parse: jest.fn(),
    },
}));

// Mock only treeifyError, keep the real ZodError class intact so `new ZodError()` works
jest.mock("zod", () => {
    const actualZod = jest.requireActual("zod");
    return {
        ...actualZod,
        treeifyError: jest.fn(() => "mocked-zod-error"),
    };
});

// Define types for our mocks
interface MockOctokitInstance {
    rest: {
        pulls: {
            get: jest.Mock;
        };
        repos: {
            getContent: jest.Mock;
        };
    };
}

type RouteContext = {
    params: Promise<{
        owner: string;
        repo: string;
        pull_number: string;
    }>;
};

describe("GET /api/v1/{owner}/{repo}/pulls/{pull_number}/single-file-content", () => {
    let mockRequest: Request;
    let mockContext: RouteContext;

    const mockOctokitInstance: MockOctokitInstance = {
        rest: {
            pulls: {
                get: jest.fn(),
            },
            repos: {
                getContent: jest.fn(),
            },
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequest = new Request(
            "http://localhost:3000/api/v1/owner/repo/pulls/1/single-file-content?path=src/index.ts"
        );

        mockContext = {
            params: Promise.resolve({
                owner: "test-owner",
                repo: "test-repo",
                pull_number: "1",
            }),
        };

        jest
            .mocked(Octokit)
            .mockImplementation(() => mockOctokitInstance as unknown as Octokit);

        // Default successful schema mocks
        jest.mocked(FileNameParamsSchema.safeParse).mockReturnValue({
            success: true,
            data: "src/index.ts",
        });
    });

    describe("Authentication", () => {
        it("should return 401 when token is null", async () => {
            jest.mocked(getToken).mockResolvedValue(null);

            const response = await GET(mockRequest, mockContext);

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

            const response = await GET(mockRequest, mockContext);

            expect(response.status).toBe(401);
        });

        it("should return 401 when githubId is null", async () => {
            const mockToken: JWT = {
                accessToken: "valid-token",
                githubId: null,
                githubLogin: "testuser",
            };

            jest.mocked(getToken).mockResolvedValue(mockToken);

            const response = await GET(mockRequest, mockContext);

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

        it("should return 400 when path query parameter is invalid", async () => {
            const { ZodError } = jest.requireActual("zod");
            const mockZodError = new ZodError([
                {
                    code: "custom",
                    path: ["path"],
                    message: "Required",
                },
            ]);

            jest.mocked(FileNameParamsSchema.safeParse).mockReturnValue({
                success: false,
                error: mockZodError,
            } as ReturnType<typeof FileNameParamsSchema.safeParse>);

            const response = await GET(mockRequest, mockContext);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Invalid query parameters");
            expect(data.details).toBe("mocked-zod-error");
        });

        it("should return 400 when owner or repo is missing from params", async () => {
            const badContext: RouteContext = {
                params: Promise.resolve({
                    owner: "", // Missing owner
                    repo: "test-repo",
                    pull_number: "1",
                }),
            };

            const response = await GET(mockRequest, badContext);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe("Missing required parameters");
        });

        it("should return 400 when PR head has no SHA", async () => {
            mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: { id: 1 } });

            jest.mocked(PullRequestSchema.parse).mockReturnValue({
                id: 1,
                number: 1,
                state: "open",
                title: "Test PR",
                head: undefined,
            } as unknown as ReturnType<typeof PullRequestSchema.parse>);

            const response = await GET(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(400);
            expect(text).toBe("No SHA at PR head");
        });
    });

    describe("Successful requests", () => {
        const validSha = "6dcb09b5b57875f334f61aebed695e2e4193db5e";

        beforeEach(() => {
            const mockToken: JWT = {
                accessToken: "valid-token",
                githubId: "12345",
                githubLogin: "testuser",
            };
            jest.mocked(getToken).mockResolvedValue(mockToken);
        });

        it("should return 200 with decoded file content", async () => {
            mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: { id: 1 } });
            jest.mocked(PullRequestSchema.parse).mockReturnValue({
                id: 1,
                number: 1,
                head: {
                    sha: validSha,
                    ref: "main",
                    label: "test-owner:main",
                    repo: {
                        name: "test-repo",
                    },
                },
            } as unknown as ReturnType<typeof PullRequestSchema.parse>);

            const base64Content = Buffer.from("const x = 1;", "utf-8").toString(
                "base64"
            );
            const mockFileResponse = {
                type: "file",
                encoding: "base64",
                size: 12,
                name: "index.ts",
                path: "src/index.ts",
                content: base64Content,
                sha: validSha,
                url: "https://api.github.com/repos/test-owner/test-repo/contents/src/index.ts",
                git_url: "",
                html_url: "",
                download_url: "",
                _links: { git: "", self: "", html: "" },
            };

            mockOctokitInstance.rest.repos.getContent.mockResolvedValue({
                data: mockFileResponse,
            });

            jest.mocked(FileContentSchema.parse).mockReturnValue(
                mockFileResponse as unknown as ReturnType<
                    typeof FileContentSchema.parse
                >
            );

            const response = await GET(mockRequest, mockContext);

            expect(jest.mocked(Octokit)).toHaveBeenCalledWith({ auth: "valid-token" });
            expect(mockOctokitInstance.rest.pulls.get).toHaveBeenCalledWith({
                owner: "test-owner",
                repo: "test-repo",
                pull_number: 1,
            });
            expect(mockOctokitInstance.rest.repos.getContent).toHaveBeenCalledWith({
                owner: "test-owner",
                repo: "test-repo",
                path: "src/index.ts",
                ref: validSha,
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toBe("const x = 1;");
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
            // Because we strictly defined this class in the factory mock, `instanceof` works natively
            const mockError = new RequestError("Not Found", 404, {
                request: { method: "GET", url: "https://api.github.com", headers: {} },
            });

            mockOctokitInstance.rest.pulls.get.mockRejectedValue(mockError);

            const response = await GET(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(404);
            expect(text).toBe("Not Found");
        });

        it("should return 500 for schema parsing errors", async () => {
            mockOctokitInstance.rest.pulls.get.mockResolvedValue({ data: {} });
            jest.mocked(PullRequestSchema.parse).mockImplementation(() => {
                throw new Error("Zod parsing error");
            });

            const response = await GET(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(text).toContain("Server error: Error: Zod parsing error");
        });

        it("should return 500 for generic unknown errors", async () => {
            mockOctokitInstance.rest.pulls.get.mockRejectedValue(
                new Error("Network failure")
            );

            const response = await GET(mockRequest, mockContext);
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(text).toContain("Server error: Error: Network failure");
        });
    });
});