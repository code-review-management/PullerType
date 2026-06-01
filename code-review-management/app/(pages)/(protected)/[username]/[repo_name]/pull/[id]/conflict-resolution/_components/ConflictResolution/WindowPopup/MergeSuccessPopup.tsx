import React from "react";
import styles from "./MergeAlertPopup.module.css";

interface MergeAlertPopupProps {
  isOpen: boolean;
  isDark: boolean;
  targetBranch: string;
  featureBranch: string;
  children?: React.ReactNode; // This is the space for your redirect button
}

/**
 * The popup on merge success
 * @param MergeAlertPopupProps It has all of the info to populate the pop up and determine if it should render
 */
const MergeSuccessPopup: React.FC<MergeAlertPopupProps> = ({
  isOpen,
  isDark,
  targetBranch,
  featureBranch,
  children,
}) => {
  // If it's not open, don't render anything
  if (!isOpen) return null;

  const popupClass = `${styles.popupContainer} ${isDark ? styles.darkTheme : ""}`;

  return (
    <div className={styles.overlay}>
      <div className={popupClass}>
        <div className={styles.icon}>🎉</div>
        <h2 className={styles.title}>Resolution Successful!</h2>
        <p className={styles.message}>
          {featureBranch} is up to date with {targetBranch}.
        </p>
        <div className={styles.actionContainer}>{children}</div>
      </div>
    </div>
  );
};

export default MergeSuccessPopup;
