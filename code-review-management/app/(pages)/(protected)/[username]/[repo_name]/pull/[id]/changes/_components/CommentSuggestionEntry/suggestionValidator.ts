export function isSuggestionOutdated(
  fileContent: string,
  deletionContent: string,
  adjustedStartLine: number,
): boolean {
  if (deletionContent === "") return false;
  if (fileContent === "") return true;

  const cleanedFileContent = fileContent.replace(/\r/g, "");
  const cleanedDeletionContent = deletionContent.replace(/\r/g, "");

  const fileLines = cleanedFileContent.split("\n");
  const fileLineLength = fileLines.length;
  const deletionLines = cleanedDeletionContent.split("\n");

  for (let i = 0; i < deletionLines.length; i++) {
    const fileIndex = i + adjustedStartLine;
    if (fileIndex >= fileLineLength) return true;

    if (deletionLines[i] !== fileLines[fileIndex]) {
      return true;
    }
  }

  return false;
}
