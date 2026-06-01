import "@testing-library/jest-dom";
import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import {
  getDefaultActiveHighlight,
  getDefaultInsertChangeData,
} from "@/mocks/tests/diffs";
import Gutter from "./Gutter";

const mockIsWithinHighlightRange = jest.fn();

jest.mock("../../_utils/diff-utils", () => ({
  getLineNumber: () => 1,
}));

jest.mock("../../_utils/highlight-utils", () => ({
  isWithinHighlightRange: () => mockIsWithinHighlightRange(),
}));

describe("Gutter", () => {
  const mockChange = getDefaultInsertChangeData();
  const mockActiveHighlight = getDefaultActiveHighlight();
  const mockRenderDefault = () => <div data-testid="default-content" />;

  const defaultProps: ComponentProps<typeof Gutter> = {
    change: mockChange,
    side: "new",
    renderDefault: mockRenderDefault,
    activeHighlight: mockActiveHighlight,
    isHighlightDisabled: false,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders default content", () => {
    render(<Gutter {...defaultProps} />);
    expect(screen.getByTestId("default-content")).toBeInTheDocument();
  });

  describe("highlighted styling class", () => {
    it("applied when highlight is enabled and line is within highlight range", () => {
      mockIsWithinHighlightRange.mockReturnValue(true);
      const { container } = render(
        <Gutter {...defaultProps} isHighlightDisabled={false} />,
      );
      expect(container.firstElementChild).toHaveClass(
        "diff-gutter-highlighted",
      );
    });

    it("unapplied when highlight is enabled but line is outside highlight range", () => {
      mockIsWithinHighlightRange.mockReturnValue(false);
      const { container } = render(
        <Gutter {...defaultProps} isHighlightDisabled={false} />,
      );
      expect(container.firstElementChild).not.toHaveClass(
        "diff-gutter-highlighted",
      );
    });

    it("unapplied when line is within highlight range but highlight is disabled", () => {
      mockIsWithinHighlightRange.mockReturnValue(true);
      const { container } = render(
        <Gutter {...defaultProps} isHighlightDisabled />,
      );
      expect(container.firstElementChild).not.toHaveClass(
        "diff-gutter-highlighted",
      );
    });

    it("unapplied when highlight is disabled and line is outside highlight range", () => {
      mockIsWithinHighlightRange.mockReturnValue(false);
      const { container } = render(
        <Gutter {...defaultProps} isHighlightDisabled />,
      );
      expect(container.firstElementChild).not.toHaveClass(
        "diff-gutter-highlighted",
      );
    });
  });

  describe("highlight-disabled styling class", () => {
    it("applied when highlight is disabled", () => {
      const { container } = render(
        <Gutter {...defaultProps} isHighlightDisabled />,
      );
      expect(container.firstElementChild).toHaveClass(
        "diff-gutter-highlight-disabled",
      );
    });

    it("unapplied when highlight is enabled", () => {
      const { container } = render(
        <Gutter {...defaultProps} isHighlightDisabled={false} />,
      );
      expect(container.firstElementChild).not.toHaveClass(
        "diff-gutter-highlight-disabled",
      );
    });
  });
});
