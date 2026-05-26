"use client";

import styles from "./page.module.css";
import Header from "./_components/Header/Header";
import Hero from "./_components/Hero/Hero";
import Blurb from "./_components/Blurb/Blurb";
import CardSection from "./_components/CardSection/CardSection";
import PageEndCta from "./_components/PageEndCta/PageEndCta";
import Footer from "./_components/Footer/Footer";

export default function Home() {
  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.pageBody}>
        <Hero />
        <Blurb />
        <CardSection />
        <PageEndCta />
      </div>
      <Footer />
    </div>
  );
}
