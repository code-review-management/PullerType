"use client";

import Footer from "../(home)/_components/Footer/Footer";
import Header from "../(home)/_components/Header/Header";
import styles from "./page.module.css";

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.pageContent}>
        <h1>Privacy policy</h1>
        <div>
          <p>
            By building our application as a GitHub App, the user specifically
            selects which repositories and organizations they want our
            application to have access to. The user can always delete the
            installation of our GitHub App, which will successfully remove our
            access to their information. When the user signs in via GitHub
            OAuth, the personal access token that we use to make GitHub API
            requests on behalf of the user is limited to retrieve only
            information that the user has granted us access to. Furthermore, we
            are not storing their code in any capacity. Finally, when the user
            deletes our GitHub App installation, access through our servers is
            automatically terminated.
          </p>
          <p>
            Our product also takes advantage of Google Gemini to provide
            suggestions to file content based on review comments. This means a
            portion of our entire files are sent through Google&apos;s public
            Gemini API to generate suggestions. Users are warned that responses
            may not be accurate and their implicit consent to data sharing when
            they click the Gemini Suggest button.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
