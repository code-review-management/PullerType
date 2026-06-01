import { ReactNode } from "react";
import Image, { StaticImageData } from "next/image";
import AlertFillIcon from "@/public/icons/alert_fill.svg";
import ErrorFillIcon from "@/public/icons/error_fill.svg";
import styles from "./AlertBanner.module.css";

type AlertVariant = "warning" | "error";

const ICONS: Record<AlertVariant, StaticImageData> = {
  warning: AlertFillIcon,
  error: ErrorFillIcon,
};

const COLOR_CLASSES: Record<AlertVariant, string> = {
  warning: styles.warning,
  error: styles.error,
};

/**
 * Banner for displaying alert messages.
 * @param children: Content to display in the banner.
 * @param variant?: Color variant of the banner.
 */
export default function AlertBanner({
  children,
  variant = "warning",
}: {
  children: ReactNode;
  variant?: AlertVariant;
}) {
  return (
    <div className={`${styles.banner} ${COLOR_CLASSES[variant]}`}>
      <Image src={ICONS[variant]} alt={variant} />
      {children}
    </div>
  );
}
