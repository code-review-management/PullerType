import { findConflictingFiles, getMinutesUntilReset, AllowanceError } from "./detect-modified"; // Adjust path as needed
import { Octokit } from "octokit";

// Mock the Zod schemas so we can pass simplified test data without validation errors
jest.mock("../merge-github.types", () => ({
  CompareResponseSchema: {
    parse: jest.fn((data) => data),
  },
  CompareWithRateLimitSchema: {
    parse: jest.fn((data) => data),
  },
}));

describe("detectModified logic", () => {
  describe("getMinutesUntilReset", () => {
    beforeAll(() => {
      // Hijack the system time to simulate exactly 1,000,000 seconds
      jest.useFakeTimers();
      jest.setSystemTime(new Date(1000000 * 1000));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it("returns 0 if the reset timestamp is in the past", () => {
      expect(getMinutesUntilReset(999999)).toBe(0);
      expect(getMinutesUntilReset(1000000)).toBe(0);
    });

    it("returns correct minutes rounded up for future timestamps", () => {
      // 65 seconds in the future should round up to 2 minutes
      expect(getMinutesUntilReset(1000065)).toBe(2);
      
      // 120 seconds in the future should be exactly 2 minutes
      expect(getMinutesUntilReset(1000120)).toBe(2);
    });
  });

  describe("findConflictingFiles", () => {
    let mockCompareCommits: jest.Mock;
    let mockOctokit: Octokit;

    beforeEach(() => {
      jest.clearAllMocks();

      mockCompareCommits = jest.fn();
      mockOctokit = {
        rest: {
          repos: {
            compareCommits: mockCompareCommits,
          },
        },
      } as unknown as Octokit;

      jest.useFakeTimers();
      jest.setSystemTime(new Date(1000000 * 1000)); // Current time = 1,000,000
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Helper to generate fake GitHub API response data
    const createFakeResponse = (files: { filename: string; status: string }[]) => ({
      merge_base_commit: { sha: "base-sha" },
      base_commit: { sha: "target-sha" },
      files,
    });

    it("identifies overlapping files and returns true allowance when rate limits are safe", async () => {
      // Feature branch modifies/removes file1 and file2
      const featureData = createFakeResponse([
        { filename: "dir1/file1.ts", status: "modified" },
        { filename: "dir1/file2.ts", status: "removed" },
      ]);
      
      // Target branch modified file1 and file3
      const targetData = createFakeResponse([
        { filename: "dir1/file1.ts", status: "modified" }, // Overlap!
        { filename: "dir2/file3.ts", status: "modified" },
      ]);

      mockCompareCommits.mockImplementation(({ head }) => {
        if (head === "feature-branch") {
          return Promise.resolve({
            data: featureData,
            headers: {
              "x-ratelimit-limit": "5000",
              "x-ratelimit-remaining": "4999",
              "x-ratelimit-reset": "1000060", // 1 minute in the future
            },
          });
        }
        if (head === "target-branch") {
          return Promise.resolve({ data: targetData, headers: {} });
        }
      });

      const result = await findConflictingFiles(
        "owner",
        "repo",
        "target-branch",
        "feature-branch",
        mockOctokit
      );

      // Verify Correct Files Found
      expect(result.conflictingFilesResponse.files).toEqual(["dir1/file1.ts"]);
      expect(result.conflictingFilesResponse.mergeBaseCommit).toBe("base-sha");
      expect(result.conflictingFilesResponse.targetShaAtMerge).toBe("target-sha");

      // Verify Allowance
      // Cost: 1 conflict * 3 = 3. dir1 active = +1. dir1 removed = +1. Base = 4. Total cost = 9.
      // Remaining = 4999. Minutes left = 1. Drops = 15.
      // 4999 - 15 - 9 = 4975 (which is safely > 500 API_REDUNDENCY)
      expect(result.allowance).toBe(true);
    });

    it("returns false allowance if raw remaining tokens are below API_REDUNDENCY", async () => {
      mockCompareCommits.mockImplementation(({ head }) => {
        if (head === "feature-branch") {
          return Promise.resolve({
            data: createFakeResponse([]),
            headers: {
              "x-ratelimit-limit": "5000",
              "x-ratelimit-remaining": "400", // Less than 500!
              "x-ratelimit-reset": "1000060",
            },
          });
        }
        return Promise.resolve({ data: createFakeResponse([]), headers: {} });
      });

      const result = await findConflictingFiles("owner", "repo", "main", "feature-branch", mockOctokit);
      
      expect(result.allowance).toBe(false);
    });

    it("returns false allowance if calculated operations drop tokens below API_REDUNDENCY", async () => {
      mockCompareCommits.mockImplementation(({ head }) => {
        if (head === "feature-branch") {
          return Promise.resolve({
            data: createFakeResponse([{ filename: "file1.ts", status: "modified" }]),
            headers: {
              "x-ratelimit-limit": "5000",
              "x-ratelimit-remaining": "520", // Close to 500 limit
              "x-ratelimit-reset": "1000060", // 1 min (15 tokens lost)
            },
          });
        }
        return Promise.resolve({
          data: createFakeResponse([{ filename: "file1.ts", status: "modified" }]),
          headers: {}
        });
      });

      // Cost Calculation = 1 overlap * 3 = 3. 1 active dir = +1. Base = +4. Total Cost = 8.
      // Buffer = 520 (remaining) - 15 (time loss) - 8 (cost) = 497.
      // 497 < 500, so allowance should be false!
      const result = await findConflictingFiles("owner", "repo", "main", "feature-branch", mockOctokit);
      
      expect(result.allowance).toBe(false);
    });

    it("returns true allowance if reset time has already passed (minutes remaining is 0)", async () => {
      mockCompareCommits.mockImplementation(({ head }) => {
        if (head === "feature-branch") {
          return Promise.resolve({
            data: createFakeResponse([]),
            headers: {
              "x-ratelimit-limit": "5000",
              "x-ratelimit-remaining": "10", // Usually dangerous...
              "x-ratelimit-reset": "999999", // ...but it reset in the past!
            },
          });
        }
        return Promise.resolve({ data: createFakeResponse([]), headers: {} });
      });

      const result = await findConflictingFiles("owner", "repo", "main", "feature-branch", mockOctokit);
      
      // Because minutesRemaining === 0, allowance is forced to true
      expect(result.allowance).toBe(true);
    });

    it("throws an error if the octokit API call fails", async () => {
      mockCompareCommits.mockRejectedValue(new Error("GitHub API Error"));

      await expect(
        findConflictingFiles("owner", "repo", "main", "feature", mockOctokit)
      ).rejects.toThrow("GitHub API Error");
    });
  });
});