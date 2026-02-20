"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileData, parseDiff } from "react-diff-view";
import { readFile } from "@/lib/file-utils";
import { useDrafts } from "./_hooks/useDrafts";
import { usePublishedThreads } from "./_hooks/usePublishedThreads";
import DiffListView from "./_components/DiffListView/DiffListView";
import styles from "./page.module.css";

export default function Changes() {
  const params = useParams();
  const { username, repo_name, id } = params;
  const { publishedThreads } = usePublishedThreads();
  const { drafts, setDrafts } = useDrafts();

  const [diffs, setDiffs] = useState<FileData[]>();
  useEffect(() => {
    const getParsedDiffs = async () => {
      const diffString = await readFile("/mocks/diff-string.txt");
      const parsedDiffs = parseDiff(diffString, { nearbySequences: "zip" });
      setDiffs(parsedDiffs);
    };

    getParsedDiffs();
  }, [username, repo_name, id]);

  return (
    <div className={styles.page}>
      <DiffListView
        diffs={diffs}
        publishedThreads={publishedThreads}
        drafts={drafts}
        setDrafts={setDrafts}
      />
    </div>
  );
}
