import "@testing-library/jest-dom";
import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { createFileMetaItem } from "@/mocks/tests/filetree";
import userEvent from "@testing-library/user-event";
import FileDiffHeader from "./FileDiffHeader";

jest.mock("../FileStatusChip/FileStatusChip", () => ({
  __esModule: true,
  default: () => <div data-testid="file-status-chip" />,
}));

const defaultProps: ComponentProps<typeof FileDiffHeader> = {
  diffType: "modify",
  oldPath: "old-path.ts",
  newPath: "new-path.ts",
  isExpanded: true,
  setIsExpanded: () => {},
};

describe("FileDiffHeader", () => {
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
      const mockSetIsExpanded = jest.fn();
      const user = userEvent.setup();
      render(
        <FileDiffHeader {...defaultProps} setIsExpanded={mockSetIsExpanded} />,
      );
      await user.click(screen.getByAltText("Chevron icon pointing down"));
      expect(mockSetIsExpanded).toHaveBeenCalledTimes(1);
    });

    it("toggles boolean in setIsExpanded callback", async () => {
      const mockSetIsExpanded = jest.fn();
      const user = userEvent.setup();
      render(
        <FileDiffHeader {...defaultProps} setIsExpanded={mockSetIsExpanded} />,
      );
      await user.click(screen.getByAltText("Chevron icon pointing down"));
      // Docs: https://jestjs.io/docs/mock-functions#mock-property
      // Access the argument passed to `setIsExpanded` mock (i.e., `(prev) => !prev`).
      const toggleExpanded = mockSetIsExpanded.mock.lastCall[0];
      expect(toggleExpanded(true)).toBe(false);
      expect(toggleExpanded(false)).toBe(true);
    });
  });

  describe("file path", () => {
    it("renders both paths with an arrow for renamed files", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ status: "renamed" })}
        />,
      );
      expect(screen.getByText("old-path.ts")).toBeInTheDocument();
      expect(screen.getByText("\u2192")).toBeInTheDocument();
      expect(screen.getByText("new-path.ts")).toBeInTheDocument();
    });

    it("renders the old path for deleted files", () => {
      render(<FileDiffHeader {...defaultProps} diffType="delete" />);
      expect(screen.getByText("old-path.ts")).toBeInTheDocument();
      expect(screen.queryByText("new-path.ts")).not.toBeInTheDocument();
    });

    it("renders the new path for non-deleted files", () => {
      render(<FileDiffHeader {...defaultProps} diffType="modify" />);
      expect(screen.getByText("new-path.ts")).toBeInTheDocument();
      expect(screen.queryByText("old-path.ts")).not.toBeInTheDocument();
    });
  });

  describe("file meta", () => {
    it("renders the change count when fileMeta is provided", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ status: "renamed" })}
        />,
      );
      expect(screen.getByTestId("change-count")).toBeInTheDocument();
    });

    it("does not render the change count when fileMeta is omitted", () => {
      render(<FileDiffHeader {...defaultProps} />);
      expect(screen.queryByTestId("change-count")).not.toBeInTheDocument();
    });

    it("renders the file status chip when fileMeta is provided", () => {
      render(
        <FileDiffHeader
          {...defaultProps}
          fileMeta={createFileMetaItem({ status: "renamed" })}
        />,
      );
      expect(screen.getByTestId("file-status-chip")).toBeInTheDocument();
    });

    it("does not render the file status chip when fileMeta is omitted", () => {
      render(<FileDiffHeader {...defaultProps} />);
      expect(screen.queryByTestId("file-status-chip")).not.toBeInTheDocument();
    });
  });
});

describe("ChangeCount", () => {
  it("renders deletions when greater than zero", () => {
    render(
      <FileDiffHeader
        {...defaultProps}
        fileMeta={createFileMetaItem({ deletions: 3, additions: 0 })}
      />,
    );
    expect(screen.getByText("-3")).toBeInTheDocument();
  });

  it("renders additions when greater than zero", () => {
    render(
      <FileDiffHeader
        {...defaultProps}
        fileMeta={createFileMetaItem({ deletions: 0, additions: 5 })}
      />,
    );
    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("renders both deletions and additions when greater than zero", () => {
    render(
      <FileDiffHeader
        {...defaultProps}
        fileMeta={createFileMetaItem({ deletions: 3, additions: 5 })}
      />,
    );
    expect(screen.getByText("-3")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("does not render deletions or additions when zero", () => {
    render(
      <FileDiffHeader
        {...defaultProps}
        fileMeta={createFileMetaItem({ deletions: 0, additions: 0 })}
      />,
    );
    expect(screen.queryByTestId("change-count")).not.toBeInTheDocument();
  });
});
