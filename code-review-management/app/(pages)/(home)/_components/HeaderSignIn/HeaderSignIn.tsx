import { signIn } from "next-auth/react";
import styles from "./HeaderSignIn.module.css";

export default function HeaderSignIn() {
  return (
    <button className={styles.headerSignIn} onClick={() => signIn()}>
      Sign in
    </button>
  );
}
