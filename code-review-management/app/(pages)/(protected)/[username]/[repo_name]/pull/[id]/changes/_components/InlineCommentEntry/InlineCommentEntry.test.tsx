import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ComponentProps } from "react";
import InlineCommentEntry from "./InlineCommentEntry";
import { extractSuggestions } from "../CommentSuggestionEntry/suggestionParser";

// Mocks
jest.mock("../../../_utils/date-utils", () => ({
  formatDate: () => "formatted-date",
}));

jest.mock("@components/MarkdownEditor/MarkdownEditor", () => ({
  __esModule: true,
  default: () => <div data-testid="markdown-editor" />,
}));

jest.mock("@components/UserIcon/UserIcon", () => ({
  __esModule: true,
  default: () => <div data-testid="user-icon" />,
}));

jest.mock("../CommentSuggestionEntry/SuggestionReplacementWidget", () => ({
  SuggestionReplacementWidget: () => <div data-testid="suggestion-widget" />,
}));

// Mock Data
const validSuggestionComment = `<!--[Gemini Suggestion#HLTP][5]-->
<!--Gemini-Tag [Code To Be Deleted]-->
\`\`\`diff
- old console.log("hello");
\`\`\`
<!--Gemini-Tag [Code To Be Inserted]-->
\`\`\`diff
+ console.log("hello world");
\`\`\`
<!--Gemini-Tag [Diff End] -->
`;

const committedSuggestionComment = `<!--[Gemini Suggestion#HLTP][12][Commited]-->
<!--Gemini-Tag [Code To Be Deleted]-->
\`\`\`diff
- let x = 1;
\`\`\`
<!--Gemini-Tag [Code To Be Inserted]-->
\`\`\`diff
+ const x = 1;
\`\`\`
<!--Gemini-Tag [Diff End] -->
`;

const missingInsertSuggestionComment = `<!--[Gemini Suggestion#HLTP][12]-->
<!--Gemini-Tag [Code To Be Deleted]-->
\`\`\`diff
- old console.log("hello");
\`\`\`
<!--Gemini-Tag [Code To Be Inserted]-->`;

const missingDeleteSuggestionComment = `<!--[Gemini Suggestion#HLTP][12]-->
<!--Gemini-Tag [Code To Be Inserted]-->
\`\`\`diff
+ console.log("hello world");
\`\`\`
<!--Gemini-Tag [Diff End] -->
`;

describe("InlineCommentEntry", () => {
  const defaultProps: ComponentProps<typeof InlineCommentEntry> = {
    avatar: "example-avatar",
    username: "example-username",
    defaultEditable: false,
  };

  describe("extractSuggestions", () => {
    it("successfully parses a valid, uncommitted suggestion", () => {
      const result = extractSuggestions(validSuggestionComment);
      expect(result.hasSuggestion).toBe(true);
      expect(result.relativeStartLine).toBe(5);
      expect(result.isCommited).toBe(false);
      expect(result.deletionContent).toBe('old console.log("hello");');
      expect(result.additionContent).toBe('console.log("hello world");');
    });

    it("successfully parses a committed suggestion", () => {
      const result = extractSuggestions(committedSuggestionComment);
      expect(result.hasSuggestion).toBe(true);
      expect(result.relativeStartLine).toBe(12);
      expect(result.isCommited).toBe(true);
      expect(result.deletionContent).toBe("let x = 1;");
      expect(result.additionContent).toBe("const x = 1;");
    });

    it("returns hasSuggestion as false if the inserted code section is missing", () => {
      const result = extractSuggestions(missingInsertSuggestionComment);
      expect(result.hasSuggestion).toBe(false);
    });

    it("returns hasSuggestion as false if the deleted code section is missing", () => {
      const result = extractSuggestions(missingDeleteSuggestionComment);
      expect(result.hasSuggestion).toBe(false);
    });

    it("returns hasSuggestion as false for a regular comment", () => {
      const result = extractSuggestions("This is just a regular comment without any tags.");
      expect(result.hasSuggestion).toBe(false);
    });
  });

  it("renders the user icon", () => {
    render(<InlineCommentEntry {...defaultProps} />);
    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
  });

  it("renders the username", () => {
    render(<InlineCommentEntry {...defaultProps} />);
    expect(screen.getByText("example-username")).toBeInTheDocument();
  });

  it("renders the formatted date when created is provided", () => {
    render(<InlineCommentEntry {...defaultProps} created="created-date" />);
    expect(screen.getByText("formatted-date")).toBeInTheDocument();
  });

  it("does not render a date when created is omitted", () => {
    render(<InlineCommentEntry {...defaultProps} />);
    expect(screen.queryByText("formatted-date")).not.toBeInTheDocument();
  });

  it("renders header actions when provided", () => {
    render(
      <InlineCommentEntry
        {...defaultProps}
        headerActions={<div data-testid="example-header-actions" />}
      />,
    );
    expect(screen.getByTestId("example-header-actions")).toBeInTheDocument();
  });

  it("renders the markdown editor for normal comments", () => {
    render(<InlineCommentEntry {...defaultProps} defaultContent="Normal comment" />);
    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("suggestion-widget")).not.toBeInTheDocument();
  });

  describe("when handling suggestive comments", () => {
    it("renders SuggestionReplacementWidget when all required props (startLine, commentID) are provided", () => {
      render(
        <InlineCommentEntry
          {...defaultProps}
          defaultContent={validSuggestionComment}
          startLine={10}
          commentID={123}
          activePath="/src/index.ts"
        />
      );
      expect(screen.getByTestId("suggestion-widget")).toBeInTheDocument();
      expect(screen.queryByTestId("markdown-editor")).not.toBeInTheDocument();
    });

    it("falls back to MarkdownEditor if startLine is missing", () => {
      render(
        <InlineCommentEntry
          {...defaultProps}
          defaultContent={validSuggestionComment}
          commentID={123}
        // startLine omitted
        />
      );
      expect(screen.queryByTestId("suggestion-widget")).not.toBeInTheDocument();
      expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    });

    it("falls back to MarkdownEditor if commentID is missing", () => {
      render(
        <InlineCommentEntry
          {...defaultProps}
          defaultContent={validSuggestionComment}
          startLine={10}
        // commentID omitted
        />
      );
      expect(screen.queryByTestId("suggestion-widget")).not.toBeInTheDocument();
      expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    });

    it("renders SuggestionReplacementWidget even if activePath is missing, defaulting to empty string", () => {
      render(
        <InlineCommentEntry
          {...defaultProps}
          defaultContent={validSuggestionComment}
          startLine={10}
          commentID={123}
        // activePath omitted
        />
      );
      expect(screen.getByTestId("suggestion-widget")).toBeInTheDocument();
      expect(screen.queryByTestId("markdown-editor")).not.toBeInTheDocument();
    });
  });
});