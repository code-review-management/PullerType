"use client";

import styles from "./page.module.css";
import {
  MergeOutput,
  TargetFeatureParamsSchema,
} from "@/app/api/v1/[owner]/[repo]/pulls/[pull_number]/conflicts/_utils/merge-github.types";
import { useParams, useSearchParams } from "next/navigation";
import { PullParams } from "@/types/routing.types";
import dynamic from "next/dynamic";
import { useMergeConflictQuery } from "@lib/api/queries/useFindConflictQuery";

const ConflictResolution = dynamic(
  () => import("./_components/ConflictResolution/ConflictResolution"),
  {
    ssr: false,
    loading: () => <p>Loading editor...</p>,
  },
);

export interface ConflictResolutionProp {
  mergeOutput: MergeOutput;
  branchInfoProp: BranchInfoProp;
}

interface BranchInfoProp {
  owner: string;
  repo: string;
  pullId: string;
  targetBranch: string;
  featureBranch: string;
}

export default function Page() {
  const params = useParams<PullParams>();
  const { username, repo_name, id } = params;

  const searchParams = useSearchParams();
  const parsedParams = TargetFeatureParamsSchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
  const { target_branch, feature_branch } = parsedParams;

  const {
    data: conflictResolutionData,
    isLoading,
    isError,
    error,
  } = useMergeConflictQuery(
    username,
    repo_name,
    id,
    target_branch,
    feature_branch,
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.header}>Merge conflicts from {target_branch} </h1>

      {isLoading && <div>Loading conflict data...</div>}

      {isError && <div>{error?.message || "Error loading conflict data."}</div>}

      {conflictResolutionData && !isError && (
        <ConflictResolution conflictResolutionProp={conflictResolutionData} />
      )}
    </div>
  );
}
