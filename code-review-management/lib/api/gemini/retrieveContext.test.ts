import { Octokit } from "octokit";
import { getFileDiffAndContent } from "./retrieveContext"; // Update with your actual filename

describe("getFileDiffAndContent", () => {
  let mockOctokit: Octokit;
  let originalConsoleError: typeof console.error;

  const mockOwner = "test-owner";
  const mockRepo = "test-repo";
  const mockFilePath = "src/index.ts";
  const mockSha = "abcdef1234567890";

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console.error to keep test output clean during the error test
    originalConsoleError = console.error;
    console.error = jest.fn();

    // Create a deeply typed mock Octokit instance
    mockOctokit = {
      rest: {
        repos: {
          getContent: jest.fn(),
        },
      },
    } as unknown as Octokit;
  });

  afterEach(() => {
    // Restore the original console.error
    console.error = originalConsoleError;
  });

  it("should fetch, decode, and return the file content successfully", async () => {
    const rawString = "const hello = 'world';";
    const base64EncodedString = Buffer.from(rawString).toString("base64");

    // Mock a successful Octokit response for a single file using strict return type inference
    jest.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
      data: {
        type: "file",
        content: base64EncodedString,
      },
    } as unknown as Awaited<ReturnType<typeof mockOctokit.rest.repos.getContent>>);

    const result = await getFileDiffAndContent(
      mockOctokit,
      mockOwner,
      mockRepo,
      mockFilePath,
      mockSha
    );

    // Verify Octokit was called with the right parameters
    expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
      owner: mockOwner,
      repo: mockRepo,
      path: mockFilePath,
      ref: mockSha,
    });

    // Verify the base64 string was decoded correctly
    expect(result).toEqual({ content: rawString });
  });

  it("should return an empty string if the GitHub API returns an array (e.g., a directory)", async () => {
    // Mock the API returning an array of files instead of a single file object
    jest.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
      data: [
        { type: "file", name: "file1.ts" },
        { type: "file", name: "file2.ts" },
      ],
    } as unknown as Awaited<ReturnType<typeof mockOctokit.rest.repos.getContent>>);

    const result = await getFileDiffAndContent(
      mockOctokit,
      mockOwner,
      mockRepo,
      "src/directory",
      mockSha
    );

    // Because !Array.isArray(contentData) fails, content remains ""
    expect(result).toEqual({ content: "" });
  });

  it("should return an empty string if the data type is not 'file' (e.g., symlink or submodule)", async () => {
    // Mock the API returning a non-file type
    jest.mocked(mockOctokit.rest.repos.getContent).mockResolvedValue({
      data: {
        type: "symlink",
        content: "base64-encoded-target-path",
      },
    } as unknown as Awaited<ReturnType<typeof mockOctokit.rest.repos.getContent>>);

    const result = await getFileDiffAndContent(
      mockOctokit,
      mockOwner,
      mockRepo,
      "src/symlink",
      mockSha
    );

    // Because type === "file" fails, content remains ""
    expect(result).toEqual({ content: "" });
  });

  it("should catch, log, and rethrow errors from Octokit", async () => {
    const mockError = new Error("Not Found");
    
    // Simulate an API failure
    jest.mocked(mockOctokit.rest.repos.getContent).mockRejectedValue(mockError);

    // Verify the function throws the error upwards
    await expect(
      getFileDiffAndContent(
        mockOctokit,
        mockOwner,
        mockRepo,
        mockFilePath,
        mockSha
      )
    ).rejects.toThrow("Not Found");

    // Verify the error was properly logged to the console
    expect(console.error).toHaveBeenCalledWith(
      `Error fetching data for ${mockFilePath} at ${mockSha}:`,
      mockError
    );
  });
});