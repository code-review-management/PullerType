import {
  getDefaultDeleteChangeData,
  getDefaultInsertChangeData,
  getDefaultNormalChangeData,
} from "@/mocks/tests/diffs";
import {
  clearHighlightIfMatch,
  highlightOnMouseDown,
  highlightOnMouseEnter,
  highlightOnMouseUp,
  isWithinHighlightRange,
} from "../highlight-utils";
import { ActiveHighlight } from "../../_hooks/useHighlight";
import { createDraftThread } from "../comment-utils";

jest.mock("../comment-utils", () => ({
  createDraftThread: jest.fn(),
}));

const mockInsertChange = getDefaultInsertChangeData();
const mockDeleteChange = getDefaultDeleteChangeData();
const mockNormalChange = getDefaultNormalChangeData();

const buildActiveHighlightRef = (overrides: Partial<ActiveHighlight> = {}) => ({
  current: {
    isHighlighting: true,
    start: 3,
    end: 3,
    side: "new" as const,
    ...overrides,
  },
});

describe("isWithinHighlightRange", () => {
  describe("returns false when a required active highlight field is null", () => {
    it("when start is null", () => {
      expect(
        isWithinHighlightRange(10, "new", {
          isHighlighting: false,
          start: null,
          end: 10,
          side: "new",
        }),
      ).toBe(false);
    });

    it("when end is null", () => {
      expect(
        isWithinHighlightRange(5, "new", {
          isHighlighting: false,
          start: 5,
          end: null,
          side: "new",
        }),
      ).toBe(false);
    });

    it("when side is null", () => {
      expect(
        isWithinHighlightRange(7, "new", {
          isHighlighting: false,
          start: 5,
          end: 10,
          side: null,
        }),
      ).toBe(false);
    });
  });

  describe("returns false when the side does not match the active highlight's side", () => {
    it("when querying 'old' but highlight is on 'new'", () => {
      expect(
        isWithinHighlightRange(7, "old", {
          isHighlighting: false,
          start: 5,
          end: 10,
          side: "new",
        }),
      ).toBe(false);
    });

    it("when querying 'new' but highlight is on 'old'", () => {
      expect(
        isWithinHighlightRange(7, "new", {
          isHighlighting: false,
          start: 5,
          end: 10,
          side: "old",
        }),
      ).toBe(false);
    });
  });

  describe("when the highlight is dragged downwards (start < end)", () => {
    const activeHighlight = {
      isHighlighting: false,
      start: 5,
      end: 10,
      side: "new" as const,
    };

    describe("returns true when the line is inside the active highlight range", () => {
      it("at the start boundary", () => {
        expect(isWithinHighlightRange(5, "new", activeHighlight)).toBe(true);
      });

      it("at the end boundary", () => {
        expect(isWithinHighlightRange(10, "new", activeHighlight)).toBe(true);
      });

      it("in the middle of the range", () => {
        expect(isWithinHighlightRange(7, "new", activeHighlight)).toBe(true);
      });
    });

    describe("returns false when the line is outside the active highlight range", () => {
      it("before the start boundary", () => {
        expect(isWithinHighlightRange(4, "new", activeHighlight)).toBe(false);
      });

      it("after the end boundary", () => {
        expect(isWithinHighlightRange(11, "new", activeHighlight)).toBe(false);
      });
    });
  });

  describe("when the highlight is dragged upwards (end < start)", () => {
    const activeHighlight = {
      isHighlighting: true,
      start: 10,
      end: 5,
      side: "new" as const,
    };

    describe("returns true when the line is inside the active highlight range", () => {
      it("at the start boundary", () => {
        expect(isWithinHighlightRange(10, "new", activeHighlight)).toBe(true);
      });

      it("at the end boundary", () => {
        expect(isWithinHighlightRange(5, "new", activeHighlight)).toBe(true);
      });

      it("in the middle of the range", () => {
        expect(isWithinHighlightRange(7, "new", activeHighlight)).toBe(true);
      });
    });

    describe("returns false when the line is outside the active highlight range", () => {
      it("before the end boundary", () => {
        expect(isWithinHighlightRange(4, "new", activeHighlight)).toBe(false);
      });

      it("after the start boundary", () => {
        expect(isWithinHighlightRange(11, "new", activeHighlight)).toBe(false);
      });
    });
  });

  describe("when the highlight is a single line", () => {
    const activeHighlight = {
      isHighlighting: false,
      start: 5,
      end: 5,
      side: "new" as const,
    };

    it("returns true for the highlighted line", () => {
      expect(isWithinHighlightRange(5, "new", activeHighlight)).toBe(true);
    });

    describe("returns false when the line is outside the active highlight range", () => {
      it("before the start boundary", () => {
        expect(isWithinHighlightRange(4, "new", activeHighlight)).toBe(false);
      });

      it("after the end boundary", () => {
        expect(isWithinHighlightRange(6, "new", activeHighlight)).toBe(false);
      });
    });
  });
});

