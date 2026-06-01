import "@testing-library/jest-dom";
import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileTreeSearchBar from "./FileTreeSearchBar";

describe("FileTreeSearchBar", () => {
  const mockSetSearchString = jest.fn();
  const defaultProps: ComponentProps<typeof FileTreeSearchBar> = {
    searchString: "",
    setSearchString: mockSetSearchString,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("search magnifier icon", () => {
    it("renders in the document", () => {
      render(<FileTreeSearchBar {...defaultProps} />);
      expect(screen.getByAltText("Search")).toBeInTheDocument();
    });

    it("focuses on text input when clicked", async () => {
      const user = userEvent.setup();
      render(<FileTreeSearchBar {...defaultProps} />);
      await user.click(screen.getByAltText("Search"));
      expect(screen.getByRole("textbox")).toHaveFocus();
    });
  });

  describe("cancel icon", () => {
    it("does not render when search string is empty", () => {
      render(<FileTreeSearchBar {...defaultProps} searchString="" />);
      expect(screen.queryByAltText("Cancel search")).not.toBeInTheDocument();
    });

    it("renders when search string is non-empty", () => {
      render(<FileTreeSearchBar {...defaultProps} searchString="abc" />);
      expect(screen.getByAltText("Cancel search")).toBeInTheDocument();
    });

    it("clears the search string when clicked", async () => {
      const user = userEvent.setup();
      render(<FileTreeSearchBar {...defaultProps} searchString="abc" />);
      await user.click(screen.getByAltText("Cancel search"));
      expect(mockSetSearchString).toHaveBeenCalledWith("");
    });
  });

  describe("text input", () => {
    it("renders correct placeholder text", () => {
      render(<FileTreeSearchBar {...defaultProps} />);
      expect(screen.getByRole("textbox")).toHaveAttribute(
        "placeholder",
        "Search files",
      );
    });

    describe("focus", () => {
      it("does not have focus by default", () => {
        render(<FileTreeSearchBar {...defaultProps} />);
        expect(screen.getByRole("textbox")).not.toHaveFocus();
      });

      it("has focus when clicked", async () => {
        const user = userEvent.setup();
        render(<FileTreeSearchBar {...defaultProps} />);
        await user.click(screen.getByRole("textbox"));
        expect(screen.getByRole("textbox")).toHaveFocus();
      });
    });

    describe("value", () => {
      it("displays an empty search string", () => {
        render(<FileTreeSearchBar {...defaultProps} searchString="" />);
        expect(screen.getByRole("textbox")).toHaveValue("");
      });

      it("displays a non-empty search string", () => {
        render(<FileTreeSearchBar {...defaultProps} searchString="abc" />);
        expect(screen.getByRole("textbox")).toHaveValue("abc");
      });

      it("updates when the search string changes", () => {
        const { rerender } = render(
          <FileTreeSearchBar {...defaultProps} searchString="" />,
        );
        expect(screen.getByRole("textbox")).toHaveValue("");
        rerender(<FileTreeSearchBar {...defaultProps} searchString="abc" />);
        expect(screen.getByRole("textbox")).toHaveValue("abc");
      });
    });

    describe("on change", () => {
      it("calls setSearchString with typed characters", async () => {
        const user = userEvent.setup();
        render(<FileTreeSearchBar {...defaultProps} searchString="ab" />);
        await user.type(screen.getByRole("textbox"), "c");
        expect(mockSetSearchString).toHaveBeenCalledWith("abc");
      });

      it("calls setSearchString when cleared", async () => {
        const user = userEvent.setup();
        render(<FileTreeSearchBar {...defaultProps} searchString="abc" />);
        await user.clear(screen.getByRole("textbox"));
        expect(mockSetSearchString).toHaveBeenCalledWith("");
      });
    });
  });
});
