import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import MergeSuccessPopup from "./MergeSuccessPopup"; // Adjust import path if needed

describe("MergeSuccessPopup", () => {
  const defaultProps = {
    isOpen: true,
    isDark: false,
    targetBranch: "main",
    featureBranch: "feature/awesome-update",
  };

  it("does not render anything when isOpen is false", () => {
    const { container } = render(
      <MergeSuccessPopup {...defaultProps} isOpen={false} />
    );
    
    // The component should return null, leaving the container empty
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the popup with the correct text when isOpen is true", () => {
    render(<MergeSuccessPopup {...defaultProps} />);

    expect(screen.getByText("Resolution Successful!")).toBeInTheDocument();
    
    // Checks if the branch names are properly inserted into the paragraph
    expect(
      screen.getByText("feature/awesome-update is up to date with main.")
    ).toBeInTheDocument();
    
    // Checks if the emoji icon renders
    expect(screen.getByText("🎉")).toBeInTheDocument();
  });

  it("renders children elements inside the action container", () => {
    render(
      <MergeSuccessPopup {...defaultProps}>
        <button data-testid="redirect-button">Return to PR</button>
      </MergeSuccessPopup>
    );

    const button = screen.getByTestId("redirect-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Return to PR");
  });

  it("applies the dark theme class when isDark is true", () => {
    render(<MergeSuccessPopup {...defaultProps} isDark={true} />);

    // Grab an element inside the popup and traverse up to the popup container
    const title = screen.getByText("Resolution Successful!");
    const popupContainer = title.parentElement;

    // Note: If you are using identity-obj-proxy in Jest, styles.darkTheme resolves to "darkTheme"
    expect(popupContainer).toHaveClass("darkTheme");
  });

  it("does not apply the dark theme class when isDark is false", () => {
    render(<MergeSuccessPopup {...defaultProps} isDark={false} />);

    const title = screen.getByText("Resolution Successful!");
    const popupContainer = title.parentElement;

    expect(popupContainer).not.toHaveClass("darkTheme");
  });
});