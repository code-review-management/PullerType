import { signIn } from "next-auth/react";
import styles from "./HeroSignIn.module.css";

export default function HeroSignIn() {
  return (
    <button className={styles.btn} onClick={() => signIn()}>
      Sign in
    </button>
  );
}
