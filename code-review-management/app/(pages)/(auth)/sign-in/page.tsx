import { signIn } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import GitHubIcon from "@/public/icons/github.svg";
import styles from "./page.module.css";

/**
 * Docs:
 * 1. https://authjs.dev/getting-started/session-management/login?framework=Next.js
 */

export default function SignIn() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.heading}>
          <h1>PullerType</h1>
          <p>Welcome back to PullerType</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
          data-testid="sign-in-form"
        >
          <button type="submit" className={styles.signInButton}>
            <Image src={GitHubIcon} alt="GitHub" />
            Sign in with GitHub
          </button>
        </form>
        <p className={styles.notice}>
          By signing up, you acknowledge that you read and agree to our{" "}
          <Link className={styles.link} href="/privacy-policy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
