import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ComponentProps, ReactNode, useEffect } from "react";
import type * as MonacoEditor from "monaco-editor";
import ConflictResolution from "./ConflictResolution";
import { updateSidePanelsUI, updateResultPanelUI } from "./configureEditor";

// --- Types ---
type TransferCallback = (blockId: string, text: string) => void;
type ReverseCallback = (blockId: string) => void;

// --- Mock Editor Implementations ---
const mockModel = {
    getLineCount: jest.fn().mockReturnValue(10),
    deltaDecorations: jest.fn().mockReturnValue(["dec-1"]),
    getDecorationRange: jest.fn().mockReturnValue({ startLineNumber: 1, endLineNumber: 2 }),
    getValue: jest.fn().mockReturnValue("mock content"),
} as unknown as MonacoEditor.editor.ITextModel;

const mockEditorInstance = {
    setModel: jest.fn(),
    saveViewState: jest.fn().mockReturnValue({ state: "saved" }),
    restoreViewState: jest.fn(),
    executeEdits: jest.fn(),
    removeContentWidget: jest.fn(),
    changeViewZones: jest.fn((cb: (accessor: unknown) => void) => cb({ removeZone: jest.fn() })),
    getValue: jest.fn().mockReturnValue("editor content"),
} as unknown as MonacoEditor.editor.IStandaloneCodeEditor;

const mockMonacoInstance = {
    editor: {
        createModel: jest.fn().mockReturnValue(mockModel),
        TrackedRangeStickiness: { AlwaysGrowsWhenTypingAtEdges: 1 },
    },
    Uri: { file: jest.fn((path: string) => path) },
    Range: class Range {
        constructor(
            public startLineNumber: number,
            public startColumn: number,
            public endLineNumber: number,
            public endColumn: number
        ) { }
    },
};

const mockUseMonaco = jest.fn().mockReturnValue(mockMonacoInstance);

// 1. Define strict types for the properties we care about
interface EditorMockProps {
    onMount?: (editor: MonacoEditor.editor.IStandaloneCodeEditor) => void;
    theme?: string;
    defaultLanguage?: string;
    options?: unknown;
}

// 2. Capitalize the function name so React recognizes it as a Component and allows Hooks
const MockEditorImpl = ({ onMount }: EditorMockProps) => {
    useEffect(() => {
        if (onMount) {
            onMount(mockEditorInstance);
        }
    }, [onMount]);
    return <div data-testid="monaco-editor" />;
};

// 3. Wrap it in a jest.fn() so we can override it in specific tests
const mockEditorComponent = jest.fn(MockEditorImpl);

jest.mock("@monaco-editor/react", () => ({
    Editor: (props: EditorMockProps) => mockEditorComponent(props),
    useMonaco: () => mockUseMonaco(),
    loader: { config: jest.fn() },
}));

// --- Mock Dependencies ---

jest.mock("monaco-editor", () => ({
    editor: {
        TrackedRangeStickiness: { AlwaysGrowsWhenTypingAtEdges: 1 },
    },
    Uri: { file: jest.fn((path: string) => path) },
    Range: class Range {
        constructor(startLine: number, startColumn: number, endLine: number, endColumn: number) { }
    },
}));

jest.mock("./useIsDark", () => ({
    __esModule: true,
    default: () => ({ isDark: false }),
}));

jest.mock("@components/HeaderButton/HeaderButton", () => ({
    __esModule: true,
    default: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
        <button data-testid="header-button" onClick={onClick}>
            {children}
        </button>
    ),
}));

jest.mock("./WindowPopup/MergeSuccessPopup", () => ({
    __esModule: true,
    default: ({ children, isOpen }: { children: ReactNode; isOpen: boolean }) =>
        isOpen ? <div data-testid="success-popup">{children}</div> : null,
}));

jest.mock("./WindowPopup/UnresolvedFilesPopup", () => ({
    __esModule: true,
    default: ({ children, isOpen }: { children: ReactNode; isOpen: boolean }) =>
        isOpen ? <div data-testid="unresolved-popup">{children}</div> : null,
}));

jest.mock("./parseMerge", () => ({
    parseMerge: jest.fn().mockReturnValue({
        currentContent: "current",
        incomingContent: "incoming",
        resultContent: "result",
        conflicts: [{ id: "conflict-1", resultInsertLine: 1 }],
    }),
}));

