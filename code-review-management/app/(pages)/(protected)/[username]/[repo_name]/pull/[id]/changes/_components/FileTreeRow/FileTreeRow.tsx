import { useEffect, useRef, useState } from "react";
import { handleAnchorClick } from "../../_utils/scroll-utils";
import { FileTreeNode } from "../../_utils/filetree-utils";
import { createFileDiffId } from "../../_utils/diff-utils";
import FileTreeDividers from "../FileTreeDividers/FileTreeDividers";
import FileTreeIcon from "../FileTreeIcon/FileTreeIcon";
import styles from "./FileTreeRow.module.css";

const BASE_PADDING = 8;
const INDENT_PADDING = 16;

/**
 * Renders a single row in the file tree. Represents either a file or a
 * directory. If the current row is a directory, recursively renders its
 * children below it.
 *
 * @param node: `FileTreeNode` object representing the node to render.
 * @param depth: How many levels deep the row is nested in the file hierarchy.
 *               Defaults to 0. Used for calculating the padding for each row.
 * @param filters: Set of visible nodes when search is applied; null when search
 *                 is not applied.
 * @param isResizing: Whether the file-tree is currently being resized or not.
 */
export default function FileTreeRow({
  node,
  depth = 0,
  filters,
  isResizing,
}: {
  node: FileTreeNode;
  depth?: number;
  filters: Set<FileTreeNode> | null;
  isResizing: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const nodeLabel = (
    <NodeLabel
      node={node}
      depth={depth}
      isExpanded={isExpanded}
      isResizing={isResizing}
      onFolderClick={() => setIsExpanded((prev) => !prev)}
    />
  );
  const isFilteredOut = filters && !filters.has(node);
  const fileAnchorHref =
    node.type === "file" ? `#${createFileDiffId(node.fileDiff.filename)}` : "";

  return (
    <div className={isFilteredOut ? styles.hidden : ""}>
      {node.type === "directory" ? (
        nodeLabel
      ) : (
        <a
          href={fileAnchorHref}
          className={styles.anchor}
          onClick={() => handleAnchorClick(fileAnchorHref)}
        >
          {nodeLabel}
        </a>
      )}
      {node.type === "directory" &&
        node.children.map((child) => (
          <div
            key={child.name}
            className={!isExpanded ? styles.collapsed : ""}
            data-testid="directory-child"
          >
            <FileTreeRow
              node={child}
              depth={depth + 1}
              filters={filters}
              isResizing={isResizing}
            />
          </div>
        ))}
    </div>
  );
}

function NodeLabel({
  node,
  depth,
  isExpanded,
  isResizing,
  onFolderClick,
}: {
  node: FileTreeNode;
  depth: number;
  isExpanded: boolean;
  isResizing: boolean;
  onFolderClick: () => void;
}) {
  const [isOverflow, setIsOverflow] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // Docs: https://www.robinwieruch.de/react-custom-hook-check-if-overflow/#
  useEffect(() => {
    const { current } = ref;
    if (current) {
      const hasOverflow = current.scrollWidth > current.clientWidth;
      setIsOverflow(hasOverflow);
    }
  }, [isResizing]);

  return (
    <div
      className={styles.row}
      onClick={node.type === "directory" ? onFolderClick : undefined}
      {...(isOverflow && {
        "data-tooltip-id": "tooltip-file-tree-row",
        "data-tooltip-content": node.name,
        "data-tooltip-place": "top-end",
        "data-tooltip-delay-show": 100,
      })}
    >
      <FileTreeDividers
        depth={depth}
        basePadding={BASE_PADDING}
        indentPadding={INDENT_PADDING}
      />
      <div
        className={styles.label}
        style={{ paddingLeft: depth * INDENT_PADDING + BASE_PADDING }}
      >
        <FileTreeIcon node={node} isExpanded={isExpanded} />
        <span className={styles.filename} ref={ref}>
          {node.name}
        </span>
      </div>
    </div>
  );
}
