import { useSearchParams } from "next/navigation";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

export const CommitPickerContext = createContext<{
  selectedSha: string | null;
  setSelectedSha: Dispatch<SetStateAction<string | null>>;
  isCumulative: boolean;
  setIsCumulative: Dispatch<SetStateAction<boolean>>;
} | null>(null);

export const useCommitPickerContext = () => {
  const context = useContext(CommitPickerContext);
  if (!context) {
    throw new Error(
      "useCommitPickerContext has to be used within <CommitPickerContext>",
    );
  }
  return context;
};

export default function CommitPickerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const params = useSearchParams();
  const sha = params.get("sha");
  const cumulative = params.get("cumulative");

  const [selectedSha, setSelectedSha] = useState<string | null>(sha);
  const [isCumulative, setIsCumulative] = useState(cumulative !== null);

  return (
    <CommitPickerContext
      value={{
        selectedSha,
        setSelectedSha,
        isCumulative,
        setIsCumulative,
      }}
    >
      {children}
    </CommitPickerContext>
  );
}
