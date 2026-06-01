import { RotatingLines } from "react-loader-spinner";
import styles from "./LoadingSpinner.module.css";

/**
 * Renders a loading spinner.
 *
 * @param size: Height and width of the spinner in px units. Defaults to 20px.
 * @param centered: Whether the spinner should be centered within its parent
 *                  container.
 * @param forPageLevel: Whether the spinner indicates loading for a page-level
 *                      component.
 */
export default function LoadingSpinner({
  size = 20,
  centered,
  forPageLevel,
}: {
  size?: number;
  centered?: boolean;
  forPageLevel?: boolean;
}) {
  return (
    <div
      className={`${forPageLevel ? styles.pageMargin : ""} ${centered ? styles.centered : ""}`}
    >
      <RotatingLines height={size} width={size} color="var(--color-disabled)" />
    </div>
  );
}
