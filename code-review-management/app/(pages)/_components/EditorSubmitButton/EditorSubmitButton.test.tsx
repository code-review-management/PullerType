import "@testing-library/jest-dom";
import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditorSubmitButton from "./EditorSubmitButton";

jest.mock("../LoadingSpinner/LoadingSpinner", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-spinner" />,
}));

describe("EditorSubmitButton", () => {
  const mockHandleSubmit = jest.fn();

  const defaultProps: ComponentProps<typeof EditorSubmitButton> = {
    isSubmitPending: false,
    isDisabled: false,
    handleSubmit: mockHandleSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading spinner instead of arrow-up button if submit is pending", () => {
    render(<EditorSubmitButton {...defaultProps} isSubmitPending />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Arrow up")).not.toBeInTheDocument();
  });

  it("renders arrow-up button instead of loading spinner if submit is not pending", () => {
    render(<EditorSubmitButton {...defaultProps} isSubmitPending={false} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByAltText("Arrow up")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });

  it("disables button if isDisabled is true", () => {
    render(<EditorSubmitButton {...defaultProps} isDisabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not disable button if isDisabled is false", () => {
    render(<EditorSubmitButton {...defaultProps} isDisabled={false} />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("calls handleSubmit when button is clicked", async () => {
    const user = userEvent.setup();
    render(<EditorSubmitButton {...defaultProps} />);
    await user.click(screen.getByRole("button"));
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not call handleSubmit when disabled button is clicked", async () => {
    const user = userEvent.setup();
    render(<EditorSubmitButton {...defaultProps} isDisabled />);
    await user.click(screen.getByRole("button"));
    expect(mockHandleSubmit).not.toHaveBeenCalled();
  });
});
