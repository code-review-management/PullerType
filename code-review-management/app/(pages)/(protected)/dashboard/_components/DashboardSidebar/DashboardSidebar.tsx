import styles from "./DashboardSidebar.module.css";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import CollapsibleRepoList from "../CollapsibleRepoList/CollapsibleRepoList";
import {
  getOrgSetFromRepoNameList,
  sortReposByOrg,
} from "../../_utils/repo-utils";
import { useReposQuery } from "@/lib/api/queries/useReposQuery";
import { useAutoFetchAllPages } from "@/lib/api/hooks/useAutoFetchAllPages";
import LoadingSpinner from "@components/LoadingSpinner/LoadingSpinner";
import { useLocalStorage } from "usehooks-ts";
import Image from "next/image";
import ExpandIcon from "@/public/icons/expand.svg";
import CollapseIcon from "@/public/icons/collapse.svg";
import IconTooltip from "@/app/(pages)/_components/IconTooltip/IconTooltip";

type ExpansionState = "expand" | "collapse" | "other";

/**
 * Sidebar displayed on the left of the dashboard page with repo filter options.
 * @param selectedRepos List of full names of selected repos
 * @param setSelectedRepos Setter for list of full names of selected repos
 */
export default function DashboardSidebar({
  selectedRepos,
  setSelectedRepos,
}: {
  selectedRepos: string[];
  setSelectedRepos: Dispatch<SetStateAction<string[]>>;
}) {
  const { data, fetchNextPage, hasNextPage, isFetching, isPending } =
    useReposQuery();
  useAutoFetchAllPages(hasNextPage, isFetching, fetchNextPage);

  const [expandedOwners, setExpandedOwners] = useLocalStorage<string[]>(
    "expandedOwners",
    [],
  );
  const [expansionState, setExpansionState] = useState<ExpansionState>("other");

  const mappedRepoList = sortReposByOrg(data || []);
  const repoSet = new Set(Array.isArray(selectedRepos) ? selectedRepos : []);
  const expandedSet = new Set(
    Array.isArray(expandedOwners) ? expandedOwners : [],
  );

  // Set of orgs (owners) that have repos that are currently selected
  const orgSet = useMemo(
    () => getOrgSetFromRepoNameList(selectedRepos),
    [selectedRepos],
  );

  /**
   * Update selectedRepos appropriately when a checkbox in a list is clicked
   *
   * @param name Full name of the repo getting selected/deselected
   * @param isChecked Whether this repo's checkbox is currently selected
   */
  const onCheckboxChange = (name: string, isChecked: boolean) => {
    if (isChecked && !repoSet.has(name)) {
      const newSelectedRepos = [...selectedRepos];
      newSelectedRepos.push(name);
      setSelectedRepos(newSelectedRepos);
    } else if (!isChecked && repoSet.has(name)) {
      setSelectedRepos(selectedRepos.filter((repoName) => repoName !== name));
    }
  };

  /**
   * Update expandedOwners and/or expansionState when a category is expanded/collapsed.
   *
   * @param owner Owner this category represents
   * @param isCollapsed Boolean representing whether we are trying to expand/collapse the category
   */
  const onExpandedChange = (owner: string, isCollapsed: boolean) => {
    if (expansionState === "expand") {
      const allOwners = Array.from(mappedRepoList.keys());
      setExpandedOwners(allOwners.filter((item) => item !== owner));
      setExpansionState("other");
    } else if (expansionState === "collapse") {
      const newCollapsedOwners = Array.from(orgSet);
      if (!orgSet.has(owner)) newCollapsedOwners.push(owner);
      setExpandedOwners(newCollapsedOwners);
      setExpansionState("other");
    } else if (isCollapsed && !expandedSet.has(owner)) {
      const newCollapsedOwners = [...expandedOwners];
      newCollapsedOwners.push(owner);
      setExpandedOwners(newCollapsedOwners);
    } else if (!isCollapsed && !orgSet.has(owner)) {
      if (expandedSet.has(owner)) {
        setExpandedOwners(expandedOwners.filter((item) => item !== owner));
      }
    }
  };

  /**
   * Change expansion state based on which expansion state gets selected.
   * If we're trying to toggle the same state again, reset to the "other" state.
   * Otherwise, set the state to the selected state.
   *
   * @param state ExpansionState (expand, collapse, other) that got selected.
   */
  const toggleExpansionState = (state: ExpansionState) => {
    if (expansionState === state) {
      setExpansionState("other");
    } else {
      setExpansionState(state);
    }
  };

  /**
   * Calculate whether a category should be displayed as expanded
   * based on whether it's in the set of expanded categories
   * and whether we're in expand or collapse mdoe currently.
   *
   * @param owner Owner this category represents
   * @returns `true` if the category should displayed as be expanded, `false` otherwise
   */
  const categoryIsExpanded = (owner: string) => {
    return (
      orgSet.has(owner) ||
      expansionState === "expand" ||
      (expansionState === "other" && expandedSet.has(owner))
    );
  };

  return (
    <div className={styles.dashboardSidebar}>
      <div className={styles.sidebarContent}>
        <div className={styles.sidebarHeader}>
          <h4 className={styles.sidebarHeaderText}>REPOSITORIES</h4>
          <div className={styles.reposActions}>
            <button
              className={`${styles.actionButton} ${expansionState === "expand" && styles.actionButtonActive}`}
              onClick={() => toggleExpansionState("expand")}
              data-tooltip-id="expand-all"
              data-tooltip-content="Expand all"
              data-tooltip-delay-show={100}
              data-tooltip-place="bottom"
            >
              <Image
                src={ExpandIcon}
                alt="Expand"
                className={styles.chevron}
                height={24}
              />
            </button>
            <button
              className={`${styles.actionButton} ${expansionState === "collapse" && styles.actionButtonActive}`}
              onClick={() => toggleExpansionState("collapse")}
              data-tooltip-id="collapse-all"
              data-tooltip-content="Collapse all"
              data-tooltip-delay-show={100}
              data-tooltip-place="bottom"
            >
              <Image
                src={CollapseIcon}
                alt="Collapse"
                className={styles.chevron}
                height={24}
              />
            </button>
          </div>
        </div>
        {Array.from(mappedRepoList.keys()).map((owner: string) => (
          <CollapsibleRepoList
            key={owner}
            owner={owner}
            mappedRepoList={mappedRepoList}
            onCheckboxChange={onCheckboxChange}
            selectedRepos={repoSet}
            isExpanded={(() => categoryIsExpanded(owner))()}
            onExpandedChange={onExpandedChange}
            collapseDisabled={orgSet.has(owner)}
          />
        ))}
        {(isPending || (hasNextPage && isFetching)) && <LoadingSpinner />}
      </div>
      <div className={styles.sideBorder} />
      <IconTooltip id="expand-all" positionStrategy="fixed" />
      <IconTooltip id="collapse-all" positionStrategy="fixed" />
      <IconTooltip id="collapse-disabled-tooltip" positionStrategy="fixed" />
    </div>
  );
}
