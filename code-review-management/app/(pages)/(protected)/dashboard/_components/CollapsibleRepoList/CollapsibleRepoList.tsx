import Checkbox from "@/app/(pages)/_components/Checkbox/Checkbox";
import styles from "./CollapsibleRepoList.module.css";
import Image from "next/image";
import ChevronDownIcon from "@/public/icons/chevron_down.svg";
import ChevronDownDisabledIcon from "@/public/icons/chevron_down_disabled.svg";
import ChevronRightIcon from "@/public/icons/chevron_right.svg";

/**
 * Collapsible checklist used for a section of list of repos in the repo filters section on the dashboard.
 * @param owner The username or organization name that this section is for.
 * @param mappedRepoList Mapping of owner name to array of repo names
 * @param onCheckboxChange Callback to pass into each checkbox in the the list.
 * @param selectedRepos Set of full names of selected repos. Determines if items in list should be checked
 * @param isExpanded State of whether this list is expandedOwners
 * @param onExpandedChange Callback triggered when the checklist is expanded/collapsed
 * @param collapseDisabled Whether the collapse functionality of this repo list is disabled (meaning at least 1 of its repo(s) is selected)
 */
export default function CollapsibleRepoList({
  owner,
  mappedRepoList,
  onCheckboxChange,
  selectedRepos,
  isExpanded,
  onExpandedChange,
  collapseDisabled,
}: {
  owner: string;
  mappedRepoList: Map<string, string[]>;
  onCheckboxChange: (name: string, isChecked: boolean) => void;
  selectedRepos: Set<string>;
  isExpanded: boolean;
  onExpandedChange: (owner: string, isCollapsed: boolean) => void;
  collapseDisabled: boolean;
}) {
  const expandedIcon = collapseDisabled
    ? ChevronDownDisabledIcon
    : ChevronDownIcon;

  return (
    <div className={styles.repoListSection} key={owner}>
      <div
        className={styles.sectionHeader}
        onClick={() => onExpandedChange(owner, !isExpanded)}
        {...(collapseDisabled && {
          "data-tooltip-id": "collapse-disabled-tooltip",
          "data-tooltip-content": "Collapse disabled when repo(s) selected",
          "data-tooltip-delay-show": 300,
        })}
      >
        <Image
          src={isExpanded ? expandedIcon : ChevronRightIcon}
          alt={`Chevron icon pointing ${isExpanded ? "down" : "right"}`}
          className={styles.chevron}
        />
        <h5
          className={`${styles.ownerName} ${collapseDisabled && styles.ownerNameDisabled}`}
        >
          {owner}
        </h5>
      </div>
      <form
        className={`${styles.repoList} ${isExpanded && styles.repoListExpanded}`}
      >
        {mappedRepoList.get(owner)?.map((repoName) => (
          <div key={repoName} className={styles.repoListEntry}>
            <Checkbox
              id={`${owner}/${repoName}`}
              name={`${owner}/${repoName}`}
              onChange={onCheckboxChange}
              checked={selectedRepos.has(`${owner}/${repoName}`)}
            />
            <label htmlFor={`${owner}/${repoName}`} className={styles.repoName}>
              {repoName}
            </label>
          </div>
        ))}
      </form>
    </div>
  );
}
