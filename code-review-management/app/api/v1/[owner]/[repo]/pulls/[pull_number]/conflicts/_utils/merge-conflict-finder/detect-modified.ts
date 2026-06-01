import {
  CompareResponse,
  CompareResponseSchema,
  CompareWithRateLimitSchema,
} from "../merge-github.types";
import { Octokit } from "octokit";

export interface ConflictingFilesResponse {
  mergeBaseCommit: string;
  targetShaAtMerge: string;
  files: string[];
}

export interface CostPredictionData {
  conflictFileCount: number;
  totalFileCount: number;
}

export interface ConflictingFilesResponseAndAllowance {
  conflictingFilesResponse: ConflictingFilesResponse;
  allowance: boolean;
}

export class AllowanceError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AllowanceError.prototype);
    this.name = "ValidationError";
  }
}

const API_REDUNDENCY: number = 500;
const API_TOKENS_PER_MINUTE: number = 15;

export const findConflictingFiles = async (
  owner: string,
  repo: string,
  targetBranch: string,
  featureBranch: string,
  octokit: Octokit,
): Promise<ConflictingFilesResponseAndAllowance> => {
  try {
    const [featureResponse, targetResponse] = await Promise.all([
      octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: targetBranch,
        head: featureBranch,
      }),
      octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: featureBranch,
        head: targetBranch,
      }),
    ]);

    const rateLimit = {
      limit: Number(featureResponse.headers["x-ratelimit-limit"]),
      remaining: Number(featureResponse.headers["x-ratelimit-remaining"]),
      reset: Number(featureResponse.headers["x-ratelimit-reset"]),
    };

    const featureAndRateData = CompareWithRateLimitSchema.parse({
      data: featureResponse.data,
      rateLimit: rateLimit,
    });
    const validatedFeatureReponse: CompareResponse = featureAndRateData.data;

    const validatedTargetReponse: CompareResponse = CompareResponseSchema.parse(
      targetResponse.data,
    );

    const ancestorSha: string = validatedFeatureReponse.merge_base_commit.sha;
    const targetSha: string = validatedFeatureReponse.base_commit.sha;

    const featureFiles: string[] = validatedFeatureReponse.files.map(
      (f) => f.filename,
    );
    const targetFiles: string[] = validatedTargetReponse.files.map(
      (f) => f.filename,
    );

    const overlappingFiles = featureFiles.filter((file) =>
      targetFiles.includes(file),
    );

    const { limit, remaining, reset } = featureAndRateData.rateLimit;
    const conflictFileCount: number = overlappingFiles.length;

    const apiCallCost: number = calculateTokenCost(
      conflictFileCount,
      validatedFeatureReponse,
    );
    const minutesRemaining: number = getMinutesUntilReset(reset);

    let allowance = true;
    if (minutesRemaining === 0) {
      allowance = true;
    } else if (remaining < API_REDUNDENCY) {
      allowance = false;
    } else {
      console.log(
        "Cost: ",
        apiCallCost,
        " | remaining: ",
        remaining,
        " | token per minute: ",
        minutesRemaining * API_TOKENS_PER_MINUTE,
      );
      allowance =
        API_REDUNDENCY <
        remaining - minutesRemaining * API_TOKENS_PER_MINUTE - apiCallCost;
    }

    return {
      conflictingFilesResponse: {
        mergeBaseCommit: ancestorSha,
        targetShaAtMerge: targetSha,
        files: overlappingFiles,
      },
      allowance: allowance,
    };
  } catch (error: any) {
    console.error(
      "Error executing API calls to find potential conflicts:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

const calculateTokenCost = (
  conflictFileCount: number,
  featureFiles: CompareResponse,
): number => {
  let totalCost: number = conflictFileCount * 3; // this is get cost

  const removedDirs = new Set<string>();
  const activeDirs = new Set<string>();

  for (const file of featureFiles.files) {
    const lastSlashIndex = file.filename.lastIndexOf("/");
    const dirPath =
      lastSlashIndex === -1 ? "" : file.filename.substring(0, lastSlashIndex);

    if (file.status === "removed") {
      if (!removedDirs.has(dirPath)) {
        removedDirs.add(dirPath);
        totalCost += 1;
      }
    } else {
      if (!activeDirs.has(dirPath)) {
        activeDirs.add(dirPath);
        totalCost += 1;
      }
    }
  }
  totalCost += 4; // ref call, compare commit call, commit call, push commit call
  return totalCost;
};

export const getMinutesUntilReset = (resetTimestampSeconds: number): number => {
  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  const secondsRemaining = resetTimestampSeconds - currentTimeSeconds;
  if (secondsRemaining <= 0) {
    return 0;
  }
  return Math.ceil(secondsRemaining / 60);
};
