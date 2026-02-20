import { useCallback, useMemo, useState } from "react";
import { ChangeData, getChangeKey } from "react-diff-view";

/* Copied from react-diff-view documentation */
export function useHighlighting() {
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]);
  const selectChange = useCallback(
    ({ change }: { change: ChangeData | null }) => {
      if (!change) return;

      const toggle = (selectedChanges: string[]) => {
        const changeKey = getChangeKey(change);
        const index = selectedChanges.indexOf(changeKey);
        if (index >= 0) {
          return [
            ...selectedChanges.slice(0, index),
            ...selectedChanges.slice(index + 1),
          ];
        }
        return [...selectedChanges, changeKey];
      };

      setSelectedChanges(toggle);
    },
    [],
  );

  const highlightEvents = useMemo(() => {
    return {
      gutterEvents: { onClick: selectChange },
      codeEvents: { onClick: selectChange },
    };
  }, [selectChange]);

  return { selectedChanges, highlightEvents };
}
