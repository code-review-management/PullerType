import "@testing-library/jest-dom";
import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileDiffHeader from "./FileDiffHeader";

jest.mock("../FileStatusChip/FileStatusChip", () => ({
  __esModule: true,
  default: () => <div data-testid="file-status-chip" />,
}));

describe("FileDiffHeader", () => {
  const mockSetIsExpanded = jest.fn();
  const defaultProps: ComponentProps<typeof FileDiffHeader> = {
    diffType: "modify",
    oldPath: "old-path.ts",
    newPath: "new-path.ts",
    isExpanded: true,
    setIsExpanded: mockSetIsExpanded,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("chevron", () => {
    it("renders a downward chevron when expanded", () => {
      render(<FileDiffHeader {...defaultProps} isExpanded />);
      expect(
        screen.getByAltText("Chevron icon pointing down"),
      ).toBeInTheDocument();
    });

    it("renders a rightward chevron when collapsed", () => {
      render(<FileDiffHeader {...defaultProps} isExpanded={false} />);
      expect(
        screen.getByAltText("Chevron icon pointing right"),
      ).toBeInTheDocument();
    });

    it("calls setIsExpanded when chevron is clicked", async () => {
      const user = userEvent.setup();
      render(<FileDiffHeader {...defaultProps} />);
      await user.click(screen.getByAltText("Chevron icon pointing down"));
      expect(mockSetIsExpanded).toHaveBeenCalledTimes(1);
    });
  });
});
