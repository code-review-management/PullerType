import Image, { StaticImageData } from "next/image";
import styles from "./CardRow.module.css";

export default function CardRow({
  title,
  text,
  imageSrc,
  imageAlt,
  reverse = true,
}: {
  title: string;
  text: string;
  imageSrc: StaticImageData | string;
  imageAlt: string;
  reverse?: boolean;
}) {
  return (
    <div className={`${styles.cardRow} ${reverse && styles.cardRowReversed}`}>
      <div className={styles.imageContainer}>
        <Image src={imageSrc} alt={imageAlt} fill className={styles.image} />
      </div>
      <div className={styles.textContent}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.text}>{text}</p>
      </div>
    </div>
  );
}
