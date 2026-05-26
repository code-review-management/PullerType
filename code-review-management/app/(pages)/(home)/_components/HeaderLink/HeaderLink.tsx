import Link from "next/link";
import styles from "./HeaderLink.module.css";

export default function HeaderLink({
  text,
  href,
}: {
  text: string;
  href: string;
}) {
  return <Link href={href} className={styles.headerLink}>{text}</Link>;
}
