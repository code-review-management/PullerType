import React from "react";
import styles from "./UnresolvedFilesPopup.module.css";

interface UnresolvedFilesPopupProps {
  isOpen: boolean;
  onClose: () => void; // Function to call when clicking outside
  files: string[]; // List of unresolved files to display
  isDarkMode?: boolean;
  children?: React.ReactNode;
}

/**
 * This popup tells the user which files have some part of as untouched.
 * @param UnresolvedFilesPopupProps It has the info of what files are missing and if it should render
 */
const UnresolvedFilesPopup: React.FC<UnresolvedFilesPopupProps> = ({
  isOpen,
  onClose,
  files,
  isDarkMode = false,
  children,
}) => {
  if (!isOpen) return null;

  const popupClass = `${styles.popupContainer} ${isDarkMode ? styles.darkTheme : ""}`;

  return (
    // The overlay handles the outer-region clicking to close
    <div className={styles.overlay} onClick={onClose}>
      <div className={popupClass} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>⚠️</div>
        <h2 className={styles.title}>Caution</h2>
        <p className={styles.message}>
          These files have either a manual or no resolution:
        </p>

        <ul className={styles.fileList}>
          {files.map((file, index) => (
            <li key={index} className={styles.fileItem}>
              {file}
            </li>
          ))}
        </ul>

        <div className={styles.actionContainer}>{children}</div>
      </div>
    </div>
  );
};

export default UnresolvedFilesPopup;
