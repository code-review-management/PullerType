const START_MARKER = "<<<<<<<";
const DIVIDER_MARKER = "=======";
const END_MARKER = ">>>>>>>";

export interface ParsedConflict {
  id: string;
  currentText: string;
  incomingText: string;
  currentStartLine: number;
  incomingStartLine: number;
  resultInsertLine: number;
}

interface ParsedResult {
  currentContent: string;
  incomingContent: string;
  resultContent: string;
  conflicts: ParsedConflict[];
}

/**
 * Parses the raw file content into its respective merge conflict blocks
 * @param mergeContent raw file string, has merge conflict markers
 * @returns parsed output, which is the incoming/current/base content. It also has a list of conflict blocks,
 *  which has the texts and the line numbers conflicts refer to
 */
export function parseMerge(mergeContent: string): ParsedResult {
  const lines = mergeContent.split("\n");
  const currentLines: string[] = [];
  const incomingLines: string[] = [];
  const resultLines: string[] = [];

  const conflicts: ParsedConflict[] = [];

  let state: "NORMAL" | "CURRENT" | "INCOMING" = "NORMAL";
  const currConflict: Partial<ParsedConflict> = {};
  let currentTextLines: string[] = [];
  let incomingTextLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(START_MARKER)) {
      state = "CURRENT";
      currentTextLines = [];
      incomingTextLines = [];

      // Record where this conflict starts in all 3 editors
      currConflict.currentStartLine = currentLines.length + 1;
      currConflict.incomingStartLine = incomingLines.length + 1;
      currConflict.resultInsertLine = resultLines.length + 1;
    } else if (line.startsWith(DIVIDER_MARKER)) {
      state = "INCOMING";
    } else if (line.startsWith(END_MARKER)) {
      state = "NORMAL";
      const id = Math.random().toString(36).substring(7);

      conflicts.push({
        id,
        currentText: currentTextLines.join("\n"),
        incomingText: incomingTextLines.join("\n"),
        currentStartLine: currConflict.currentStartLine!,
        incomingStartLine: currConflict.incomingStartLine!,
        resultInsertLine: currConflict.resultInsertLine!,
      });
    } else {
      if (state === "NORMAL") {
        currentLines.push(line);
        incomingLines.push(line);
        resultLines.push(line);
      } else if (state === "CURRENT") {
        currentLines.push(line);
        currentTextLines.push(line);
      } else if (state === "INCOMING") {
        incomingLines.push(line);
        incomingTextLines.push(line);
      }
    }
  }

  return {
    currentContent: currentLines.join("\n"),
    incomingContent: incomingLines.join("\n"),
    resultContent: resultLines.join("\n"),
    conflicts,
  };
}
