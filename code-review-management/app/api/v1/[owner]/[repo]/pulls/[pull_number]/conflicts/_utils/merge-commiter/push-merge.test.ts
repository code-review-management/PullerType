import { commitMergeChanges } from "./push-merge"; // Adjust path as needed
import { fetchDirectoryTreesWithGraphQL } from "./tree-fetcher";
import { Octokit } from "octokit";
import { performance } from "perf_hooks";
import { MergeCommitInputData, MergeCommitContent } from "../merge-github.types";

// --- Mock Dependencies ---
jest.mock("./tree-fetcher", () => ({
  fetchDirectoryTreesWithGraphQL: jest.fn(),
}));

jest.mock("perf_hooks", () => ({
  performance: {
    now: jest.fn(),
  },
}));

describe("commitMergeChanges", () => {
  let mockOctokit: any;
  let consoleLogSpy: jest.SpyInstance;

  const mockInput: MergeCommitInputData = {
    owner: "test-owner",
    repo: "test-repo",
    targetMergeSha: "base-sha",
    targetBranch: "main",
    featureBranch: "feature-branch",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock performance.now to return increasing increments
    let time = 0;
    (performance.now as jest.Mock).mockImplementation(() => {
      time += 10;
      return time;
    });

    // Spy on console.log to keep test output clean
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Deep mock of Octokit REST methods
    mockOctokit = {
      rest: {
        git: {
          getRef: jest.fn().mockResolvedValue({
            data: { object: { sha: "feature-sha" } },
          }),
          createTree: jest.fn().mockResolvedValue({
            data: { sha: "new-tree-sha" },
          }),
          createCommit: jest.fn().mockResolvedValue({
            data: { sha: "new-commit-sha" },
          }),
          updateRef: jest.fn().mockResolvedValue({}),
        },
        repos: {
          compareCommits: jest.fn().mockResolvedValue({
            data: {
              files: [
                { filename: "src/modified.ts", status: "modified", sha: "sha-1" },
                { filename: "src/removed.ts", status: "removed", sha: "sha-2" },
                { filename: "unchanged.ts", status: "modified", sha: "sha-3" },
              ],
            },
          }),
        },
      },
    };

    // Setup default mock for GraphQL folder tree cache
    const mockCache = new Map();
    // Cache for target base
    mockCache.set("base-sha|src", [
      { name: "removed.ts", mode: "100644", type: "blob" },
    ]);
    mockCache.set("base-sha|", [
      { name: "deleted-leftover.ts", mode: "100644", type: "blob" }
    ]);
    // Cache for feature branch
    mockCache.set("feature-sha|src", [
      { name: "modified.ts", mode: "100755", type: "blob" },
    ]);
    mockCache.set("feature-sha|", [
      { name: "unchanged.ts", mode: "100644", type: "blob" },
    ]);

    (fetchDirectoryTreesWithGraphQL as jest.Mock).mockResolvedValue(mockCache);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("successfully processes modified, removed, and unchanged files to create a commit", async () => {
    const mockContent: MergeCommitContent[] = [
      { filename: "src/modified.ts", content: "new resolved content" },
      { filename: "src/removed.ts", content: "" }, // Explicitly deleted
    ];

    const result = await commitMergeChanges(mockInput, mockContent, mockOctokit);

    expect(result).toBe(true);

    // Verify required directories were calculated and fetched
    expect(fetchDirectoryTreesWithGraphQL).toHaveBeenCalledWith(
      "test-owner",
      "test-repo",
      new Set([
        "feature-sha|src",  // from modified.ts
        "base-sha|src",     // from removed.ts
        "feature-sha|",     // from unchanged.ts
      ]),
      mockOctokit
    );

    // Verify Tree Creation Arguments
    expect(mockOctokit.rest.git.createTree).toHaveBeenCalledTimes(1);
    const treeArgs = mockOctokit.rest.git.createTree.mock.calls[0][0];
    
    expect(treeArgs.owner).toBe("test-owner");
    expect(treeArgs.base_tree).toBe("base-sha");
    
    // Check the generated tree structure
    const treeItems = treeArgs.tree;
    expect(treeItems).toHaveLength(3);
    expect(treeItems).toEqual(
      expect.arrayContaining([
        // Modified file: gets new content and keeps original feature mode
        { path: "src/modified.ts", mode: "100755", type: "blob", content: "new resolved content" },
        // Removed file: mapped to null sha
        { path: "src/removed.ts", mode: "100644", type: "blob", sha: null },
        // Unchanged file: simply passed through with original sha
        { path: "unchanged.ts", mode: "100644", type: "blob", sha: "sha-3" },
      ])
    );

    // Verify Commit Creation
    expect(mockOctokit.rest.git.createCommit).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      message: "Merge main into feature-branch",
      tree: "new-tree-sha",
      parents: ["feature-sha", "base-sha"],
    });

    // Verify Branch Ref Update
    expect(mockOctokit.rest.git.updateRef).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      ref: "heads/feature-branch",
      sha: "new-commit-sha",
      force: false,
    });
  });

  it("skips deletion for files that were 'added' in feature but resolved to empty", async () => {
    // Override the compareCommits mock to simulate an "added" file
    mockOctokit.rest.repos.compareCommits.mockResolvedValueOnce({
      data: {
        files: [{ filename: "new-file.ts", status: "added", sha: "sha-add" }],
      },
    });

    // The user deleted it during resolution (content: "")
    const mockContent: MergeCommitContent[] = [
      { filename: "new-file.ts", content: "" }, 
    ];

    await commitMergeChanges(mockInput, mockContent, mockOctokit);

    // It should have logged the skip
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Skipping deletion for new-file.ts: not in base tree."
    );

    // The tree should NOT include a null-sha entry for this file, since it never existed in base
    const treeItems = mockOctokit.rest.git.createTree.mock.calls[0][0].tree;
    expect(treeItems.find((i: any) => i.path === "new-file.ts")).toBeUndefined();
  });

  it("processes 'leftover' files not present in the compareCommits list", async () => {
    mockOctokit.rest.repos.compareCommits.mockResolvedValueOnce({
      data: { files: [] }, // No files from compare
    });

    // These files came entirely from the resolution payload
    const mockContent: MergeCommitContent[] = [
      { filename: "new-leftover.ts", content: "brand new text" },
      { filename: "deleted-leftover.ts", content: "" },
    ];

    await commitMergeChanges(mockInput, mockContent, mockOctokit);

    const treeItems = mockOctokit.rest.git.createTree.mock.calls[0][0].tree;
    expect(treeItems).toHaveLength(2);

    expect(treeItems).toEqual(
      expect.arrayContaining([
        // Leftover string content defaults to a standard 100644 blob
        { path: "new-leftover.ts", mode: "100644", type: "blob", content: "brand new text" },
        // Leftover deletion looks up the mode from the base tree
        { path: "deleted-leftover.ts", mode: "100644", type: "blob", sha: null },
      ])
    );
  });

  it("catches, logs, and rethrows errors", async () => {
    const mockError = new Error("GitHub API failure");
    mockOctokit.rest.git.updateRef.mockRejectedValueOnce(mockError);

    const mockContent: MergeCommitContent[] = [];

    await expect(commitMergeChanges(mockInput, mockContent, mockOctokit)).rejects.toThrow(
      "GitHub API failure"
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Error when committing merge: Error: GitHub API failure"
    );
  });
});