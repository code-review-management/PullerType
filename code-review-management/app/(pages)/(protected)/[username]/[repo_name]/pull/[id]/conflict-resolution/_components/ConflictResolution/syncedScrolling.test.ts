import { generateAnchors, refreshAnchors, bindInterpolatedScroll, SyncAnchor } from "./syncedScrolling"; // Update path as needed
import type * as MonacoEditor from "monaco-editor";
import { ParsedConflict } from "./parseMerge";
import { FileWorkspaceState } from "./ConflictResolution";

describe("syncedScrolling", () => {
  describe("generateAnchors", () => {
    it("should generate proper anchors based on conflict bounds and file limits", () => {
      const mockConflicts: ParsedConflict[] = [
        {
          id: "conf-1",
          currentText: "line1\nline2", // 2 lines
          incomingText: "line1\nline2\nline3", // 3 lines
          currentStartLine: 5,
          incomingStartLine: 7,
          resultInsertLine: 6, // Fallback if no decorations exist
        },
      ];

      const mockResultModel = {
        getDecorationRange: jest.fn().mockImplementation((id) => {
          if (id === "dec-1") return { startLineNumber: 10, endLineNumber: 15 };
          return null;
        }),
      } as unknown as MonacoEditor.editor.ITextModel;

      const mockDecorations = {
        "conf-1": ["dec-1"], // Maps to the mocked range above
      };

      const anchors = generateAnchors(
        mockConflicts,
        mockResultModel,
        mockDecorations,
        20, // currentMax
        25, // incomingMax
        30  // resultMax
      );

      expect(anchors).toHaveLength(4); // 1 start + 2 for the conflict + 1 end

      // 1. Initial Anchor
      expect(anchors[0]).toEqual({ currentLine: 1, incomingLine: 1, resultLine: 1 });

      // 2. Conflict Start Anchor
      expect(anchors[1]).toEqual({
        currentLine: 5, // c.currentStartLine
        incomingLine: 7, // c.incomingStartLine
        resultLine: 10, // resultRange.startLineNumber
      });

      // 3. Conflict End Anchor
      expect(anchors[2]).toEqual({
        currentLine: 6, // 5 + 2 lines - 1
        incomingLine: 9, // 7 + 3 lines - 1
        resultLine: 15, // resultRange.endLineNumber
      });

      // 4. End Anchor
      expect(anchors[3]).toEqual({
        currentLine: 20,
        incomingLine: 25,
        resultLine: 30,
      });
    });

    it("should fallback to resultInsertLine if no decorations exist", () => {
      const mockConflicts: ParsedConflict[] = [
        {
          id: "conf-2",
          currentText: "a",
          incomingText: "b",
          currentStartLine: 2,
          incomingStartLine: 2,
          resultInsertLine: 2, 
        },
      ];

      const mockResultModel = {
        getDecorationRange: jest.fn().mockReturnValue(null), // No range found
      } as unknown as MonacoEditor.editor.ITextModel;

      const anchors = generateAnchors(mockConflicts, mockResultModel, {}, 10, 10, 10);

      // Should fall back to resultInsertLine (2) for both start and end
      expect(anchors[1].resultLine).toBe(2);
      expect(anchors[2].resultLine).toBe(2);
    });
  });

  describe("refreshAnchors", () => {
    it("should update cache.syncAnchors using the models' line counts", () => {
      const mockCache = {
        currentModel: { getLineCount: () => 100 },
        incomingModel: { getLineCount: () => 110 },
        resultModel: { getLineCount: () => 120 },
        conflicts: [],
        resultDecorations: {},
        syncAnchors: [],
      } as unknown as FileWorkspaceState;

      refreshAnchors(mockCache);

      // Verify the generated anchors were assigned to the cache
      expect(mockCache.syncAnchors).toHaveLength(2); // Start and End anchors (since conflicts is empty)
      expect(mockCache.syncAnchors[1]).toEqual({
        currentLine: 100,
        incomingLine: 110,
        resultLine: 120,
      });
    });

    it("should return early if cache is missing", () => {
      expect(() => refreshAnchors(null as any)).not.toThrow();
    });
  });

  describe("bindInterpolatedScroll", () => {
    let mockSource: any;
    let mockTarget1: any;
    let mockTarget2: any;
    let scrollCallback: any;

    beforeEach(() => {
      // Hijack requestAnimationFrame to execute synchronously
      jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        cb(0);
        return 0;
      });

      mockSource = {
        onDidScrollChange: jest.fn((cb) => { scrollCallback = cb; }),
        getTopForLineNumber: jest.fn((line) => line * 10), // Simulate 10px per line
      };

      mockTarget1 = {
        getTopForLineNumber: jest.fn((line) => line * 10),
        setScrollTop: jest.fn(),
        setScrollLeft: jest.fn(),
      };

      mockTarget2 = {
        getTopForLineNumber: jest.fn((line) => line * 10),
        setScrollTop: jest.fn(),
        setScrollLeft: jest.fn(),
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should bind the scroll listener and interpolate targets correctly", () => {
      const mockAnchors: SyncAnchor[] = [
        { currentLine: 1, incomingLine: 1, resultLine: 1 },
        { currentLine: 11, incomingLine: 21, resultLine: 31 }, 
      ];

      const syncState = { isSyncing: false };

      bindInterpolatedScroll(
        mockSource, mockTarget1, mockTarget2,
        () => mockAnchors,
        "currentLine", "incomingLine", "resultLine",
        syncState
      );

      // Simulate a scroll event exactly halfway between anchor 1 and anchor 2
      // Source anchor 1 = line 1 = 10px. Source anchor 2 = line 11 = 110px. Range = 100px.
      // Halfway = 60px.
      scrollCallback({
        scrollTopChanged: true,
        scrollTop: 60,
        scrollLeftChanged: true,
        scrollLeft: 25,
      });

      // Target 1 (incomingLine): anchor 1 = 10px, anchor 2 = 210px. Range = 200px.
      // 50% progress = 10 + 100 = 110
      expect(mockTarget1.setScrollTop).toHaveBeenCalledWith(110);

      // Target 2 (resultLine): anchor 1 = 10px, anchor 2 = 310px. Range = 300px.
      // 50% progress = 10 + 150 = 160
      expect(mockTarget2.setScrollTop).toHaveBeenCalledWith(160);

      // Verify horizontal scroll synced
      expect(mockTarget1.setScrollLeft).toHaveBeenCalledWith(25);
      expect(mockTarget2.setScrollLeft).toHaveBeenCalledWith(25);

      // Verify syncing flag was reset
      expect(syncState.isSyncing).toBe(false);
    });

    it("should bail out if already syncing or if scrollTop didn't change", () => {
      const syncState = { isSyncing: true }; // Already syncing!

      bindInterpolatedScroll(
        mockSource, mockTarget1, mockTarget2,
        () => [], "currentLine", "incomingLine", "resultLine", syncState
      );

      scrollCallback({ scrollTopChanged: true, scrollTop: 50 });
      expect(mockTarget1.setScrollTop).not.toHaveBeenCalled(); // Should block

      syncState.isSyncing = false; // Reset

      scrollCallback({ scrollTopChanged: false, scrollTop: 50 });
      expect(mockTarget1.setScrollTop).not.toHaveBeenCalled(); // Should block again
    });

    it("should handle progress when range is 0 safely (prevent NaN)", () => {
       const mockAnchors: SyncAnchor[] = [
        { currentLine: 1, incomingLine: 1, resultLine: 1 },
        { currentLine: 1, incomingLine: 10, resultLine: 10 }, // 0 range on currentLine
      ];

      const syncState = { isSyncing: false };

      bindInterpolatedScroll(
        mockSource, mockTarget1, mockTarget2,
        () => mockAnchors,
        "currentLine", "incomingLine", "resultLine",
        syncState
      );

      // Trigger scroll
      scrollCallback({ scrollTopChanged: true, scrollTop: 10 });

      // Because source range is 0, progress defaults to 0, preventing NaN division.
      // Target 1 should be set exactly to its first anchor height (10)
      expect(mockTarget1.setScrollTop).toHaveBeenCalledWith(10);
    });
  });
});