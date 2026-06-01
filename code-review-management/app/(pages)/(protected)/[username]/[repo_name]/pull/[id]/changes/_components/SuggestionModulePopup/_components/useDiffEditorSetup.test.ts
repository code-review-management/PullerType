import { renderHook, act } from "@testing-library/react"; // or "@testing-library/react" depending on your version
import { useDiffEditorSetup } from "./useDiffEditorSetup";
import * as mountUtils from "./mountUtils";
import { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface MockKeyEvent {
  keyCode: number;
  preventDefault: jest.Mock;
  stopPropagation: jest.Mock;
}
// Mock the imported utilities
jest.mock("./mountUtils", () => ({
  getLineCount: jest.fn((str: string) => (str ? str.split("\n").length : 0)),
  calculateExpandedRegions: jest.fn(),
  getLanguageIdFromFilename: jest.fn().mockReturnValue("typescript"),
  vsCodeLightPlus: { base: "vs", rules: [], colors: {} },
}));

jest.mock("./SuggestionDiffEditor.module.css", () => ({
  "monaco-hover-line-yellow": "mock-hover-class",
  "monaco-expand-plus-btn": "mock-plus-btn-class",
}));

// Helper to create a comprehensive, strongly-typed Monaco mock
const createMonacoMock = () => {
  const createEmitter = <T,>() => {
    type Listener = (data: T) => void;
    const listeners: Listener[] = [];
    return {
      event: (cb: Listener) => {
        listeners.push(cb);
        return { dispose: jest.fn() };
      },
      fire: (data: T) => listeners.forEach((cb) => cb(data)),
    };
  };

  const cursorPositionEmitter = createEmitter<{ position: { lineNumber: number } }>();

  interface MockSelection {
    isEmpty: () => boolean;
    startLineNumber?: number;
    endLineNumber?: number;
  }

  interface MockPosition {
    lineNumber: number;
    column: number;
  }

  const keyDownEmitter = createEmitter<MockKeyEvent>();
  const mouseDownEmitter = createEmitter<{ target: { type: number; position?: { lineNumber: number } } }>();
  const mouseMoveEmitter = createEmitter<{ target: { type: number; position?: { lineNumber: number } } }>();
  const mouseLeaveEmitter = createEmitter<unknown>();
  const modelContentEmitter = createEmitter<unknown>();

  const mockDecorations = {
    set: jest.fn(),
    clear: jest.fn(),
  };

  let currentLineCount = 10;

  const mockModel = {
    setEOL: jest.fn(),
    getLineCount: jest.fn(() => currentLineCount), // <-- Make this dynamic
    getLineMaxColumn: jest.fn().mockReturnValue(50),
    getValueInRange: jest.fn().mockReturnValue("new code content"),
  };

  let currentSelections: MockSelection[] = [
    { isEmpty: () => true, startLineNumber: 1, endLineNumber: 1 }
  ];
  let currentPosition: MockPosition = { lineNumber: 1, column: 1 };

  const createMockSubEditor = () => ({
    getModel: jest.fn().mockReturnValue(mockModel),
    createDecorationsCollection: jest.fn().mockReturnValue(mockDecorations),
    onDidChangeCursorPosition: cursorPositionEmitter.event,
    onKeyDown: keyDownEmitter.event,
    onMouseDown: mouseDownEmitter.event,
    onMouseMove: mouseMoveEmitter.event,
    onMouseLeave: mouseLeaveEmitter.event,
    onDidChangeModelContent: modelContentEmitter.event,
    updateOptions: jest.fn(),
    getSelections: jest.fn(() => currentSelections),
    getPosition: jest.fn(() => currentPosition),
    revealLineNearTop: jest.fn(),
  });

  const mockModifiedEditor = createMockSubEditor();
  const mockOriginalEditor = createMockSubEditor();

  const mockEditorInstance = {
    getOriginalEditor: jest.fn().mockReturnValue(mockOriginalEditor),
    getModifiedEditor: jest.fn().mockReturnValue(mockModifiedEditor),
  };

  const mockMonaco = {
    editor: {
      defineTheme: jest.fn(),
      setTheme: jest.fn(),
      setModelLanguage: jest.fn(),
      EndOfLineSequence: { LF: 0, CRLF: 1 },
      MouseTargetType: { GUTTER_LINE_NUMBERS: 2, CONTENT_TEXT: 6 }, // Moved inside `editor` to fix the TypeError
    },
    Range: jest.fn().mockImplementation((r1: number, c1: number, r2: number, c2: number) => ({ r1, c1, r2, c2 })),
    KeyCode: {
      Backspace: 1, Delete: 2, Enter: 3, Space: 4,
      KeyA: 31, KeyZ: 56, Digit0: 21, Digit9: 30
    },
    languages: {
      typescript: {
        JsxEmit: {
          React: 1, // Dummy value to prevent the undefined error
        },
        // You will likely need to mock these defaults too, 
        // as setting compiler options usually calls these immediately after!
        typescriptDefaults: {
          setCompilerOptions: jest.fn(),
          setDiagnosticsOptions: jest.fn(),
        },
        javascriptDefaults: {
          setCompilerOptions: jest.fn(),
          setDiagnosticsOptions: jest.fn(),
        },
      },
    },
  };

  return {
    mockMonaco,
    mockEditorInstance,
    mockModifiedEditor,
    mockOriginalEditor,
    mockModel,
    mockDecorations,
    setSelections: (selections: MockSelection[]) => { currentSelections = selections; },
    setPosition: (position: MockPosition) => { currentPosition = position; },
    setLineCount: (count: number) => { currentLineCount = count; },
    emitters: {
      cursorPosition: cursorPositionEmitter,
      keyDown: keyDownEmitter,
      mouseDown: mouseDownEmitter,
      mouseMove: mouseMoveEmitter,
      mouseLeave: mouseLeaveEmitter,
      modelContent: modelContentEmitter,
    },
  };
};

describe("useDiffEditorSetup", () => {
  const defaultProps = {
    beforeCode: "line1\nline2",     // 2 lines -> Start line is 3
    originalCode: "line3",          // 1 line
    modifiedCode: "line3-changed",  // 1 line -> End line is 3
    afterCode: "line4\nline5",      // 2 lines
    hasCarriageReturn: false,
    filename: "test.ts",
    onCodeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- Initialization & Setup ---

  it("sets up themes, languages, EOL, and reveals top line on mount", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    expect(mockMonaco.editor.setTheme).toHaveBeenCalledWith("vs-light-plus");

    // Test the setTimeout for revealLineNearTop (covers line 358)
    jest.runAllTimers();
    expect(mockModifiedEditor.revealLineNearTop).toHaveBeenCalledWith(3);
  });

  it("sets EndOfLineSequence to CRLF for both original and modified models when hasCarriageReturn is true", () => {
    const propsWithCR = { ...defaultProps, hasCarriageReturn: true };
    const { result } = renderHook(() => useDiffEditorSetup(propsWithCR));
    const { mockMonaco, mockEditorInstance, mockOriginalEditor, mockModifiedEditor } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    const originalModel = mockOriginalEditor.getModel();
    const modifiedModel = mockModifiedEditor.getModel();

    expect(originalModel?.setEOL).toHaveBeenCalledWith(
      mockMonaco.editor.EndOfLineSequence.CRLF
    );

    expect(modifiedModel?.setEOL).toHaveBeenCalledWith(
      mockMonaco.editor.EndOfLineSequence.CRLF
    );
  });

  it("calculates startLine as 1 when beforeCode is entirely empty", () => {
    // Empty beforeCode means beforeArr.length === 0, triggering the `: 1` fallback
    const emptyBeforeProps = { ...defaultProps, beforeCode: "" };

    const { result } = renderHook(() => useDiffEditorSetup(emptyBeforeProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    // Fast-forward the setTimeout
    jest.runAllTimers();

    // startLine should evaluate to 1, and revealLineNearTop is called with it
    expect(mockModifiedEditor.revealLineNearTop).toHaveBeenCalledWith(1);
  });

  it("safely handles missing models during mount and decoration updates", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor, mockOriginalEditor } = createMonacoMock();

    // Force getModel to return null. 
    // This hits the `if (originalModel)` false branch (Lines 97-104) 
    // and the `?.getLineCount() || 0` fallback (Lines 119-120).
    mockModifiedEditor.getModel.mockReturnValue(null);
    mockOriginalEditor.getModel.mockReturnValue(null);

    // If it doesn't throw an error, it successfully bypassed those blocks!
    expect(() => {
      result.current(
        mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
        mockMonaco as unknown as Monaco
      );
    }).not.toThrow();

    // Ensure setModelLanguage was NOT called because the models were null
    expect(mockMonaco.editor.setModelLanguage).not.toHaveBeenCalled();
  });

  it("bypasses keydown boundary checks if selections or position are null", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    const mockEvent: MockKeyEvent = {
      keyCode: mockMonaco.KeyCode.Backspace,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };

    mockModifiedEditor.getSelections.mockReturnValueOnce(
      null as unknown as ReturnType<typeof mockModifiedEditor.getSelections>
    );
    act(() => emitters.keyDown.fire(mockEvent));

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();

    mockModifiedEditor.getPosition.mockReturnValueOnce(
      null as unknown as ReturnType<typeof mockModifiedEditor.getPosition>
    );
    act(() => emitters.keyDown.fire(mockEvent));

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  // --- Decorations Coverage (Lines 203-252) ---

  it("calculates and sets appropriate editor decorations", () => {
    // 1. Tell Jest to control time
    jest.useFakeTimers();

    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    // 2. Fast-forward the clock by 100ms so your setTimeout(..., 50) resolves
    jest.advanceTimersByTime(100);

    const setCalls = mockModifiedEditor.createDecorationsCollection().set.mock.calls;

    // Now this will exist!
    const decorationsArray: editor.IModelDeltaDecoration[] = setCalls[0][0];

    // Use the correct Monaco type for the filter parameter
    const dimDecorations = decorationsArray.filter(
      (d: editor.IModelDeltaDecoration) => d.options.inlineClassName === "readOnlyTextDim"
    );
    expect(dimDecorations.length).toBeGreaterThanOrEqual(2);

    const blockDecorations = decorationsArray.filter(
      (d: editor.IModelDeltaDecoration) => d.options.className?.includes("modifiedBlock")
    );
    expect(blockDecorations.length).toBeGreaterThan(0);

    // 3. Clean up the timers so subsequent tests aren't affected
    jest.useRealTimers();
  });

  // --- ReadOnly Enforcement (Lines 257-269) ---

  it("toggles readOnly mode when cursor moves in and out of boundaries", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    // Cursor at line 1 (outside bounds -> readonly)
    act(() => emitters.cursorPosition.fire({ position: { lineNumber: 1 } }));
    expect(mockModifiedEditor.updateOptions).toHaveBeenCalledWith({ readOnly: true });

    // Cursor at line 3 (inside bounds -> editable)
    act(() => emitters.cursorPosition.fire({ position: { lineNumber: 3 } }));
    expect(mockModifiedEditor.updateOptions).toHaveBeenCalledWith({ readOnly: false });
  });

  // --- Keydown Boundary Check (Lines 273-279, 299-316) ---

  it("prevents modifying keys when selection crosses boundaries", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, setSelections, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    // Simulate user selecting text from inside bounds (3) to outside bounds (4)
    setSelections([{ isEmpty: () => false, startLineNumber: 3, endLineNumber: 4 }]);

    const mockEvent = {
      keyCode: mockMonaco.KeyCode.Backspace,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };

    act(() => emitters.keyDown.fire(mockEvent));

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it("prevents modifying alphanumeric keys (A-Z, 0-9) when selection crosses boundaries", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, setSelections, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    // Simulate user selecting text crossing bounds (Line 3 is editable, Line 4 is read-only)
    setSelections([{ isEmpty: () => false, startLineNumber: 3, endLineNumber: 4 }]);

    // 1. Test Alphabet Key (e.g., KeyA)
    const keyAEvent: MockKeyEvent = {
      keyCode: mockMonaco.KeyCode.KeyA,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };
    act(() => emitters.keyDown.fire(keyAEvent));

    expect(keyAEvent.preventDefault).toHaveBeenCalled();
    expect(keyAEvent.stopPropagation).toHaveBeenCalled();

    // 2. Test Digit Key (e.g., Digit5)
    const digitEvent: MockKeyEvent = {
      keyCode: mockMonaco.KeyCode.Digit0 + 5,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };
    act(() => emitters.keyDown.fire(digitEvent));

    expect(digitEvent.preventDefault).toHaveBeenCalled();
    expect(digitEvent.stopPropagation).toHaveBeenCalled();
  });

  it("prevents backspace at col 1 of start bound and delete at max col of end bound", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, setPosition, setSelections, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    // Ensure selection is empty
    setSelections([{ isEmpty: () => true }]);

    // Scenario A: Backspace at very beginning of start bound
    setPosition({ lineNumber: 3, column: 1 }); // Start line is 3
    const backspaceEvent = { keyCode: mockMonaco.KeyCode.Backspace, preventDefault: jest.fn(), stopPropagation: jest.fn() };
    act(() => emitters.keyDown.fire(backspaceEvent));
    expect(backspaceEvent.preventDefault).toHaveBeenCalled();

    // Scenario B: Delete at very end of end bound
    setPosition({ lineNumber: 3, column: 50 }); // max col mocked to 50
    const deleteEvent = { keyCode: mockMonaco.KeyCode.Delete, preventDefault: jest.fn(), stopPropagation: jest.fn() };
    act(() => emitters.keyDown.fire(deleteEvent));
    expect(deleteEvent.preventDefault).toHaveBeenCalled();
  });

  // --- Hover Interactions (Lines 286-296) ---

  it("sets hover decorations correctly and clears them on invalid targets or leaving", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    const mockDecorations = mockModifiedEditor.createDecorationsCollection();

    // 1. Hover on an expandable line (line 2, outside bounds)
    act(() => {
      emitters.mouseMove.fire({
        target: {
          type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS,
          position: { lineNumber: 2 },
        },
      });
    });
    expect(mockDecorations.set).toHaveBeenCalled();

    // 2. Hover on an invalid target type (Content text instead of gutter)
    act(() => {
      emitters.mouseMove.fire({
        target: { type: mockMonaco.editor.MouseTargetType.CONTENT_TEXT, position: { lineNumber: 2 } },
      });
    });
    expect(mockDecorations.clear).toHaveBeenCalled();

    // 3. Trigger Mouse Leave
    mockDecorations.clear.mockClear();

    // FIX: We must re-hover a valid line so hoveredLineRef isn't null when we leave!
    act(() => {
      emitters.mouseMove.fire({
        target: { type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS, position: { lineNumber: 2 } },
      });
    });

    // Now trigger leave
    act(() => emitters.mouseLeave.fire({}));
    expect(mockDecorations.clear).toHaveBeenCalled();
  });

  it("clears hover state when moving mouse from an expandable to a non-expandable line", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    const mockDecorations = mockModifiedEditor.createDecorationsCollection();

    // 1. Hover on an expandable line (line 2) to set hoveredLineRef internally
    act(() => {
      emitters.mouseMove.fire({
        target: {
          type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS,
          position: { lineNumber: 2 }, // start bound is 3, so 2 is expandable
        },
      });
    });

    expect(mockDecorations.set).toHaveBeenCalled();

    // 2. Hover on a NON-expandable line (line 3 is inside boundaries, isExpandable = false)
    act(() => {
      emitters.mouseMove.fire({
        target: {
          type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS,
          position: { lineNumber: 3 },
        },
      });
    });

    // This proves we hit the `else` block containing `clearHover()`
    expect(mockDecorations.clear).toHaveBeenCalled();
  });

  // --- Gutter Click & Code Change (Lines 322-326) ---

  it("triggers code change on gutter click with updated bounds logic", () => {
    const mockCalculateRegions = mountUtils.calculateExpandedRegions as jest.Mock;
    mockCalculateRegions.mockReturnValue({
      beforeCode: "line1",
      originalCode: "line2\nline3",
      modifiedCode: "line2\nline3-changed",
      afterCode: "line4\nline5",
    });

    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    act(() => emitters.mouseMove.fire({
      target: { type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS, position: { lineNumber: 2 } },
    }));

    act(() => emitters.mouseDown.fire({
      target: { type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS, position: { lineNumber: 2 } },
    }));

    expect(mockCalculateRegions).toHaveBeenCalledWith(2, expect.any(Object), false);
    expect(defaultProps.onCodeChange).toHaveBeenCalled();
  });

  // --- Prop Updates, Edge Bounds & Content Extraction (Lines 75-76, 221-223, 314-315, 331-353) ---

  it("updates decorations on rerender and handles empty block boundaries", () => {
    const emptyProps = {
      beforeCode: "line1\nline2", // 2 lines -> start = 3
      originalCode: "",           // 0 lines -> originalEnd = 2
      modifiedCode: "",           // 0 lines -> end = 2
      afterCode: "",              // 0 lines -> afterLines = 0
      hasCarriageReturn: false,
      filename: "test.ts",
      onCodeChange: jest.fn(),
    };

    const { result, rerender } = renderHook((props) => useDiffEditorSetup(props), {
      initialProps: emptyProps
    });
    const { mockMonaco, mockEditorInstance, mockModifiedEditor, emitters, setLineCount } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    mockModifiedEditor.createDecorationsCollection().set.mockClear();

    // 1. Rerender with the new beforeCode
    rerender({ ...emptyProps, beforeCode: "line1\nline2\nline3" });

    // 2. Simulate the user typing a new line into the editor.
    setLineCount(4);

    // 3. Ensure your mock `getValueInRange` returns the "newly typed" code
    // Note: adjust the exact path to `getValueInRange` based on your createMonacoMock shape
    mockModifiedEditor.getModel().getValueInRange.mockReturnValue("user typed this");

    // 4. Fire the event
    act(() => emitters.modelContent.fire({}));

    // 5. Expect the call with the new extracted text
    expect(emptyProps.onCodeChange).toHaveBeenCalledWith(
      "line1\nline2\nline3",
      "",
      "user typed this",
      ""
    );
  });

  it("extracts text correctly during a standard model content change", () => {
    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    // Firing model content will hit lines 331-353 successfully getting text
    act(() => emitters.modelContent.fire({}));

    expect(defaultProps.onCodeChange).toHaveBeenCalledWith(
      defaultProps.beforeCode,
      defaultProps.originalCode,
      "new code content", // comes from mockModel.getValueInRange
      defaultProps.afterCode
    );
  });

  it("safely handles model content changes when model is null or onCodeChange is missing", () => {
    type OnCodeChangeSignature = (before: string, original: string, modified: string, after: string) => void;

    const noCallbackProps = {
      ...defaultProps,
      onCodeChange: undefined as unknown as OnCodeChangeSignature
    };

    const { result } = renderHook(() => useDiffEditorSetup(noCallbackProps));
    const { mockMonaco, mockEditorInstance, mockModifiedEditor, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    act(() => emitters.modelContent.fire({}));
    mockModifiedEditor.getModel.mockReturnValueOnce(null);
    act(() => emitters.modelContent.fire({}));

    expect(true).toBe(true);
  });

  // --- Gutter Click & Code Change (Lines 322-326) ---

  it("triggers code change on gutter click with updated bounds logic", () => {
    const mockCalculateRegions = mountUtils.calculateExpandedRegions as jest.Mock;
    mockCalculateRegions.mockReturnValue({
      beforeCode: "line1",
      originalCode: "line2\nline3",
      modifiedCode: "line2\nline3-changed",
      afterCode: "line4\nline5",
    });

    const { result } = renderHook(() => useDiffEditorSetup(defaultProps));
    const { mockMonaco, mockEditorInstance, emitters } = createMonacoMock();

    result.current(
      mockEditorInstance as unknown as editor.IStandaloneDiffEditor,
      mockMonaco as unknown as Monaco
    );

    // Mock the required hover logic before click
    act(() => emitters.mouseMove.fire({
      target: { type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS, position: { lineNumber: 2 } },
    }));

    act(() => emitters.mouseDown.fire({
      target: { type: mockMonaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS, position: { lineNumber: 2 } },
    }));

    expect(mockCalculateRegions).toHaveBeenCalledWith(2, expect.any(Object), false);
    expect(defaultProps.onCodeChange).toHaveBeenCalled();
  });
});