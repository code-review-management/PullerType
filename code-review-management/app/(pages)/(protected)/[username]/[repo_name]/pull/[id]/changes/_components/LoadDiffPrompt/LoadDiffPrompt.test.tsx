import "@testing-library/jest-dom";
import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoadDiffPrompt, { LoadDiffReason } from "./LoadDiffPrompt";

describe("LoadDiffPrompt", () => {
  const mockSetIsDiffLoaded = jest.fn();
  const defaultProps: ComponentProps<typeof LoadDiffPrompt> = {
    setIsDiffLoaded: mockSetIsDiffLoaded,
    reason: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the load diff button", () => {
    render(<LoadDiffPrompt {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Load diff" }),
    ).toBeInTheDocument();
  });

  it("calls setIsDiffLoaded on button click", async () => {
    const user = userEvent.setup();
    render(<LoadDiffPrompt {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: "Load diff" }));
    expect(mockSetIsDiffLoaded).toHaveBeenCalledTimes(1);
  });

  it("passes true to setIsDiffLoaded on button click", async () => {
    const user = userEvent.setup();
    render(<LoadDiffPrompt {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: "Load diff" }));
    expect(mockSetIsDiffLoaded).toHaveBeenCalledWith(true);
  });

  it("does not render the description if reason is null", () => {
    render(<LoadDiffPrompt {...defaultProps} reason={null} />);
    expect(screen.queryByTestId("description")).not.toBeInTheDocument();
  });

  it("renders the correct description if reason is 'removed'", () => {
    render(<LoadDiffPrompt {...defaultProps} reason={"removed"} />);
    expect(screen.getByTestId("description")).toHaveTextContent(
      "This file was removed.",
    );
  });

  it.each<LoadDiffReason>(["size-limit", "line-limit"])(
    "renders the correct description if reason is '%s'",
    (reason) => {
      render(<LoadDiffPrompt {...defaultProps} reason={reason} />);
      expect(screen.getByTestId("description")).toHaveTextContent(
        "Large diffs are not rendered by default.",
      );
    },
  );
});
