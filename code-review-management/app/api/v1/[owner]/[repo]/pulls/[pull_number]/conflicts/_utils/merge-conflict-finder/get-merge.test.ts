import { getMergeConflict, ConflictInput } from "./get-merge"; // Adjust path as needed
import { Octokit } from "octokit";
import { findConflictingFiles, AllowanceError } from "./detect-modified";
import { retrieveConflictContents } from "./get-files";
import { attemptFileMerge } from "./get-merge-diff";
import { performance } from "perf_hooks";

// --- Mock Dependencies ---
jest.mock("./detect-modified", () => ({
  findConflictingFiles: jest.fn(),
  AllowanceError: class AllowanceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AllowanceError";
    }
  },
}));

jest.mock("./get-files", () => ({
  retrieveConflictContents: jest.fn(),
}));

jest.mock("./get-merge-diff", () => ({
  attemptFileMerge: jest.fn(),
}));

jest.mock("perf_hooks", () => ({
  performance: {
    now: jest.fn(),
  },
}));

describe("getMergeConflict", () => {
  let mockOctokit: Octokit;
  let consoleLogSpy: jest.SpyInstance;

  const mockInput: ConflictInput = {
    owner: "owner",
    repo: "repo",
    targetBranch: "main",
    featureBranch: "feature-branch",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOctokit = {} as Octokit;

    // Mock performance.now to just return increasing numbers so the timers don't crash
    let time = 0;
    (performance.now as jest.Mock).mockImplementation(() => {
      time += 10;
      return time;
    });

    // Spy on console.log to keep the test runner output clean
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("orchestrates the merge process and returns the successfully merged files", async () => {
    // 1. Mock findConflictingFiles
    (findConflictingFiles as jest.Mock).mockResolvedValue({
      conflictingFilesResponse: {
        mergeBaseCommit: "base-sha",
        targetShaAtMerge: "target-sha",
        files: ["file1.ts"],
      },
      allowance: true,
    });

    // 2. Mock retrieveConflictContents
    (retrieveConflictContents as jest.Mock).mockResolvedValue([
      {
        fileName: "file1.ts",
        ancestorContent: "ancestor text",
        targetContent: "target text",
        featureContent: "feature text",
      },
    ]);

    // 3. Mock attemptFileMerge
    (attemptFileMerge as jest.Mock).mockReturnValue({
      hasConflict: true,
      content: "<<<<<<<\nfeature text\n=======\ntarget text\n>>>>>>>",
    });

    const result = await getMergeConflict(mockInput, mockOctokit);

    // Verify correct data chaining
    expect(findConflictingFiles).toHaveBeenCalledWith(
      "owner", "repo", "main", "feature-branch", mockOctokit
    );
    expect(retrieveConflictContents).toHaveBeenCalledWith(
      ["file1.ts"], "base-sha", "main", "feature-branch", "owner", "repo", mockOctokit
    );
    expect(attemptFileMerge).toHaveBeenCalledWith(
      "ancestor text", "target text", "feature text"
    );

    // Verify final output shape
    expect(result).toEqual({
      targetShaAtMerge: "target-sha",
      mergedFiles: [
        {
          filename: "file1.ts",
          hasConflict: true,
          contents: "<<<<<<<\nfeature text\n=======\ntarget text\n>>>>>>>",
        },
      ],
    });
  });

  it("handles null content safely by converting it to empty strings in MakeMerge", async () => {
    (findConflictingFiles as jest.Mock).mockResolvedValue({
      conflictingFilesResponse: {
        mergeBaseCommit: "base",
        targetShaAtMerge: "target",
        files: ["nullfile.ts"],
      },
      allowance: true,
    });

    // Simulate file being newly created (null ancestor) and deleted in target (null target)
    (retrieveConflictContents as jest.Mock).mockResolvedValue([
      {
        fileName: "nullfile.ts",
        ancestorContent: null,
        targetContent: null,
        featureContent: null,
      },
    ]);

    (attemptFileMerge as jest.Mock).mockReturnValue({
      hasConflict: false,
      content: "",
    });

    await getMergeConflict(mockInput, mockOctokit);

    // Verify MakeMerge properly sanitized the nulls into empty strings
    expect(attemptFileMerge).toHaveBeenCalledWith("", "", "");
  });

  it("throws an AllowanceError and stops execution if allowance is false", async () => {
    (findConflictingFiles as jest.Mock).mockResolvedValue({
      conflictingFilesResponse: { files: [] },
      allowance: false, // User is out of tokens!
    });

    await expect(getMergeConflict(mockInput, mockOctokit)).rejects.toThrow(
      "User doesn't have enough tokens"
    );

    // Ensure downstream functions were safely skipped
    expect(retrieveConflictContents).not.toHaveBeenCalled();
    expect(attemptFileMerge).not.toHaveBeenCalled();
  });

  it("catches, logs, and rethrows generic errors", async () => {
    const mockError = new Error("Network timeout");
    (findConflictingFiles as jest.Mock).mockRejectedValue(mockError);

    await expect(getMergeConflict(mockInput, mockOctokit)).rejects.toThrow(
      "Network timeout"
    );

    // Verify the catch block executed
    expect(consoleLogSpy).toHaveBeenCalledWith("Error in get merge conflict: Error: Network timeout");
  });
});