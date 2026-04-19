import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ComponentProps } from "react";
import InlineCommentEntry from "./InlineCommentEntry";

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

describe("InlineCommentEntry", () => {
  const defaultProps: ComponentProps<typeof InlineCommentEntry> = {
    avatar: "example-avatar",
    username: "example-username",
    defaultEditable: false,
  };

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

  it("renders the markdown editor", () => {
    render(<InlineCommentEntry {...defaultProps} />);
    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
  });
});
