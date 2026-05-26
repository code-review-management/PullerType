import { ReactNode } from "react";
import { handleAnchorClick } from "../../_utils/scroll-utils";
import styles from "./InlineThreadHeader.module.css";

/**
 * A header for an inline thread of comments. Rendered above the thread to
 * display which lines and side that the thread is anchored to.
 *
 * @param title: Text to display on the header.
 * @param tooltip: Optional tooltip for the title.
 * @param actions: Action components to display on the right-side of the header.
 * @param anchorHref: Optional URL linking to anchored location.
 */
export default function InlineThreadHeader({
  title,
  tooltip,
  actions,
  anchorHref,
}: {
  title: string;
  tooltip?: string;
  actions?: ReactNode;
  anchorHref?: string;
}) {
  const threadHeader = (
    <div className={styles.header}>
      <span
        className={styles.title}
        {...(tooltip && {
          "data-tooltip-place": "top-start",
          "data-tooltip-id": "thread-header-tooltip",
          "data-tooltip-content": tooltip,
          "data-tooltip-delay-show": 100,
        })}
      >
        {title}
      </span>
      {actions}
    </div>
  );

  return (
    <>
      {anchorHref ? (
        <a
          href={anchorHref}
          className={styles.headerAnchor}
          onClick={() => handleAnchorClick(anchorHref)}
        >
          {threadHeader}
        </a>
      ) : (
        threadHeader
      )}
    </>
  );
}
