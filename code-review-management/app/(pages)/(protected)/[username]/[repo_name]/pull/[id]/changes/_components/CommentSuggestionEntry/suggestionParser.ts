export interface SuggestiveComment {
  hasSuggestion: boolean,
  relativeStartLine: number,
  deletionContent: string,
  additionContent: string,
  isCommited: boolean,
}

export function extractSuggestions(comment: string): SuggestiveComment {
  const extractedSuggestion: SuggestiveComment = {
    hasSuggestion: false,
    relativeStartLine: 0,
    deletionContent: "",
    additionContent: "",
    isCommited: false,
  };

  const match = comment.match(/<!--\[Gemini Suggestion#HLTP]\[(.*?)\](\[Commited])?-->/);
  if (match) {
    const relativeStartLine = parseInt(match[1]);
    extractedSuggestion.relativeStartLine = relativeStartLine;
    extractedSuggestion.isCommited = !!match[2];

    const deletedMatch = comment.match(
      /<!--Gemini-Tag \[Code To Be Deleted]-->\r?\n```diff\r?\n([\s\S]*?)\r?\n```\r?\n<!--Gemini-Tag \[Code To Be Inserted]-->/
    );

    const insertedMatch = comment.match(
      /<!--Gemini-Tag \[Code To Be Inserted]-->\r?\n```diff\r?\n([\s\S]*?)\r?\n```\r?\n<!--Gemini-Tag \[Diff End] -->/
    );

    if (deletedMatch) {
      extractedSuggestion.deletionContent = deletedMatch[1].replace(/^- /gm, "");
    } else {
      return extractedSuggestion;
    }

    if (insertedMatch) {
      extractedSuggestion.additionContent = insertedMatch[1].replace(/^\+ /gm, "");
    } else {
      return extractedSuggestion;
    }

    extractedSuggestion.hasSuggestion = true;
  }

  return extractedSuggestion;
}
