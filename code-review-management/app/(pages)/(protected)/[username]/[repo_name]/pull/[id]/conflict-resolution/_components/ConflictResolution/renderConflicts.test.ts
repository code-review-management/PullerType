import { renderSideConflicts, insertReverseWidget, SideConflictBlock } from "./renderConflicts"; // Update path as needed
import type * as MonacoEditor from "monaco-editor";

// --- Mock Setup ---
describe("renderConflicts", () => {
  let mockAccessor: any;
  let mockEditor: any;
  let mockModel: any;
  let mockMonaco: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the view zone accessor
    mockAccessor = {
      addZone: jest.fn().mockReturnValue("new-zone-id"),
      removeZone: jest.fn(),
    };

    // Mock the standalone editor instance
    mockEditor = {
      changeViewZones: jest.fn((callback) => callback(mockAccessor)),
      addContentWidget: jest.fn(),
      removeContentWidget: jest.fn(),
    };

    // Mock the text model
    mockModel = {
      deltaDecorations: jest.fn().mockReturnValue(["new-dec-1", "new-dec-2"]),
    };

    // Mock the monaco global object
    mockMonaco = {
      Range: jest.fn().mockImplementation((startLine, startCol, endLine, endCol) => ({
        startLine,
        startCol,
        endLine,
        endCol,
      })),
      editor: {
        ContentWidgetPositionPreference: {
          ABOVE: 1,
        },
      },
    } as any;
  });

  describe("renderSideConflicts", () => {
    it("should clear old widgets and view zones before rendering new ones", () => {
      const oldWidgets = new Map<string, any>([
        ["1", { getId: () => "widget1" }],
      ]);
      const oldZoneIds = new Map<string, string>([["1", "zone1"]]);
      const acceptFunc = jest.fn();

      renderSideConflicts(
        mockEditor,
        mockModel,
        mockMonaco,
        [], // No new blocks
        "current",
        ["old-dec-1"],
        oldWidgets,
        oldZoneIds,
        acceptFunc
      );

      // Verify clearance
      expect(mockEditor.removeContentWidget).toHaveBeenCalledTimes(1);
      expect(mockAccessor.removeZone).toHaveBeenCalledWith("zone1");
      expect(mockModel.deltaDecorations).toHaveBeenCalledWith(["old-dec-1"], []);
    });

    it("should render widgets and decorations for unresolved blocks", () => {
      const blocks: SideConflictBlock[] = [
        { id: "c1", start: 2, end: 5, text: "const a = 1;", isResolved: false },
        { id: "c2", start: 8, end: 8, text: "let b = 2;", isResolved: true }, // Resolved block
      ];
      const widgetsMap = new Map();
      const zonesMap = new Map();
      const acceptFunc = jest.fn();

      const newDecorations = renderSideConflicts(
        mockEditor,
        mockModel,
        mockMonaco,
        blocks,
        "incoming",
        [],
        widgetsMap,
        zonesMap,
        acceptFunc
      );

      // 1. Should add one widget and view zone for the unresolved block
      expect(mockEditor.addContentWidget).toHaveBeenCalledTimes(1);
      expect(mockAccessor.addZone).toHaveBeenCalledTimes(1);
      expect(mockAccessor.addZone).toHaveBeenCalledWith({
        afterLineNumber: 1, // block.start (2) - 1
        heightInLines: 1,
        domNode: expect.any(HTMLElement),
      });

      // Maps should be updated
      expect(widgetsMap.has("c1")).toBe(true);
      expect(zonesMap.has("c1")).toBe(true);
      expect(widgetsMap.has("c2")).toBe(false); // Resolved block skipped

      // 2. Should calculate deltaDecorations
      expect(mockModel.deltaDecorations).toHaveBeenCalledTimes(1);
      
      // Extract the decoration array passed to deltaDecorations
      const passedDecorations = mockModel.deltaDecorations.mock.calls[0][1];
      expect(passedDecorations.length).toBe(1); // Second block start === end, so it gets skipped per code logic
      
      // Verify deltaDecorations returned values
      expect(newDecorations).toEqual(["new-dec-1", "new-dec-2"]);
    });

    it("should trigger acceptFunc when the generated widget button is clicked", () => {
      const blocks: SideConflictBlock[] = [
        { id: "c1", start: 2, end: 5, text: "const a = 1;", isResolved: false },
      ];
      const acceptFunc = jest.fn();

      renderSideConflicts(
        mockEditor,
        mockModel,
        mockMonaco,
        blocks,
        "current",
        [],
        new Map(),
        new Map(),
        acceptFunc
      );

      // Extract the widget passed to the editor
      const addedWidget = mockEditor.addContentWidget.mock.calls[0][0];
      
      // Check its configuration
      expect(addedWidget.getId()).toBe("conflict.widget.current.c1");
      expect(addedWidget.getPosition().position.lineNumber).toBe(2);

      // Simulate DOM render and click
      const domNode = addedWidget.getDomNode();
      const button = domNode.querySelector("button");
      
      expect(button).not.toBeNull();
      expect(button?.innerText).toBe("Accept Current");

      button?.click();
      
      // Verify callback fired with the correct block
      expect(acceptFunc).toHaveBeenCalledTimes(1);
      expect(acceptFunc).toHaveBeenCalledWith(blocks[0]);
    });
  });

  describe("insertReverseWidget", () => {
    it("should create and add a reverse widget and corresponding view zone", () => {
      const handleReverseFunc = jest.fn();

      const [widget, zoneId] = insertReverseWidget(
        mockEditor,
        mockMonaco,
        "res-1",
        10, // lineNumber
        handleReverseFunc
      );

      // Verify zone creation
      expect(mockEditor.changeViewZones).toHaveBeenCalledTimes(1);
      expect(mockAccessor.addZone).toHaveBeenCalledWith({
        afterLineNumber: 9, // lineNumber (10) - 1
        heightInLines: 1,
        domNode: expect.any(HTMLElement),
      });
      expect(zoneId).toBe("new-zone-id");

      // Verify widget creation
      expect(mockEditor.addContentWidget).toHaveBeenCalledWith(widget);
      expect(widget.getId()).toBe("conflict.widget.reverse.res-1");
      expect(widget.getPosition().position.lineNumber).toBe(10);

      // Test click functionality
      const domNode = widget.getDomNode();
      const button = domNode.querySelector("button");

      expect(button).not.toBeNull();
      expect(button?.innerText).toBe("Reverse Changes");

      button?.click();
      expect(handleReverseFunc).toHaveBeenCalledWith("res-1");
    });
  });
});