describe("highlightOnMouseDown", () => {
  describe("starts a highlight session at the clicked line", () => {
    it.each([
      [
        "inserted changes",
        mockInsertChange,
        "new" as const,
        mockInsertChange.lineNumber,
      ],
      [
        "deleted changes",
        mockDeleteChange,
        "old" as const,
        mockDeleteChange.lineNumber,
      ],
      [
        "normal changes on the new side",
        mockNormalChange,
        "new" as const,
        mockNormalChange.newLineNumber,
      ],
      [
        "normal changes on the old side",
        mockNormalChange,
        "old" as const,
        mockNormalChange.oldLineNumber,
      ],
    ])("for %s", (_, change, side, expectedLine) => {
      const setActiveHighlightSync = jest.fn();
      highlightOnMouseDown(change, side, setActiveHighlightSync);
      expect(setActiveHighlightSync).toHaveBeenCalledWith({
        isHighlighting: true,
        start: expectedLine,
        end: expectedLine,
        side,
      });
    });
  });
});

describe("highlightOnMouseEnter", () => {
  describe("does not update the active highlight", () => {
    it("when isHighlighting is false", () => {
      const setActiveHighlightSync = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef({
        isHighlighting: false,
      });

      highlightOnMouseEnter(
        mockNormalChange,
        "new",
        activeHighlightRef,
        setActiveHighlightSync,
      );
      expect(setActiveHighlightSync).not.toHaveBeenCalled();
    });

    it("when the entered side (old) does not match the active highlight's side (new)", () => {
      const setActiveHighlightSync = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef({ side: "new" });

      highlightOnMouseEnter(
        mockNormalChange,
        "old",
        activeHighlightRef,
        setActiveHighlightSync,
      );
      expect(setActiveHighlightSync).not.toHaveBeenCalled();
    });

    it("when the entered side (new) does not match the active highlight's side (old)", () => {
      const setActiveHighlightSync = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef({ side: "old" });

      highlightOnMouseEnter(
        mockNormalChange,
        "new",
        activeHighlightRef,
        setActiveHighlightSync,
      );
      expect(setActiveHighlightSync).not.toHaveBeenCalled();
    });
  });

  describe("extends the active highlight's end to the entered line", () => {
    it.each([
      [
        "inserted changes",
        getDefaultInsertChangeData({ lineNumber: 5 }),
        "new" as const,
        5,
      ],
      [
        "deleted changes",
        getDefaultDeleteChangeData({ lineNumber: 5 }),
        "old" as const,
        5,
      ],
      [
        "normal changes on the new side",
        getDefaultNormalChangeData({ oldLineNumber: 1, newLineNumber: 5 }),
        "new" as const,
        5,
      ],
      [
        "normal changes on the old side",
        getDefaultNormalChangeData({ oldLineNumber: 1, newLineNumber: 5 }),
        "old" as const,
        1,
      ],
    ])("for %s", (_, change, side, expectedEnd) => {
      const setActiveHighlightSync = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef({
        isHighlighting: true,
        start: 2,
        end: 2,
        side,
      });

      highlightOnMouseEnter(
        change,
        side,
        activeHighlightRef,
        setActiveHighlightSync,
      );
      expect(setActiveHighlightSync).toHaveBeenCalledWith({
        isHighlighting: true,
        start: 2,
        end: expectedEnd,
        side,
      });
    });
  });
});

