import Image from "next/image";
import styles from "./HeroInstall.module.css";
import GitHubIcon from "@/public/icons/github.svg";
import { EXTERNAL_LINKS } from "@/lib/links";

export default function HeroInstall() {
  return (
    <a
      href={EXTERNAL_LINKS.GITHUB_APP_INSTALLATION}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.btnLink}
    >
      <button className={styles.btn}>
        <Image src={GitHubIcon} alt="GitHub" height={30} width={30} />
        Install GitHub App
      </button>
    </a>
  );
}
