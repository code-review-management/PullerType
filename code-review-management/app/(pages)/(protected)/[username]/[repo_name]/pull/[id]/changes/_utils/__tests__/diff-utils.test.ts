import { createDiff, createFileMeta } from "@/mocks/tests/filetree";
import {
  buildFileDiffMap,
  createFileDiffId,
  fixParsedDiffPaths,
} from "../diff-utils";

describe("fixParsedDiffPaths", () => {
  const createMockDiff = () => createDiff({ oldPath: "", newPath: "" });

  describe("overrides paths", () => {
    it("handles paths without spaces", () => {
      const diffString = "diff --git a/src/file.txt b/src/file.txt";
      const parsedDiffs = [createMockDiff()];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("src/file.txt");
      expect(parsedDiffs[0].newPath).toBe("src/file.txt");
    });

    it("handles paths with one space", () => {
      const diffString = "diff --git a/src/file 1.txt b/src/file 1.txt";
      const parsedDiffs = [createMockDiff()];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("src/file 1.txt");
      expect(parsedDiffs[0].newPath).toBe("src/file 1.txt");
    });

    it("handles paths with multiple non-consecutive spaces", () => {
      const diffString = "diff --git a/a b c d.txt b/a b c d.txt";
      const parsedDiffs = [createMockDiff()];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("a b c d.txt");
      expect(parsedDiffs[0].newPath).toBe("a b c d.txt");
    });

    it("handles paths with multiple consecutive spaces", () => {
      const diffString = "diff --git a/a    b   c.txt b/a    b   c.txt";
      const parsedDiffs = [createMockDiff()];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("a    b   c.txt");
      expect(parsedDiffs[0].newPath).toBe("a    b   c.txt");
    });

    it("handles paths with multiple non-consecutive spaces and trailing spaces", () => {
      const diffString = "diff --git a/a b c d.txt       b/a b c d.txt      ";
      const parsedDiffs = [createMockDiff()];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("a b c d.txt      ");
      expect(parsedDiffs[0].newPath).toBe("a b c d.txt      ");
    });

    it("handles paths with multiple consecutive spaces and trailing spaces", () => {
      const diffString =
        "diff --git a/a    b   c  d.txt       b/a    b   c  d.txt      ";
      const parsedDiffs = [createMockDiff()];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("a    b   c  d.txt      ");
      expect(parsedDiffs[0].newPath).toBe("a    b   c  d.txt      ");
    });

    it("handles paths containing 'a/' and 'b/' as substrings", () => {
      const diffString = "diff --git a/a b/ a/ b.txt b/a b/ a/ b.txt";
      const parsedDiffs = [createMockDiff()];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("a b/ a/ b.txt");
      expect(parsedDiffs[0].newPath).toBe("a b/ a/ b.txt");
    });

    it("handles diff-string with multiple files, including paths with varying number of spaces", () => {
      const cases = [
        "diff --git a/src/file.txt b/src/file.txt",
        "diff --git a/src/file 1.txt b/src/file 1.txt",
        "diff --git a/a b c d.txt b/a b c d.txt",
        "diff --git a/a    b   c.txt b/a    b   c.txt",
      ];
      const diffString = cases.join("\n");
      const parsedDiffs = cases.map(() => createMockDiff());
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("src/file.txt");
      expect(parsedDiffs[0].newPath).toBe("src/file.txt");

      expect(parsedDiffs[1].oldPath).toBe("src/file 1.txt");
      expect(parsedDiffs[1].newPath).toBe("src/file 1.txt");

      expect(parsedDiffs[2].oldPath).toBe("a b c d.txt");
      expect(parsedDiffs[2].newPath).toBe("a b c d.txt");

      expect(parsedDiffs[3].oldPath).toBe("a    b   c.txt");
      expect(parsedDiffs[3].newPath).toBe("a    b   c.txt");
    });
  });

  describe("does not override paths", () => {
    it("does not override paths for renamed files", () => {
      const diffString = "diff --git a/file.txt b/file.txt";
      const parsedDiffs = [
        createDiff({
          oldPath: "old-path",
          newPath: "new-path",
          type: "rename",
        }),
      ];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("old-path");
      expect(parsedDiffs[0].newPath).toBe("new-path");
    });

    it("does not override paths for copied files", () => {
      const diffString = "diff --git a/file.txt b/file.txt";
      const parsedDiffs = [
        createDiff({ oldPath: "old-path", newPath: "new-path", type: "copy" }),
      ];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("old-path");
      expect(parsedDiffs[0].newPath).toBe("new-path");
    });

    it("does not override paths if the 'a/' or 'b/' prefix are missing", () => {
      const diffString = "diff --git file.txt file.txt";
      const parsedDiffs = [
        createDiff({ oldPath: "old-path", newPath: "new-path" }),
      ];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("old-path");
      expect(parsedDiffs[0].newPath).toBe("new-path");
    });

    it("does not override paths if the split does not occur at a space", () => {
      const diffString = "diff --git a/index1.tsx b/file.txt"; // Split occurs at char 'x'
      const parsedDiffs = [
        createDiff({ oldPath: "old-path", newPath: "new-path" }),
      ];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("old-path");
      expect(parsedDiffs[0].newPath).toBe("new-path");
    });

    it("does not override paths if the filenames do not match", () => {
      const diffString = "diff --git a/b.txt b/c.txt";
      const parsedDiffs = [
        createDiff({ oldPath: "old-path", newPath: "new-path" }),
      ];
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("old-path");
      expect(parsedDiffs[0].newPath).toBe("new-path");
    });

    it("handles diff-string with multiple files, some of which should not be overridden", () => {
      const cases = [
        "diff --git a/src/file.txt b/src/file.txt", // Renamed file (manually set in diff object)
        "diff --git a/src/file 1.txt b/src/file 1.txt",
        "diff --git a/b.txt b/c.txt", // Mismatch in filenames
        "diff --git a/a    b   c.txt b/a    b   c.txt",
        "diff --git a/file.txt file.txt", // Missing "b/" prefix
      ];
      const diffString = cases.join("\n");
      const parsedDiffs = cases.map(() =>
        createDiff({ oldPath: "old-path", newPath: "new-path" }),
      );
      parsedDiffs[0].type = "rename";
      fixParsedDiffPaths(diffString, parsedDiffs);

      expect(parsedDiffs[0].oldPath).toBe("old-path");
      expect(parsedDiffs[0].newPath).toBe("new-path");

      expect(parsedDiffs[1].oldPath).toBe("src/file 1.txt");
      expect(parsedDiffs[1].newPath).toBe("src/file 1.txt");

      expect(parsedDiffs[2].oldPath).toBe("old-path");
      expect(parsedDiffs[2].newPath).toBe("new-path");

      expect(parsedDiffs[3].oldPath).toBe("a    b   c.txt");
      expect(parsedDiffs[3].newPath).toBe("a    b   c.txt");

      expect(parsedDiffs[4].oldPath).toBe("old-path");
      expect(parsedDiffs[4].newPath).toBe("new-path");
    });
  });
});

