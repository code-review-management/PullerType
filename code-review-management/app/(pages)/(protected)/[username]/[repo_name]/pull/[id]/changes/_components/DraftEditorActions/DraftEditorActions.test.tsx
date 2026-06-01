import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { getExampleThreadDraftItem1 } from "@/mocks/tests/threads";
import userEvent from "@testing-library/user-event";
import DraftEditorActions from "./DraftEditorActions";

const mockUseSubmitDraftItem = jest.fn();
const mockUseMarkdownEditorContext = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({
    username: "owner",
    repo_name: "repo",
    id: "1",
  }),
}));

jest.mock("../../_hooks/useSubmitDraftItem", () => ({
  useSubmitDraftItem: () => mockUseSubmitDraftItem(),
}));

jest.mock("@components/MarkdownEditor/MarkdownEditorContext", () => ({
  useMarkdownEditorContext: () => mockUseMarkdownEditorContext(),
}));

jest.mock(
  "@/app/(pages)/_components/EditorSubmitButton/EditorSubmitButton",
  () => ({
    __esModule: true,
    default: ({
      isSubmitPending,
      isDisabled,
      handleSubmit,
    }: {
      isSubmitPending: boolean;
      isDisabled: boolean;
      handleSubmit: () => void;
    }) => (
      <div
        data-testid="editor-submit-button"
        data-submit-pending={isSubmitPending}
        data-disabled={isDisabled}
        onClick={handleSubmit}
      />
    ),
  }),
);

describe("DraftEditorActions", () => {
  const mockDraft = getExampleThreadDraftItem1();
  const mockHandleSubmit = jest.fn();

  const defaultUseSubmitDraftItem = {
    isSubmitPending: false,
    isPullPending: false,
    handleSubmit: mockHandleSubmit,
  };

  const defaultUseMarkdownEditorContext = {
    editorContent: "test-editor-content",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseSubmitDraftItem.mockReturnValue(defaultUseSubmitDraftItem);
    mockUseMarkdownEditorContext.mockReturnValue(
      defaultUseMarkdownEditorContext,
    );
  });

  describe("EditorSubmitButton", () => {
    it("renders in the document", () => {
      render(<DraftEditorActions draft={mockDraft} />);
      expect(screen.getByTestId("editor-submit-button")).toBeInTheDocument();
    });

    describe("isSubmitPending prop", () => {
      it("passes true when submit is pending", () => {
        mockUseSubmitDraftItem.mockReturnValue({
          ...defaultUseSubmitDraftItem,
          isSubmitPending: true,
        });
        render(<DraftEditorActions draft={mockDraft} />);
        expect(screen.getByTestId("editor-submit-button")).toHaveAttribute(
          "data-submit-pending",
          "true",
        );
      });

      it("passes false when submit is not pending", () => {
        mockUseSubmitDraftItem.mockReturnValue({
          ...defaultUseSubmitDraftItem,
          isSubmitPending: false,
        });
        render(<DraftEditorActions draft={mockDraft} />);
        expect(screen.getByTestId("editor-submit-button")).toHaveAttribute(
          "data-submit-pending",
          "false",
        );
      });
    });

    describe("isDisabled prop", () => {
      it("is enabled when neither draft is blank nor pull is pending", () => {
        render(<DraftEditorActions draft={mockDraft} />);
        expect(screen.getByTestId("editor-submit-button")).toHaveAttribute(
          "data-disabled",
          "false",
        );
      });

      it("is disabled when draft is blank", () => {
        mockUseMarkdownEditorContext.mockReturnValue({
          editorContent: "",
        });
        render(<DraftEditorActions draft={mockDraft} />);
        expect(screen.getByTestId("editor-submit-button")).toHaveAttribute(
          "data-disabled",
          "true",
        );
      });

      it("is disabled when draft contains only whitespace", () => {
        mockUseMarkdownEditorContext.mockReturnValue({
          editorContent: "   \n \t ",
        });
        render(<DraftEditorActions draft={mockDraft} />);
        expect(screen.getByTestId("editor-submit-button")).toHaveAttribute(
          "data-disabled",
          "true",
        );
      });

      it("is disabled when pull is pending", () => {
        mockUseSubmitDraftItem.mockReturnValue({
          ...defaultUseSubmitDraftItem,
          isPullPending: true,
        });
        render(<DraftEditorActions draft={mockDraft} />);
        expect(screen.getByTestId("editor-submit-button")).toHaveAttribute(
          "data-disabled",
          "true",
        );
      });
    });

    describe("handleSubmit prop", () => {
      it("calls submit handler on click", async () => {
        const user = userEvent.setup();
        render(<DraftEditorActions draft={mockDraft} />);
        await user.click(screen.getByTestId("editor-submit-button"));
        expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });
});
