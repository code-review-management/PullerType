import { FileData } from "react-diff-view";
import { FileDiff } from "@/types/github.types";
import { FileTreeNode } from "@/app/(pages)/[username]/[repo_name]/pull/[id]/changes/_utils/filetree-utils";

// Helper function to create an array of GitHub `FileDiff` objects.
export function createFileMeta(filenames: string[]): FileDiff[] {
  return filenames.map((filename) => ({ filename }) as FileDiff);
}

// Helper function to create a GitHub `FileDiff` object.
export function createFileMetaItem({
  filename,
  status,
  additions,
  deletions,
}: {
  filename?: string;
  status?: string;
  additions?: number;
  deletions?: number;
}): FileDiff {
  return { filename, status, additions, deletions } as FileDiff;
}

// Helper function to create a react-diff-view `FileData` object.
export function createDiff(
  type: FileData["type"],
  oldPath: string,
  newPath: string,
): FileData {
  return { type, oldPath, newPath } as FileData;
}

export function getExampleFileNode1(): Extract<FileTreeNode, { type: "file" }> {
  return {
    type: "file",
    name: "index.ts",
    fileDiff: createFileMetaItem({ filename: "index.ts" }),
  };
}

export function getExampleDirectoryNode1(): Extract<
  FileTreeNode,
  { type: "directory" }
> {
  return {
    type: "directory",
    name: "src",
    children: [
      {
        type: "directory",
        name: "pages",
        children: [
          {
            type: "file",
            name: "home.tsx",
            fileDiff: createFileMetaItem({ filename: "src/pages/home.tsx" }),
          },
          {
            type: "file",
            name: "layout.tsx",
            fileDiff: createFileMetaItem({ filename: "src/pages/layout.tsx" }),
          },
        ],
      },
      {
        type: "file",
        name: "utils.ts",
        fileDiff: createFileMetaItem({ filename: "src/utils.ts" }),
      },
    ],
  };
}

export function getExampleDirectoryNode2(): Extract<
  FileTreeNode,
  { type: "directory" }
> {
  return { type: "directory", name: "lib", children: [] };
}

export function getExampleFileTree1(): FileTreeNode[] {
  return [
    getExampleDirectoryNode1(),
    getExampleDirectoryNode2(),
    getExampleFileNode1(),
  ];
}
