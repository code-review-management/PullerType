import Image from "next/image";
import styles from "./Header.module.css";
import HeaderLink from "../HeaderLink/HeaderLink";
import HeaderSignIn from "../HeaderSignIn/HeaderSignIn";

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

export default function Header() {
  return (
    <div className={styles.header}>
      <div className={styles.pullertype}>
        <Image
          src="/landing_page/pullertype_icon.svg"
          alt="PullerType"
          height={60}
          width={60}
        />
      </div>
      <div className={styles.headerActions}>
        {HEADER_LINKS.map((link) => (
          <HeaderLink key={link.text} text={link.text} href={link.href} />
        ))}
        <HeaderSignIn />
      </div>
    </div>
  );
}
