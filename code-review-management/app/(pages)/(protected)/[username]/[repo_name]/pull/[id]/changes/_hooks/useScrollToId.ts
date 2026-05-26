import {
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useState,
} from "react";

export function useScrollToId(
  activePath: string,
  setIsDiffLoaded: Dispatch<SetStateAction<boolean>>,
  setIsExpanded: Dispatch<SetStateAction<boolean>>,
  fileDiffRef: RefObject<HTMLDivElement | null>,
) {
  const [scrollId, setScrollId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);

      const target = document.getElementById(hash);
      if (!target || !fileDiffRef.current?.contains(target)) return;

      // Automatically load diff only when jumping to an inline thread.
      if (hash.startsWith("inline-thread")) {
        setIsDiffLoaded(true);
      }
      setIsExpanded(true);
      setScrollId(hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activePath, setIsDiffLoaded, setIsExpanded, fileDiffRef]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollId) return;
      const target = document.getElementById(scrollId);

      target?.scrollIntoView({ block: "start" });
      if (scrollId.startsWith("file-draft-")) {
        target?.querySelector<HTMLElement>(".tiptap")?.focus();
      }

      // Set to null after scroll completes, so we can observe a state change
      // when we consecutively click the same button multiple times, and this
      // scroll handler can execute even after the first click.
      setScrollId(null);
    };
    handleScroll();
  }, [scrollId]);

  return {
    scrollToId: (id: string) => {
      setIsExpanded(true);
      setScrollId(id);
    },
  };
}