jest.mock("./configureEditor", () => ({
    updateSidePanelsUI: jest.fn().mockReturnValue({
        newCurrentIds: ["curr-1"],
        newIncomingIds: ["inc-1"],
    }),
    updateResultPanelUI: jest.fn(),
    sharedEditorOptions: {},
}));

jest.mock("./syncedScrolling", () => ({
    generateAnchors: jest.fn().mockReturnValue([{ currentLine: 1, incomingLine: 1, resultLine: 1 }]),
    bindInterpolatedScroll: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    refreshAnchors: jest.fn(),
}));

// --- Test Suite ---

describe("ConflictResolution - Advanced Coverage", () => {
    const defaultProps: ComponentProps<typeof ConflictResolution> = {
        conflictResolutionProp: {
            branchInfoProp: {
                owner: "test-owner",
                repo: "test-repo",
                pullId: "123",
                targetBranch: "main",
                featureBranch: "feature-branch",
            },
            mergeOutput: {
                targetShaAtMerge: "sha123",
                mergedFiles: [
                    { filename: "src/index.ts", contents: "<<< HEAD...", hasConflict: true },
                    { filename: "src/utils.ts", contents: "<<< HEAD...", hasConflict: true },
                ],
            },
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn() as jest.Mock;
        global.alert = jest.fn() as jest.Mock;
    });

    it("handles model caching, view state restoration, and synced scrolling bindings on mount and tab switch", async () => {
        render(<ConflictResolution {...defaultProps} />);

        // Verifies lines 117-219 & 671-701: Editor initialization, model creation, and onMount bindings
        await waitFor(() => {
            expect(mockMonacoInstance.editor.createModel).toHaveBeenCalledTimes(3); // current, incoming, result
            expect(mockEditorInstance.setModel).toHaveBeenCalledTimes(3);
        });

        // Verifies lines 515-585: updateSidePanelsUI & updateResultPanelUI are called after mount
        expect(updateSidePanelsUI).toHaveBeenCalled();
        expect(updateResultPanelUI).toHaveBeenCalled();

        // Trigger tab switch to verify caching and restoreViewState
        fireEvent.click(screen.getByText("src/utils.ts"));

        await waitFor(() => {
            // It saves the view state of the old file
            expect(mockEditorInstance.saveViewState).toHaveBeenCalled();
            // It creates 3 NEW models for the new file
            expect(mockMonacoInstance.editor.createModel).toHaveBeenCalledTimes(6);
        });

        // Go back to the first tab to trigger view state restoration
        fireEvent.click(screen.getByText("src/index.ts"));

        await waitFor(() => {
            expect(mockEditorInstance.restoreViewState).toHaveBeenCalledWith({ state: "saved" });
        });
    });

    it("handles block transfers and reversals correctly via passed UI callbacks", async () => {
        render(<ConflictResolution {...defaultProps} />);

        await waitFor(() => {
            expect(updateSidePanelsUI).toHaveBeenCalled();
            expect(updateResultPanelUI).toHaveBeenCalled();
        });

        const updateSideMock = updateSidePanelsUI as jest.Mock;
        const updateResultMock = updateResultPanelUI as jest.Mock;

        const onTransferOurs = updateSideMock.mock.calls[0][13] as TransferCallback;
        const onReverseBlock = updateResultMock.mock.calls[0][8] as ReverseCallback;

        // Wrap state-updating callbacks in act()
        act(() => {
            onTransferOurs("conflict-1", "Ours text data");
        });
        expect(mockEditorInstance.executeEdits).toHaveBeenCalledWith("merge-resolver", expect.any(Array));
        expect(mockModel.deltaDecorations).toHaveBeenCalled();

        act(() => {
            onReverseBlock("conflict-1");
        });
        expect(mockEditorInstance.executeEdits).toHaveBeenCalledWith("merge-resolver-undo", expect.any(Array));
    });

    it("handles API merge submission and success flow", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: "Success" }),
        });

        const singleFileProps = {
            ...defaultProps,
            conflictResolutionProp: {
                ...defaultProps.conflictResolutionProp,
                mergeOutput: {
                    ...defaultProps.conflictResolutionProp.mergeOutput,
                    mergedFiles: [
                        { filename: "src/index.ts", contents: "<<< HEAD...", hasConflict: true },
                    ],
                },
            },
        };

        render(<ConflictResolution {...singleFileProps} />);

        await waitFor(() => expect(updateSidePanelsUI).toHaveBeenCalled());
        const onTransferOurs = (updateSidePanelsUI as jest.Mock).mock.calls[0][13] as TransferCallback;

        // Force the state to update before we click the merge button
        act(() => {
            onTransferOurs("conflict-1", "Resolved text");
        });

        const mergeButton = screen.getByText("Merge");

        // Catch the async state changes (isMerging, successPopup)
        await act(async () => {
            fireEvent.click(mergeButton);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/v1/test-owner/test-repo/pulls/123/conflicts/commit-merge",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                })
            );
            expect(screen.getByTestId("success-popup")).toBeInTheDocument();
        });
    });

    it("intercepts unresolved files, displays popup, and allows forceful proceed", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        render(<ConflictResolution {...defaultProps} />);

        act(() => {
            fireEvent.click(screen.getByText("Merge"));
        });

        await waitFor(() => {
            expect(screen.getByTestId("unresolved-popup")).toBeInTheDocument();
        });

        const proceedButton = screen.getByText("Proceed");

        // Catch the fetch and state updates after forceful proceed
        await act(async () => {
            fireEvent.click(proceedButton);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    it("alerts the user if the merge API call fails", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        const singleFileProps = {
            ...defaultProps,
            conflictResolutionProp: {
                ...defaultProps.conflictResolutionProp,
                mergeOutput: {
                    ...defaultProps.conflictResolutionProp.mergeOutput,
                    mergedFiles: [
                        { filename: "src/index.ts", contents: "<<< HEAD...", hasConflict: true },
                    ],
                },
            },
        };

        render(<ConflictResolution {...singleFileProps} />);

        await waitFor(() => expect(updateSidePanelsUI).toHaveBeenCalled());
        const onTransferOurs = (updateSidePanelsUI as jest.Mock).mock.calls[0][13] as TransferCallback;

        act(() => {
            onTransferOurs("conflict-1", "Resolved text");
        });

        await act(async () => {
            fireEvent.click(screen.getByText("Merge"));
        });

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith("Merge Failed, something went wrong");
        });
    });

    it("safely handles a null activeFile when calculating resolvedState (line 113)", () => {
        // Passing no files with conflicts forces activeFile to evaluate to null
        const noActiveFileProps = {
            ...defaultProps,
            conflictResolutionProp: {
                ...defaultProps.conflictResolutionProp,
                mergeOutput: {
                    ...defaultProps.conflictResolutionProp.mergeOutput,
                    mergedFiles: [
                        { filename: "src/clean.ts", contents: "no conflicts", hasConflict: false },
                    ],
                },
            },
        };

        // If line 113 did not have the `?` ternary and `|| {}` fallback, 
        // this render would throw a TypeError trying to read `filename` of null.
        render(<ConflictResolution {...noActiveFileProps} />);
        expect(screen.getByText("No conflicts to resolve.")).toBeInTheDocument();
    });

    it("cleans up widgets from all editors when switching files (lines 526, 535, 545)", async () => {
        const updateSideMock = updateSidePanelsUI as jest.Mock;
        const updateResultMock = updateResultPanelUI as jest.Mock;

        // Create a strict typed dummy widget
        const dummyWidget: MonacoEditor.editor.IContentWidget = {
            getId: () => "test-widget",
            getDomNode: () => document.createElement("div"),
            getPosition: () => null,
        };

        // 1. Temporarily mock the UI builders to inject widgets into the Maps on first render
        updateSideMock.mockImplementationOnce(
            (
                monaco: unknown,
                ce: unknown,
                ie: unknown,
                cm: unknown,
                im: unknown,
                confs: unknown,
                state: unknown,
                cDec: unknown,
                iDec: unknown,
                currentMap: Map<string, MonacoEditor.editor.IContentWidget>,
                incomingMap: Map<string, MonacoEditor.editor.IContentWidget>
            ) => {
                currentMap.set("c-widget", dummyWidget);
                incomingMap.set("i-widget", dummyWidget);
                return { newCurrentIds: [], newIncomingIds: [] };
            }
        );

        updateResultMock.mockImplementationOnce(
            (
                monaco: unknown,
                re: unknown,
                rm: unknown,
                confs: unknown,
                state: unknown,
                rDec: unknown,
                resultMap: Map<string, MonacoEditor.editor.IContentWidget>
            ) => {
                resultMap.set("r-widget", dummyWidget);
            }
        );

        render(<ConflictResolution {...defaultProps} />);

        // Wait for the initial render to complete and populate the maps
        await waitFor(() => {
            expect(updateSidePanelsUI).toHaveBeenCalled();
            expect(updateResultPanelUI).toHaveBeenCalled();
        });

        // Clear the mocked editor's call history so we only count the cleanup phase
        (mockEditorInstance.removeContentWidget as jest.Mock).mockClear();

        // 2. Trigger a file switch. This fires the useEffect containing the cleanup loops
        act(() => {
            fireEvent.click(screen.getByText("src/utils.ts"));
        });

        // 3. Verify that removeContentWidget was fired for the widgets in all 3 Maps
        await waitFor(() => {
            // Since all 3 mock editors share the same mockEditorInstance in our setup, 
            // the method should be called exactly 3 times (once per map).
            expect(mockEditorInstance.removeContentWidget).toHaveBeenCalledTimes(3);
        });
    });

    it("aborts block transfers and reversals if decoration ranges are missing or invalid (lines 284-294, 360-367)", async () => {
        // Renders and waits for initial setup
        render(<ConflictResolution {...defaultProps} />);
        await waitFor(() => expect(updateSidePanelsUI).toHaveBeenCalled());

        const updateSideMock = updateSidePanelsUI as jest.Mock;
        const updateResultMock = updateResultPanelUI as jest.Mock;

        const onTransferOurs = updateSideMock.mock.calls[0][13] as TransferCallback;
        const onReverseBlock = updateResultMock.mock.calls[0][8] as ReverseCallback;

        // Clear previous edits call counts
        (mockEditorInstance.executeEdits as jest.Mock).mockClear();

        // 1. Force `getDecorationRange` to return null to simulate a missing decoration in Monaco
        (mockModel.getDecorationRange as jest.Mock).mockReturnValueOnce(null);

        act(() => {
            onTransferOurs("conflict-1", "Ours text data");
        });

        // The early return (line ~294) prevents executeEdits from running
        expect(mockEditorInstance.executeEdits).not.toHaveBeenCalled();

        // 2. Force `getDecorationRange` to return null again for the reverse operation
        (mockModel.getDecorationRange as jest.Mock).mockReturnValueOnce(null);

        act(() => {
            onReverseBlock("conflict-1");
        });

        // The early return (line ~367) prevents executeEdits from running
        expect(mockEditorInstance.executeEdits).not.toHaveBeenCalled();
    });

    it("parses un-cached files when calculating unresolved conflicts during a merge (line 435)", async () => {
        // We use defaultProps, which has TWO conflicting files: `src/index.ts` and `src/utils.ts`.
        // `src/index.ts` is the active file, so it gets cached immediately on mount.
        // `src/utils.ts` is NOT active, so it has NO cache entry.
        render(<ConflictResolution {...defaultProps} />);
        await waitFor(() => expect(updateSidePanelsUI).toHaveBeenCalled());

        // Resolve the active file (`src/index.ts`) completely.
        const onTransferOurs = (updateSidePanelsUI as jest.Mock).mock.calls[0][13] as TransferCallback;
        act(() => {
            onTransferOurs("conflict-1", "Resolved text");
        });

        // Click Merge.
        act(() => {
            fireEvent.click(screen.getByText("Merge"));
        });

        // Because `src/utils.ts` was never opened, `workspaceCache.current['src/utils.ts']` is undefined.
        // The code hits the `else` block (line 435) to call `parseMerge(file.contents)` to check for conflicts.
        // It finds them and correctly stops the merge to show the popup.
        await waitFor(() => {
            expect(screen.getByTestId("unresolved-popup")).toBeInTheDocument();
        });
    });

    it("prevents multiple API submissions while a merge is already in progress (lines 414, 457)", async () => {
        // 1. Set up a deferred fetch promise so we can control when it resolves
        let resolveFetch: (value: Response) => void = () => { };
        const fetchPromise = new Promise<Response>((resolve) => {
            resolveFetch = resolve;
        });

        (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

        const singleFileProps = {
            ...defaultProps,
            conflictResolutionProp: {
                ...defaultProps.conflictResolutionProp,
                mergeOutput: {
                    ...defaultProps.conflictResolutionProp.mergeOutput,
                    mergedFiles: [
                        { filename: "src/index.ts", contents: "<<< HEAD...", hasConflict: true },
                    ],
                },
            },
        };

        render(<ConflictResolution {...singleFileProps} />);
        await waitFor(() => expect(updateSidePanelsUI).toHaveBeenCalled());

        // Resolve the single conflict
        const onTransferOurs = (updateSidePanelsUI as jest.Mock).mock.calls[0][13] as TransferCallback;
        act(() => {
            onTransferOurs("conflict-1", "Resolved text");
        });

        const mergeButton = screen.getByText("Merge");

        act(() => {
            fireEvent.click(mergeButton);
        });

        act(() => {
            fireEvent.click(mergeButton);
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        await act(async () => {
            resolveFetch({
                ok: true,
                json: async () => ({ message: "Success" }),
            } as Response);
        });
    });

    it("hits defensive early returns when cache is missing during scroll sync", () => {
        mockUseMonaco.mockReturnValueOnce(null);
        render(<ConflictResolution {...defaultProps} />);
        expect(screen.getByText("Current (Ours)")).toBeInTheDocument();
    });

    it("hits defensive early returns when cache is missing during UI updates", async () => {
        // 1. Deep copy the props so we can mutate the object in memory without affecting other tests
        const mutatedProps = JSON.parse(JSON.stringify(defaultProps));
        const activeFileRef = mutatedProps.conflictResolutionProp.mergeOutput.mergedFiles[0];

        render(<ConflictResolution {...mutatedProps} />);
        await waitFor(() => expect(updateSidePanelsUI).toHaveBeenCalled());

        // 2. Secretly mutate the filename so it no longer matches the cache key
        activeFileRef.filename = "phantom-file.ts";

        // 3. Trigger a state update to `globalResolvedState`. 
        // This forces the UI-update useEffect to fire. It will look for "phantom-file.ts"
        // in the cache, find nothing, and safely hit `if (!cache) return; // Wait until models are created`.
        const updateSideMock = updateSidePanelsUI as jest.Mock;
        const onTransferOurs = updateSideMock.mock.calls[0][13] as TransferCallback;

        act(() => {
            onTransferOurs("conflict-1", "Ours text data");
        });

        // The component survives the cache miss without crashing.
        expect(screen.getByText("Current (Ours)")).toBeInTheDocument();
    });

    it("aborts state updates when activeFile is null", () => {
        // To cover `if (!activeFile) return;` we provide an empty array of files.
        // The component will evaluate activeFile as null and hit the early returns
        // at the root level and prevent any callbacks from accessing uninitialized states.
        const emptyProps = {
            ...defaultProps,
            conflictResolutionProp: {
                ...defaultProps.conflictResolutionProp,
                mergeOutput: {
                    ...defaultProps.conflictResolutionProp.mergeOutput,
                    mergedFiles: [],
                },
            },
        };

        render(<ConflictResolution {...emptyProps} />);

        // Verifies the top-level activeFile guard catches the null state
        expect(screen.getByText("No conflicts to resolve.")).toBeInTheDocument();
    });

    it("achieves full branch coverage for editor guards (lines 117, 230, 522) by selectively mounting", () => {
        // 1. We intercept the onMount callbacks so we can trigger them manually
        let mountCurrent: ((editor: MonacoEditor.editor.IStandaloneCodeEditor) => void) | undefined;
        let mountIncoming: ((editor: MonacoEditor.editor.IStandaloneCodeEditor) => void) | undefined;
        let mountResult: ((editor: MonacoEditor.editor.IStandaloneCodeEditor) => void) | undefined;
        let editorCount = 0;

        mockEditorComponent.mockImplementation((props: EditorMockProps) => {
            // The component renders 3 editors in order: Current, Incoming, Result
            if (editorCount === 0) mountCurrent = props.onMount;
            else if (editorCount === 1) mountIncoming = props.onMount;
            else if (editorCount === 2) mountResult = props.onMount;

            editorCount++;
            return <div data-testid="manual-editor" />;
        });

        // 2. Initial render. activeFile and monaco exist, but ALL editors are null.
        // Effects run and hit `!currentEditor`.
        render(<ConflictResolution {...defaultProps} />);

        // 3. Mount ONLY the current editor.
        // This updates state, triggering the useEffects again. 
        // They pass `!currentEditor` but hit `!incomingEditor`.
        act(() => {
            if (mountCurrent) mountCurrent(mockEditorInstance);
        });

        // 4. Mount ONLY the incoming editor.
        // Triggers effects again. Passes current & incoming, but hits `!resultEditor`.
        act(() => {
            if (mountIncoming) mountIncoming(mockEditorInstance);
        });

        // 5. Finally, mount the result editor.
        // Triggers effects again. All exist, so it passes the guards entirely.
        act(() => {
            if (mountResult) mountResult(mockEditorInstance);
        });

        // Restore the default mock behavior for any other tests
        mockEditorComponent.mockImplementation(MockEditorImpl);
    });
});