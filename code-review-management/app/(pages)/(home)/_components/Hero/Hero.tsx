import Image from "next/image";
import styles from "./Hero.module.css";
import HeroInstall from "../HeroInstall/HeroInstall";
import HeroSignIn from "../HeroSignIn/HeroSignIn";
import ArrowRight from "@/public/landing_page/arrow_right.svg";

export default function Hero() {
  return (
    <div className={styles.hero}>
      <div className={styles.heroColumnLeft}>
        <h1 className={styles.heroTitleText}>We pull, you review.</h1>
        <p className={styles.heroSubtext}>
          Get started in just two easy steps.
        </p>
        <div className={styles.heroButtonSection}>
          <HeroInstall />
          <Image src={ArrowRight} alt="Arrow right" height={25} width={38} />
          <HeroSignIn />
        </div>
      </div>
      <div className={styles.heroImageWrapper}>
        <Image
          src="landing_page/hero_image.svg"
          alt="PullerType bear on iceberg"
          fill
        />
      </div>
    </div>
  );
}
