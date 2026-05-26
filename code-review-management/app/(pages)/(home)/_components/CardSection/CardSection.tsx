import styles from "./CardSection.module.css";
import dashboardPageImage from "@/public/landing_page/dashboard_page.png";
import prViewPageImage from "@/public/landing_page/pr_view_page.png";
import diffPageImage from "@/public/landing_page/diff_page.png";
import CardRow from "../CardRow/CardRow";

const CARD_ROWS = [
  {
    title: "Filter",
    text: "Stay organized with a personalized pull request dashboard. Filter by repository, status, and more.",
    imageSrc: dashboardPageImage,
    imageAlt: "PullerType dashboard screenshot",
  },
  {
    title: "View",
    text: "Stay up-to-date with the latest updates on your pull request.",
    imageSrc: prViewPageImage,
    imageAlt: "PullerType PR View screenshot",
  },
  {
    title: "Review",
    text: "View all changes to files, write comments, and submit your precise review.",
    imageSrc: diffPageImage,
    imageAlt: "PullerType Diff view screenshot",
  },
];

export default function CardSection() {
  return (
    <div className={styles.cardSection}>
      {CARD_ROWS.map((cardRow, i) => (
        <CardRow
          key={cardRow.title}
          title={cardRow.title}
          text={cardRow.text}
          imageSrc={cardRow.imageSrc}
          imageAlt={cardRow.imageAlt}
          reverse={i % 2 == 1}
        />
      ))}
    </div>
  );
}
