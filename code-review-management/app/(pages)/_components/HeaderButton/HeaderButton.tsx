import styles from "./HeaderButton.module.css";
import Link from "next/link";
import { MouseEventHandler, ReactNode } from "react";

/**
 * The button component used in the PR view / PR change page headers.
 * Between onClick and href, only one param (at most) should be provided. Whichever parameter is
 * provided determines the underlying HTML element implementing the header button.
 * 
 * @param onClick onClick function called when button is clicked. 
 *               If this is provided (and href is not), the button will use <button> element.
 * @param href The link to direct to when button is clicked.
 *               If this is provided (and onClick is not), the button will use <Link> element.
 * @param variant?: Which style variant of the button to use. Either "primary" or "secondary". defaults to primary
 * @param children: Button inner content.
 * @param isDisabled?: Whether the button is disabled or not. Only relevant when
 *                     the underlying HTML element is <button>.
 */
export default function HeaderButton({
  onClick,
  href,
  variant,
  children,
  isDisabled,
}: {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  href?: string;
  variant?: "primary" | "secondary" | "tertiary";
  children: ReactNode;
  isDisabled?: boolean;
}) {
  let specialtyStyle: string = styles.primary;
  if (variant === "secondary") {
    specialtyStyle = styles.secondary;
  }
  else if (variant === "tertiary") {
    specialtyStyle = styles.tertiary;
  }

  if (onClick && !href) {
    return (
      <button
        onClick={onClick}
        className={`${styles.headerButton} ${specialtyStyle}`}
        disabled={isDisabled}
      >
        {children}
      </button>
    );
  } else if (href && !onClick) {
    return (
      <Link href={href} className={`${styles.headerButton} ${specialtyStyle}`}>
        {children}
      </Link>
    );
  } else {
    return (
      <div className={`${styles.headerButton} ${specialtyStyle}`}>
        {children}
      </div>
    );
  }
}
