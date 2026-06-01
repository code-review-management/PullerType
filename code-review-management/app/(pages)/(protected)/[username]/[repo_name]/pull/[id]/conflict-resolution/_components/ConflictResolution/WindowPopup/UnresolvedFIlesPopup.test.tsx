import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UnresolvedFilesPopup from "./UnresolvedFilesPopup"; // Adjust the import path if needed

describe("UnresolvedFilesPopup", () => {
  const mockOnClose = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    files: ["src/utils/math.ts", "src/components/Button.tsx"],
    isDarkMode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render anything when isOpen is false", () => {
    const { container } = render(
      <UnresolvedFilesPopup {...defaultProps} isOpen={false} />
    );

    // The component should return null, leaving the DOM empty
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the popup title, icon, and message when isOpen is true", () => {
    render(<UnresolvedFilesPopup {...defaultProps} />);

    expect(screen.getByText("⚠️")).toBeInTheDocument();
    expect(screen.getByText("Caution")).toBeInTheDocument();
    expect(
      screen.getByText("These files have either a manual or no resolution:")
    ).toBeInTheDocument();
  });

  it("renders the list of unresolved files", () => {
    render(<UnresolvedFilesPopup {...defaultProps} />);

    // Verify all passed files are rendered in the list
    expect(screen.getByText("src/utils/math.ts")).toBeInTheDocument();
    expect(screen.getByText("src/components/Button.tsx")).toBeInTheDocument();
    
    // Verify it rendered exactly 2 list items
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
  });

  it("renders children elements properly", () => {
    render(
      <UnresolvedFilesPopup {...defaultProps}>
        <button data-testid="proceed-btn">Proceed Anyway</button>
      </UnresolvedFilesPopup>
    );

    const button = screen.getByTestId("proceed-btn");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Proceed Anyway");
  });

  it("calls onClose when the background overlay is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<UnresolvedFilesPopup {...defaultProps} />);

    // The overlay is the root element returned by the component
    const overlay = container.firstChild as HTMLElement;
    
    await user.click(overlay);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onClose when the popup container itself is clicked", async () => {
    const user = userEvent.setup();
    render(<UnresolvedFilesPopup {...defaultProps} />);

    // Grab an element inside the inner popup (like the title) and click it
    const title = screen.getByText("Caution");
    const popupContainer = title.parentElement as HTMLElement;
    
    await user.click(popupContainer);

    // Because of e.stopPropagation(), onClose should not fire
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("applies the dark theme class when isDarkMode is true", () => {
    render(<UnresolvedFilesPopup {...defaultProps} isDarkMode={true} />);

    const title = screen.getByText("Caution");
    const popupContainer = title.parentElement as HTMLElement;

    // Checks for the darkTheme class being appended
    expect(popupContainer).toHaveClass("darkTheme");
  });

  it("does not apply the dark theme class when isDarkMode is false", () => {
    render(<UnresolvedFilesPopup {...defaultProps} isDarkMode={false} />);

    const title = screen.getByText("Caution");
    const popupContainer = title.parentElement as HTMLElement;

    expect(popupContainer).not.toHaveClass("darkTheme");
  });
});