import Image from "next/image";
import styles from "./Footer.module.css";
import HeaderLink from "../HeaderLink/HeaderLink";

const HEADER_LINKS = [
  {
    text: "Docs",
    href: "/",
  },
  {
    text: "User Guide",
    href: "/",
  },
];

export default function Footer() {
  return (
    <div className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.pullertype}>
          <Image
            src="/landing_page/pullertype_icon.svg"
            alt="PullerType"
            height={60}
            width={60}
          />
          <h2 className={styles.logoText}>PullerType</h2>
        </div>
        <div className={styles.headerActions}>
          {HEADER_LINKS.map((link) => (
            <HeaderLink key={link.text} text={link.text} href={link.href} />
          ))}
        </div>
      </div>
      <div className={styles.footerSecondary}>
        Made with ♡ by code-review-management
      </div>
    </div>
  );
}