describe("highlightOnMouseUp", () => {
  const mockCreateDraftThread = jest.mocked(createDraftThread);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ends the highlight session by setting isHighlighting to false", () => {
    const setActiveHighlightSync = jest.fn();
    const setDraftThreads = jest.fn();
    const activeHighlightRef = buildActiveHighlightRef({
      start: 2,
      end: 3,
      side: "new",
    });

    highlightOnMouseUp(
      "old.ts",
      "active.ts",
      "modified",
      activeHighlightRef,
      setActiveHighlightSync,
      setDraftThreads,
    );
    expect(setActiveHighlightSync).toHaveBeenCalledWith({
      isHighlighting: false,
      start: 2,
      end: 3,
      side: "new",
    });
  });

  describe("does not create a draft thread", () => {
    it.each([
      ["start", { start: null }],
      ["end", { end: null }],
      ["side", { side: null }],
    ])("when the active highlight's %s is null", (_, overrides) => {
      const setActiveHighlightSync = jest.fn();
      const setDraftThreads = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef(overrides);

      highlightOnMouseUp(
        "old.ts",
        "active.ts",
        "modified",
        activeHighlightRef,
        setActiveHighlightSync,
        setDraftThreads,
      );
      expect(mockCreateDraftThread).not.toHaveBeenCalled();
    });
  });

  describe("creates a draft thread at the highlighted range", () => {
    it.each([
      ["dragged downwards (start < end)", { start: 5, end: 10 }],
      ["dragged upwards (end < start)", { start: 10, end: 5 }],
    ])("when the highlight is %s", (_, range) => {
      const setActiveHighlightSync = jest.fn();
      const setDraftThreads = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef({
        ...range,
        side: "new",
      });

      highlightOnMouseUp(
        "old.ts",
        "active.ts",
        "modified",
        activeHighlightRef,
        setActiveHighlightSync,
        setDraftThreads,
      );
      expect(mockCreateDraftThread).toHaveBeenCalledWith(
        setDraftThreads,
        "active.ts",
        {
          oldPath: "old.ts",
          activePath: "active.ts",
          fileStatus: "modified",
          body: "",
          subjectType: "line",
          start: 5,
          end: 10,
          side: "new",
        },
      );
    });
  });
});

describe("clearHighlightIfMatch", () => {
  describe("does not clear the highlight", () => {
    it.each([
      ["start", { start: null }],
      ["end", { end: null }],
    ])("when the active highlight's %s is null", (_, overrides) => {
      const setActiveHighlightSync = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef(overrides);

      clearHighlightIfMatch(
        1,
        5,
        "new",
        activeHighlightRef,
        setActiveHighlightSync,
      );
      expect(setActiveHighlightSync).not.toHaveBeenCalled();
    });

    it.each([
      ["start", 2, 5, "new" as const],
      ["end", 1, 6, "new" as const],
      ["side", 1, 5, "old" as const],
    ])(
      "when the %s does not match the active highlight",
      (_, start, end, side) => {
        const setActiveHighlightSync = jest.fn();
        const activeHighlightRef = buildActiveHighlightRef({
          start: 1,
          end: 5,
          side: "new",
        });

        clearHighlightIfMatch(
          start,
          end,
          side,
          activeHighlightRef,
          setActiveHighlightSync,
        );
        expect(setActiveHighlightSync).not.toHaveBeenCalled();
      },
    );
  });

  describe("clears the highlight when the side and range match", () => {
    it("for a highlight dragged downwards (start < end)", () => {
      const setActiveHighlightSync = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef({
        start: 1,
        end: 5,
        side: "new",
      });

      clearHighlightIfMatch(
        1,
        5,
        "new",
        activeHighlightRef,
        setActiveHighlightSync,
      );
      expect(setActiveHighlightSync).toHaveBeenCalledWith({
        isHighlighting: false,
        start: null,
        end: null,
        side: null,
      });
    });

    it("for a highlight dragged upwards (end < start)", () => {
      const setActiveHighlightSync = jest.fn();
      const activeHighlightRef = buildActiveHighlightRef({
        start: 5,
        end: 1,
        side: "new",
      });

      clearHighlightIfMatch(
        1,
        5,
        "new",
        activeHighlightRef,
        setActiveHighlightSync,
      );
      expect(setActiveHighlightSync).toHaveBeenCalledWith({
        isHighlighting: false,
        start: null,
        end: null,
        side: null,
      });
    });
  });
});
