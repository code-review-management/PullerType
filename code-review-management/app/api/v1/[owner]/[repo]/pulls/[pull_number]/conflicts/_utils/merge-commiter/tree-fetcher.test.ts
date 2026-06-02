import { fetchDirectoryTreesWithGraphQL } from "./tree-fetcher"; // Adjust the path as needed
import { Octokit } from "octokit";

describe("fetchDirectoryTreesWithGraphQL", () => {
  let mockGraphql: jest.Mock;
  let mockOctokit: Octokit;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphql = jest.fn();
    mockOctokit = {
      graphql: mockGraphql,
    } as unknown as Octokit;

    // Spy on console.error to keep the test runner output clean
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns an empty Map and makes no API calls if requiredDirs is empty", async () => {
    const result = await fetchDirectoryTreesWithGraphQL(
      "owner",
      "repo",
      new Set(),
      mockOctokit
    );

    expect(result.size).toBe(0);
    expect(mockGraphql).not.toHaveBeenCalled();
  });

  it("constructs queries correctly and formats the mode from decimal to octal string", async () => {
    const requiredDirs = new Set(["sha123|src"]);

    // Note: GitHub GraphQL API returns the mode as a base-10 integer.
    // 33188 in decimal is 100644 in octal (standard file).
    // 16384 in decimal is 040000 in octal (directory).
    mockGraphql.mockResolvedValueOnce({
      repository: {
        alias_0: {
          entries: [
            { name: "index.ts", type: "blob", mode: 33188 },
            { name: "utils", type: "tree", mode: 16384 },
          ],
        },
      },
    });

    const result = await fetchDirectoryTreesWithGraphQL(
      "owner",
      "repo",
      requiredDirs,
      mockOctokit
    );

    expect(mockGraphql).toHaveBeenCalledTimes(1);

    // Verify the query contains the correctly formatted expression
    const query = mockGraphql.mock.calls[0][0];
    expect(query).toContain('expression: "sha123:src"');

    // Verify mapping and octal formatting
    const entries = result.get("sha123|src");
    expect(entries).toBeDefined();
    expect(entries).toEqual([
      { name: "index.ts", type: "blob", mode: "100644" },
      { name: "utils", type: "tree", mode: "040000" }, // Padded with leading zero
    ]);
  });

  it("handles the root directory correctly when dirPath is empty", async () => {
    const requiredDirs = new Set(["sha999|"]); // Empty string after the pipe

    mockGraphql.mockResolvedValueOnce({
      repository: {
        alias_0: { entries: [] },
      },
    });

    await fetchDirectoryTreesWithGraphQL("owner", "repo", requiredDirs, mockOctokit);

    const query = mockGraphql.mock.calls[0][0];
    
    // It should use "sha:" instead of "sha:" which GitHub requires for root trees
    expect(query).toContain('expression: "sha999:"');
    expect(query).not.toContain('expression: "sha999::"');
  });

  it("chunks requests into batches of 40 and runs them concurrently", async () => {
    // Generate an array of 45 directories
    const dirsArray = Array.from({ length: 45 }, (_, i) => `sha1|dir${i}`);
    const requiredDirs = new Set(dirsArray);

    mockGraphql.mockResolvedValue({ repository: {} }); // Mock empty return for all chunks

    const result = await fetchDirectoryTreesWithGraphQL(
      "owner",
      "repo",
      requiredDirs,
      mockOctokit
    );

    // 45 items with a chunk size of 40 means exactly 2 requests
    expect(mockGraphql).toHaveBeenCalledTimes(2);
    
    // It maps empty/null entries safely to empty arrays
    expect(result.get("sha1|dir0")).toEqual([]);
  });

  it("handles null or missing tree objects safely by returning an empty array", async () => {
    const requiredDirs = new Set(["sha1|invalid_dir"]);

    mockGraphql.mockResolvedValueOnce({
      repository: {
        alias_0: null, // Happens if the directory doesn't exist
      },
    });

    const result = await fetchDirectoryTreesWithGraphQL(
      "owner",
      "repo",
      requiredDirs,
      mockOctokit
    );

    expect(result.get("sha1|invalid_dir")).toEqual([]);
  });

  it("logs and rethrows GraphQL errors", async () => {
    const requiredDirs = new Set(["sha1|src"]);
    const mockError = new Error("GraphQL timeout limit exceeded");

    mockGraphql.mockRejectedValueOnce(mockError);

    await expect(
      fetchDirectoryTreesWithGraphQL("owner", "repo", requiredDirs, mockOctokit)
    ).rejects.toThrow("GraphQL timeout limit exceeded");

    // Verify it was logged before being thrown
    expect(consoleErrorSpy).toHaveBeenCalledWith("GraphQL Batch Fetch Error:", mockError);
  });
});