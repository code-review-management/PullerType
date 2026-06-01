import { FileData } from "react-diff-view";
import { FileDiff } from "@/types/github.types";
import { getActivePath } from "./diff-utils";

type Segment = string; // A single component of a file path between the "/" separators

export type FileTreeNode =
  | { type: "directory"; name: string; children: FileTreeNode[] }
  | { type: "file"; name: string; fileDiff: FileDiff };

class PrefixTrieNode {
  children: Map<Segment, PrefixTrieNode>;
  isFile: boolean;
  fileDiff?: FileDiff; // Always included if `isFile` is true.

  constructor() {
    this.children = new Map();
    this.isFile = false;
  }
}

class PrefixTrie {
  root: PrefixTrieNode;

  constructor() {
    this.root = new PrefixTrieNode();
  }

  insert(fileDiff: FileDiff) {
    const segments = fileDiff.filename.split("/");

    let node = this.root;
    for (const segment of segments) {
      if (!node.children.has(segment)) {
        node.children.set(segment, new PrefixTrieNode());
      }
      node = node.children.get(segment)!;
    }

    node.isFile = true; // Set `isFile` to true for leaf nodes.
    node.fileDiff = fileDiff; // Include `FileDiff` object for leaf nodes.
  }

  traverse(parent: PrefixTrieNode) {
    // Assemble an array of directories and files at the same level in the tree.
    const directories: FileTreeNode[] = [];
    const files: FileTreeNode[] = [];

    // Traverse through all the children directly connected to the current node.
    for (const [segment, child] of parent.children) {
      if (child.isFile) {
        files.push({ type: "file", name: segment, fileDiff: child.fileDiff! });
      } else {
        let collapsedName = segment;
        let node = child;

        // Collapse directory names if the current directory contains only
        // 1 child that is also a directory.
        while (node.children.size === 1) {
          // Docs: https://stackoverflow.com/a/32373389 (gets the first item in a map)
          const next = node.children.entries().next().value!;
          const [nextSegment, nextChild] = next;

          if (nextChild.isFile) break;

          collapsedName += "/" + nextSegment;
          node = nextChild;
        }

        directories.push({
          type: "directory",
          name: collapsedName,
          children: this.traverse(node),
        });
      }
    }

    // Directories and files at the same level are sorted lexicographically.
    directories.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    // Directories should precede files when they are at the same level.
    return [...directories, ...files];
  }
}

/**
 * Builds a prefix trie from each file's name, then traverses it to produce a
 * data structure that resembles their file path hierarchy.
 *
 * @param fileDiffs: List of `FileDiff` objects for each of the pull request files.
 */
export function buildFileTree(fileDiffs: FileDiff[]) {
  const trie = new PrefixTrie();
  fileDiffs.forEach((fileDiff) => trie.insert(fileDiff));
  return trie.traverse(trie.root);
}

/**
 * Flattens a file tree into an array of `FileDiff`s. Preserves the order of
 * files as they appear in the tree.
 *
 * @param fileTree: Array of `FileTreeNode`s to flatten.
 * @returns: Array of `FileDiff`s in the same order as they appear in the tree.
 */
export function flattenFileTree(fileTree: FileTreeNode[]) {
  const flattened: FileDiff[] = [];

  fileTree.forEach((node) => {
    if (node.type === "directory") {
      flattened.push(...flattenFileTree(node.children));
    } else {
      flattened.push(node.fileDiff);
    }
  });

  return flattened;
}

/**
 * Sorts an array of diffs parsed by react-diff-view to match the order of files
 * in the flat file tree.
 *
 * @param diffs: Diffs parsed by react-diff-view.
 * @param flatFileTree: Flattened file tree that defines the ordering.
 */
export function orderParsedDiffs(diffs: FileData[], flatFileTree: FileDiff[]) {
  const pathTreeIndexMap = buildPathTreeIndexMap(flatFileTree);
  diffs.sort((a, b) => {
    const pathA = getActivePath(a.type, a.oldPath, a.newPath);
    const pathB = getActivePath(b.type, b.oldPath, b.newPath);

    const indexA = pathTreeIndexMap.get(pathA) ?? -1;
    const indexB = pathTreeIndexMap.get(pathB) ?? -1;

    if (indexA !== -1 && indexB === -1) return -1;
    if (indexA === -1 && indexB !== -1) return 1;

    // If `a` appears before `b` in `flatFileTree`, return a negative value to
    // indicate that `a` is less than `b`.
    return indexA - indexB;
  });
}

/**
 * Filters a file tree by the given search string.
 *
 * @param fileTree: Array of `FileTreeNode`s to filter.
 * @param searchString: The search string.
 * @returns: A set of nodes that satisfy the search string. Null if no search
 *           string is applied.
 */
export function filterFileTreeBySearch(
  fileTree: FileTreeNode[],
  searchString: string,
) {
  if (searchString.length === 0) return null; // Search string not applied.
  const filters = new Set<FileTreeNode>();

  fileTree.forEach((node) => {
    if (node.type === "directory") {
      const filteredChildren = filterFileTreeBySearch(
        node.children,
        searchString,
      );
      if (filteredChildren?.size) {
        filters.add(node);
        filteredChildren.forEach((child) => filters.add(child));
      }
    } else if (
      node.fileDiff.filename.toLowerCase().includes(searchString.toLowerCase())
    ) {
      filters.add(node);
    }
  });

  return filters;
}

export function buildPathTreeIndexMap(flatFileTree: FileDiff[]) {
  return new Map(flatFileTree.map((node, idx) => [node.filename, idx]));
}
