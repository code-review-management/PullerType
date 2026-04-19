import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import InlineThreadHeader from "./InlineThreadHeader";

describe("InlineThreadHeader", () => {
  it("renders the title", () => {
    render(<InlineThreadHeader title="example-title" />);
    expect(screen.getByText("example-title")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <InlineThreadHeader
        title="example-title"
        actions={<div data-testid="example-actions" />}
      />,
    );
    expect(screen.getByTestId("example-actions")).toBeInTheDocument();
  });

  it("does not render as an anchor link by default", () => {
    render(<InlineThreadHeader title="example-title" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders as an anchor link when anchorHref is provided", () => {
    render(
      <InlineThreadHeader title="example-title" anchorHref="#example-anchor" />,
    );
    const anchor = screen.getByRole("link", { name: "example-title" });
    expect(anchor).toHaveAttribute("href", "#example-anchor");
  });
});
