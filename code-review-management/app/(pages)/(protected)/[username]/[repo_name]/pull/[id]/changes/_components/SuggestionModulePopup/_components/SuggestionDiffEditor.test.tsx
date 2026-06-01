import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { SuggestionDiffEditor, SuggestionDiffEditorProps } from "./SuggestionDiffEditor";
import { useDiffEditorSetup } from "./useDiffEditorSetup";

// 1. Mock the custom setup hook
jest.mock("./useDiffEditorSetup", () => ({
    useDiffEditorSetup: jest.fn(),
}));

// 2. Mock the Monaco Editor 
jest.mock("@monaco-editor/react", () => ({
    DiffEditor: jest.fn(({ original, modified, originalModelPath, modifiedModelPath, options }) => (
        <div data-testid="monaco-mock">
            <div data-testid="original-content">{original}</div>
            <div data-testid="modified-content">{modified}</div>
            <div data-testid="original-path">{originalModelPath}</div>
            <div data-testid="modified-path">{modifiedModelPath}</div>
            <div data-testid="options">{JSON.stringify(options)}</div>
        </div>
    )),
}));

describe("SuggestionDiffEditor", () => {
    const mockHandleEditorMount = jest.fn();
    const mockOnCodeChange = jest.fn();

    const defaultProps: SuggestionDiffEditorProps = {
        beforeCode: "line1\nline2",
        originalCode: "line3",
        modifiedCode: "line3-changed",
        afterCode: "line4\nline5",
        hasCarriageReturn: false,
        filename: "src/utils/math.ts",
        onCodeChange: mockOnCodeChange,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useDiffEditorSetup as jest.Mock).mockReturnValue(mockHandleEditorMount);
    });

    it("renders correctly with Unix line endings (\\n)", () => {
        render(<SuggestionDiffEditor {...defaultProps} />);

        const expectedOriginal = "line1\nline2\nline3\nline4\nline5";
        const expectedModified = "line1\nline2\nline3-changed\nline4\nline5";

        expect(screen.getByTestId("original-content").textContent).toBe(expectedOriginal);
        expect(screen.getByTestId("modified-content").textContent).toBe(expectedModified);
    });

    it("renders correctly with Windows line endings (\\r\\n)", () => {
        const propsWithCarriageReturn = {
            ...defaultProps,
            hasCarriageReturn: true,
            beforeCode: "line1\r\nline2",
            originalCode: "line3",
            modifiedCode: "line3-changed",
            afterCode: "line4\r\nline5",
        };

        render(<SuggestionDiffEditor {...propsWithCarriageReturn} />);

        // buildFullCode combines using "\r\n"
        const expectedOriginal = "line1\r\nline2\r\nline3\r\nline4\r\nline5";
        const expectedModified = "line1\r\nline2\r\nline3-changed\r\nline4\r\nline5";

        expect(screen.getByTestId("original-content").textContent).toBe(expectedOriginal);
        expect(screen.getByTestId("modified-content").textContent).toBe(expectedModified);
    });

    it("updates internal state when boundary props (beforeCode/afterCode) change", () => {
        const { rerender } = render(<SuggestionDiffEditor {...defaultProps} />);

        // Initial check
        expect(screen.getByTestId("original-content").textContent).toBe("line1\nline2\nline3\nline4\nline5");

        // Rerender with updated boundaries
        const updatedProps = {
            ...defaultProps,
            beforeCode: "newLine1\nnewLine2",
            afterCode: "newLine4\nnewLine5",
        };

        rerender(<SuggestionDiffEditor {...updatedProps} />);

        // Check if the component caught the derived state change and updated
        const expectedNewOriginal = "newLine1\nnewLine2\nline3\nnewLine4\nnewLine5";
        expect(screen.getByTestId("original-content").textContent).toBe(expectedNewOriginal);
    });

    it("passes correct model paths to Monaco", () => {
        render(<SuggestionDiffEditor {...defaultProps} />);

        expect(screen.getByTestId("original-path")).toHaveTextContent("original-src/utils/math.ts");
        expect(screen.getByTestId("modified-path")).toHaveTextContent("modified-src/utils/math.ts");
    });

    it("passes correct configuration options to the DiffEditor", () => {
        render(<SuggestionDiffEditor {...defaultProps} />);

        const optionsString = screen.getByTestId("options").textContent;
        const options = JSON.parse(optionsString || "{}");

        expect(options).toMatchObject({
            automaticLayout: true,
            lineHeight: 22,
            renderSideBySide: true,
            readOnly: false,
            originalEditable: false,
            wordWrap: "on",
            minimap: { enabled: false },
            ignoreTrimWhitespace: false,
            scrollBeyondLastLine: false,
            renderOverviewRuler: false,
        });
    });

    it("initializes useDiffEditorSetup with the component props", () => {
        render(<SuggestionDiffEditor {...defaultProps} />);

        // Ensures our custom hook is called with all the props so it can set up Monaco correctly
        expect(useDiffEditorSetup).toHaveBeenCalledWith(defaultProps);
    });

    it("handles undefined and null middle sections by converting them to empty strings", () => {
        // Override the default props with undefined and null
        const edgeCaseProps = {
            ...defaultProps,
            beforeCode: "line1\nline2",
            afterCode: "line4\nline5",
            hasCarriageReturn: false,
            originalCode: undefined as unknown as string,
            modifiedCode: null as unknown as string,
        };

        render(<SuggestionDiffEditor {...edgeCaseProps} />);

        // If the ternary operator works, `middle` becomes `""`. 
        // buildFullCode then joins: "line1\nline2" + "\n" + "" + "\n" + "line4\nline5"
        // Which results in a double newline where the middle code should have been.
        const expectedOutput = "line1\nline2\n\nline4\nline5";

        // originalCode was undefined -> should resolve to expectedOutput
        expect(screen.getByTestId("original-content").textContent).toBe(expectedOutput);

        // modifiedCode was null -> should resolve to expectedOutput
        expect(screen.getByTestId("modified-content").textContent).toBe(expectedOutput);
    });
});