describe("createFileDiffId", () => {
  it("produces id with 'file-' prefix followed by filename", () => {
    const activePath = "a.txt";
    expect(createFileDiffId(activePath)).toBe("file-a.txt");
  });

  it("encodes multiple non-consecutive spaces", () => {
    const activePath = "a b c d .txt";
    expect(createFileDiffId(activePath)).toBe("file-a%20b%20c%20d%20.txt");
  });

  it("encodes multiple consecutive spaces", () => {
    const activePath = "a   b  c d .txt";
    expect(createFileDiffId(activePath)).toBe(
      "file-a%20%20%20b%20%20c%20d%20.txt",
    );
  });

  it("encodes trailing spaces", () => {
    const activePath = "a.txt   ";
    expect(createFileDiffId(activePath)).toBe("file-a.txt%20%20%20");
  });
});

describe("buildFileDiffMap", () => {
  it("maps multiple diffs to their corresponding file metas", () => {
    const parsedDiffs = [
      createDiff({ newPath: "a.ts", type: "modify" }),
      createDiff({ newPath: "b.ts", type: "modify" }),
      createDiff({ newPath: "c.ts", type: "modify" }),
    ];
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts"]);
    expect(buildFileDiffMap(parsedDiffs, flatFileTree)).toEqual({
      diffs: [
        { diff: parsedDiffs[0], fileMeta: flatFileTree[0] },
        { diff: parsedDiffs[1], fileMeta: flatFileTree[1] },
        { diff: parsedDiffs[2], fileMeta: flatFileTree[2] },
      ],
      isMappingError: false,
    });
  });

  it("matches by path, not by index, when tree order differs from diffs", () => {
    const parsedDiffs = [
      createDiff({ newPath: "a.ts", type: "modify" }),
      createDiff({ newPath: "b.ts", type: "modify" }),
    ];
    const flatFileTree = createFileMeta(["b.ts", "a.ts"]);
    expect(buildFileDiffMap(parsedDiffs, flatFileTree)).toEqual({
      diffs: [
        { diff: parsedDiffs[0], fileMeta: flatFileTree[1] },
        { diff: parsedDiffs[1], fileMeta: flatFileTree[0] },
      ],
      isMappingError: false,
    });
  });

  it("flags mapping error when lengths differ", () => {
    const parsedDiffs = [createDiff({ newPath: "a.ts", type: "modify" })];
    const flatFileTree = createFileMeta(["a.ts", "b.ts"]);
    expect(buildFileDiffMap(parsedDiffs, flatFileTree)).toEqual({
      diffs: [{ diff: parsedDiffs[0], fileMeta: flatFileTree[0] }],
      isMappingError: true,
    });
  });

  it("flags mapping error when pairing unmatched diffs with undefined", () => {
    const parsedDiffs = [
      createDiff({ newPath: "a.ts", type: "modify" }),
      createDiff({ newPath: "missing.ts", type: "modify" }),
    ];
    const flatFileTree = createFileMeta(["a.ts", "b.ts"]);
    expect(buildFileDiffMap(parsedDiffs, flatFileTree)).toEqual({
      diffs: [
        { diff: parsedDiffs[0], fileMeta: flatFileTree[0] },
        { diff: parsedDiffs[1], fileMeta: undefined },
      ],
      isMappingError: true,
    });
  });

  it("uses oldPath for deleted diffs", () => {
    const parsedDiffs = [
      createDiff({ oldPath: "a.ts", newPath: "", type: "delete" }),
    ];
    const flatFileTree = createFileMeta(["a.ts"]);
    expect(buildFileDiffMap(parsedDiffs, flatFileTree)).toEqual({
      diffs: [{ diff: parsedDiffs[0], fileMeta: flatFileTree[0] }],
      isMappingError: false,
    });
  });

  it("uses newPath for renamed diffs", () => {
    const parsedDiffs = [
      createDiff({ oldPath: "", newPath: "renamed.ts", type: "rename" }),
    ];
    const flatFileTree = createFileMeta(["renamed.ts"]);
    expect(buildFileDiffMap(parsedDiffs, flatFileTree)).toEqual({
      diffs: [{ diff: parsedDiffs[0], fileMeta: flatFileTree[0] }],
      isMappingError: false,
    });
  });
});
