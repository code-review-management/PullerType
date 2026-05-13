import styles from "./Blurb.module.css";

export default function Blurb() {
  return (
    <div className={styles.blurbContainer}>
      <div className={styles.blurb}>
        <h2 className={styles.blurbTitle}>Code reviews for the modern team</h2>
        <p>
          Remove all the noise and streamlines the code review process. Stay
          updated, iterate quickly, and vet every change. From PR to merge--
          your whole workflow, on PullerType.{" "}
        </p>
      </div>
    </div>
  );
}
