import HeroInstall from "../HeroInstall/HeroInstall";
import HeroSignIn from "../HeroSignIn/HeroSignIn";
import styles from "./PageEndCta.module.css";

export default function PageEndCta() {
  return (
    <div className={styles.pageEndCta}>
      <h2>Try it now!</h2>
      <div className={styles.buttonSection}>
        <HeroInstall />
        <HeroSignIn />
      </div>
    </div>
  );
}
