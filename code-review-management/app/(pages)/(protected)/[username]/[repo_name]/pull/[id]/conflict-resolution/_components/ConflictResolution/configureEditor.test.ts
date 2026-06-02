import { sharedEditorOptions, updateSidePanelsUI, updateResultPanelUI } from "./configureEditor"; // Update path as needed
import { renderSideConflicts, insertReverseWidget } from "./renderConflicts";
import { ParsedConflict } from "./parseMerge";

// --- Mock Dependencies ---
jest.mock("./renderConflicts", () => ({
    renderSideConflicts: jest.fn(),
    insertReverseWidget: jest.fn(),
}));

describe("configureEditor", () => {
    let mockMonaco: any;
    let mockCurrentEditor: any;
    let mockIncomingEditor: any;
    let mockResultEditor: any;
    let mockCurrentModel: any;
    let mockIncomingModel: any;
    let mockResultModel: any;
    let mockAccessor: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockMonaco = {} as any;
        mockCurrentEditor = {} as any;
        mockIncomingEditor = {} as any;
        mockCurrentModel = {} as any;
        mockIncomingModel = {} as any;

        mockAccessor = {
            removeZone: jest.fn(),
        };

        mockResultEditor = {
            removeContentWidget: jest.fn(),
            changeViewZones: jest.fn((cb) => cb(mockAccessor)),
        };

        mockResultModel = {
            getDecorationRange: jest.fn(),
        };
    });

    describe("sharedEditorOptions", () => {
        it("should export the correct default options", () => {
            expect(sharedEditorOptions).toEqual(
                expect.objectContaining({
                    fontSize: 14,
                    fontWeight: "400",
                    renderValidationDecorations: "off",
                })
            );
        });
    });

    describe("updateSidePanelsUI", () => {
        const mockConflicts: ParsedConflict[] = [
            {
                id: "conf-1",
                currentText: "line1\nline2", // 2 lines
                incomingText: "line1", // 1 line
                currentStartLine: 10,
                incomingStartLine: 20,
                resultInsertLine: 15,
            },
        ];

        it("should transform conflicts to SideConflictBlocks and call renderSideConflicts", () => {
            const resolvedState = { "conf-1": { ours: true } }; // Current is resolved, Incoming is not
            const onAcceptCurrent = jest.fn();
            const onAcceptIncoming = jest.fn();

            (renderSideConflicts as jest.Mock)
                .mockReturnValueOnce(["new-cur-1"])
                .mockReturnValueOnce(["new-inc-1"]);

            const result = updateSidePanelsUI(
                mockMonaco,
                mockCurrentEditor,
                mockIncomingEditor,
                mockCurrentModel,
                mockIncomingModel,
                mockConflicts,
                resolvedState,
                ["old-cur"],
                ["old-inc"],
                new Map(),
                new Map(),
                new Map(),
                new Map(),
                onAcceptCurrent,
                onAcceptIncoming
            );

            // Verify return values
            expect(result).toEqual({
                newCurrentIds: ["new-cur-1"],
                newIncomingIds: ["new-inc-1"],
            });

            // Verify Current Blocks Transformation
            expect(renderSideConflicts).toHaveBeenNthCalledWith(
                1,
                mockCurrentEditor,
                mockCurrentModel,
                mockMonaco,
                [
                    {
                        id: "conf-1",
                        start: 10,
                        end: 11, // 10 + 2 lines - 1
                        text: "line1\nline2",
                        isResolved: true, // Based on resolvedState.ours
                    },
                ],
                "current",
                ["old-cur"],
                expect.any(Map),
                expect.any(Map),
                expect.any(Function)
            );

            // Verify Incoming Blocks Transformation
            expect(renderSideConflicts).toHaveBeenNthCalledWith(
                2,
                mockIncomingEditor,
                mockIncomingModel,
                mockMonaco,
                [
                    {
                        id: "conf-1",
                        start: 20,
                        end: 20, // 20 + 1 line - 1
                        text: "line1",
                        isResolved: false, // Based on missing resolvedState.theirs
                    },
                ],
                "incoming",
                ["old-inc"],
                expect.any(Map),
                expect.any(Map),
                expect.any(Function)
            );
        });

        it("should bind accept functions correctly", () => {
            const onAcceptCurrent = jest.fn();

            updateSidePanelsUI(
                mockMonaco, mockCurrentEditor, mockIncomingEditor, mockCurrentModel, mockIncomingModel,
                mockConflicts, {}, [], [], new Map(), new Map(), new Map(), new Map(),
                onAcceptCurrent, jest.fn()
            );

            // Extract the callback passed to renderSideConflicts for the "current" side
            // The callback is the 9th argument, which is index 8!
            const currentAcceptCallback = (renderSideConflicts as jest.Mock).mock.calls[0][8];

            // Simulate click
            currentAcceptCallback({ id: "conf-1", text: "sample text" });

            expect(onAcceptCurrent).toHaveBeenCalledWith("conf-1", "sample text");
        });
    });

    describe("updateResultPanelUI", () => {
        it("should clear existing widgets and view zones before updating", () => {
            const mockWidgets = new Map([["1", {} as any]]);
            const mockZones = new Map([["1", "zone1"]]);

            updateResultPanelUI(
                mockMonaco, mockResultEditor, mockResultModel,
                [], {}, {}, mockWidgets, mockZones, jest.fn()
            );

            // Verify cleanup logic
            expect(mockResultEditor.removeContentWidget).toHaveBeenCalledTimes(1);
            expect(mockWidgets.size).toBe(0);

            expect(mockResultEditor.changeViewZones).toHaveBeenCalledTimes(1);
            expect(mockAccessor.removeZone).toHaveBeenCalledWith("zone1");
            expect(mockZones.size).toBe(0);
        });

        it("should skip unresolved conflicts", () => {
            const conflicts: ParsedConflict[] = [
                { id: "conf-1", currentText: "", incomingText: "", currentStartLine: 1, incomingStartLine: 1, resultInsertLine: 1 }
            ];
            const resolvedState = {}; // NOT resolved

            updateResultPanelUI(
                mockMonaco, mockResultEditor, mockResultModel,
                conflicts, resolvedState, {}, new Map(), new Map(), jest.fn()
            );

            expect(insertReverseWidget).not.toHaveBeenCalled();
        });

        it("should skip if decoration IDs are missing for a resolved conflict", () => {
            const conflicts: ParsedConflict[] = [{ id: "conf-1" } as ParsedConflict];
            const resolvedState = { "conf-1": { ours: true } }; // Resolved!
            const resultDecorations = {}; // Missing decorations

            updateResultPanelUI(
                mockMonaco, mockResultEditor, mockResultModel,
                conflicts, resolvedState, resultDecorations, new Map(), new Map(), jest.fn()
            );

            expect(insertReverseWidget).not.toHaveBeenCalled();
        });

        it("should call insertReverseWidget and update maps for fully resolved conflicts", () => {
            const conflicts: ParsedConflict[] = [{ id: "conf-1" } as ParsedConflict];
            const resolvedState = { "conf-1": { theirs: true } }; // Resolved!
            const resultDecorations = { "conf-1": ["dec-123"] };

            const mockWidgets = new Map();
            const mockZones = new Map();
            const onReverseBlock = jest.fn();

            // Mock the model returning a specific line range for the decoration
            mockResultModel.getDecorationRange.mockReturnValue({ startLineNumber: 42 });

            // Mock the widget generation
            (insertReverseWidget as jest.Mock).mockReturnValue([
                { getId: () => "mock-widget" },
                "mock-zone-id"
            ]);

            updateResultPanelUI(
                mockMonaco, mockResultEditor, mockResultModel,
                conflicts, resolvedState, resultDecorations, mockWidgets, mockZones, onReverseBlock
            );

            // Verify the model was queried
            expect(mockResultModel.getDecorationRange).toHaveBeenCalledWith("dec-123");

            // Verify widget insertion
            expect(insertReverseWidget).toHaveBeenCalledWith(
                mockResultEditor,
                mockMonaco,
                "conf-1",
                42, // Extracted from currentRange.startLineNumber
                onReverseBlock
            );

            // Verify maps were updated with the new widget/zone
            expect(mockWidgets.get("conf-1")).toBeDefined();
            expect(mockZones.get("conf-1")).toBe("mock-zone-id");
        });
    });
});