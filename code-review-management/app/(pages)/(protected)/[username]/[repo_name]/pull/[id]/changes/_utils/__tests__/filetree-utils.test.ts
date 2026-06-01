import {
  buildFileTree,
  buildPathTreeIndexMap,
  FileTreeNode,
  flattenFileTree,
  orderParsedDiffs,
} from "../filetree-utils";
import { FileData } from "react-diff-view";
import { createDiff, createFileMeta } from "@/mocks/tests/filetree";

describe("buildFileTree", () => {
  it("returns an empty array when given no files", () => {
    expect(buildFileTree([])).toEqual([]);
  });

  describe("flat files at the root", () => {
    it("returns a single file node for one root-level file", () => {
      const files = createFileMeta(["a.ts"]);

      expect(buildFileTree(files)).toEqual([
        { type: "file", name: "a.ts", fileDiff: files[0] },
      ]);
    });

    it("returns a file node for each root-level file", () => {
      const files = createFileMeta(["a.ts", "b.ts", "c.ts"]);

      expect(buildFileTree(files)).toEqual([
        { type: "file", name: "a.ts", fileDiff: files[0] },
        { type: "file", name: "b.ts", fileDiff: files[1] },
        { type: "file", name: "c.ts", fileDiff: files[2] },
      ]);
    });
  });

  describe("collapsing single-child directories", () => {
    it("collapses a chain that ends in a single file", () => {
      const files = createFileMeta(["app/pages/utils/a.ts"]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app/pages/utils",
          children: [{ type: "file", name: "a.ts", fileDiff: files[0] }],
        },
      ]);
    });

    it("collapses a chain that ends in multiple files", () => {
      const files = createFileMeta([
        "app/pages/utils/a.ts",
        "app/pages/utils/b.ts",
        "app/pages/utils/c.ts",
      ]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app/pages/utils",
          children: [
            { type: "file", name: "a.ts", fileDiff: files[0] },
            { type: "file", name: "b.ts", fileDiff: files[1] },
            { type: "file", name: "c.ts", fileDiff: files[2] },
          ],
        },
      ]);
    });

    it("collapses independently within separate branches of the tree", () => {
      const files = createFileMeta([
        "app/pages/utils/a.ts",
        "lib/api/hooks/b.ts",
      ]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app/pages/utils",
          children: [{ type: "file", name: "a.ts", fileDiff: files[0] }],
        },
        {
          type: "directory",
          name: "lib/api/hooks",
          children: [{ type: "file", name: "b.ts", fileDiff: files[1] }],
        },
      ]);
    });

    it("does not collapse a directory whose only child is a file", () => {
      const files = createFileMeta(["app/a.ts"]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app",
          children: [{ type: "file", name: "a.ts", fileDiff: files[0] }],
        },
      ]);
    });

    it("stops collapsing at the first branching directory", () => {
      const files = createFileMeta([
        "app/pages/lib/a.ts",
        "app/pages/utils/b.ts",
      ]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app/pages",
          children: [
            {
              type: "directory",
              name: "lib",
              children: [{ type: "file", name: "a.ts", fileDiff: files[0] }],
            },
            {
              type: "directory",
              name: "utils",
              children: [{ type: "file", name: "b.ts", fileDiff: files[1] }],
            },
          ],
        },
      ]);
    });

    it("stops collapsing when a directory contains both a file and a subdirectory", () => {
      const files = createFileMeta([
        "app/pages/lib/a.ts",
        "app/pages/lib/utils/b.ts",
      ]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app/pages/lib",
          children: [
            {
              type: "directory",
              name: "utils",
              children: [{ type: "file", name: "b.ts", fileDiff: files[1] }],
            },
            { type: "file", name: "a.ts", fileDiff: files[0] },
          ],
        },
      ]);
    });
  });

  describe("sorting", () => {
    it("sorts root-level files alphabetically", () => {
      const files = createFileMeta(["c.ts", "a.ts", "b.ts"]);

      expect(buildFileTree(files)).toEqual([
        { type: "file", name: "a.ts", fileDiff: files[1] },
        { type: "file", name: "b.ts", fileDiff: files[2] },
        { type: "file", name: "c.ts", fileDiff: files[0] },
      ]);
    });

    it("sorts sibling directories alphabetically", () => {
      const files = createFileMeta(["mocks/a.ts", "app/c.ts", "lib/b.ts"]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app",
          children: [{ type: "file", name: "c.ts", fileDiff: files[1] }],
        },
        {
          type: "directory",
          name: "lib",
          children: [{ type: "file", name: "b.ts", fileDiff: files[2] }],
        },
        {
          type: "directory",
          name: "mocks",
          children: [{ type: "file", name: "a.ts", fileDiff: files[0] }],
        },
      ]);
    });

    it("sorts files alphabetically within a single directory", () => {
      const files = createFileMeta(["app/b.ts", "app/c.ts", "app/a.ts"]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app",
          children: [
            { type: "file", name: "a.ts", fileDiff: files[2] },
            { type: "file", name: "b.ts", fileDiff: files[0] },
            { type: "file", name: "c.ts", fileDiff: files[1] },
          ],
        },
      ]);
    });

    it("places directories before files at the same level", () => {
      const files = createFileMeta(["b.ts", "a.ts", "lib/d.ts", "app/c.ts"]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app",
          children: [{ type: "file", name: "c.ts", fileDiff: files[3] }],
        },
        {
          type: "directory",
          name: "lib",
          children: [{ type: "file", name: "d.ts", fileDiff: files[2] }],
        },
        { type: "file", name: "a.ts", fileDiff: files[1] },
        { type: "file", name: "b.ts", fileDiff: files[0] },
      ]);
    });

    it("sorts files and directories at every level of the tree", () => {
      const files = createFileMeta([
        "lib/utils/h.ts",
        "d.ts",
        "app/api/i.ts",
        "app/f.ts",
        "app/lib/c.ts",
        "app/api/b.ts",
        "lib/api/hooks/e.ts",
        "g.ts",
        "app/a.ts",
      ]);

      expect(buildFileTree(files)).toEqual([
        {
          type: "directory",
          name: "app",
          children: [
            {
              type: "directory",
              name: "api",
              children: [
                { type: "file", name: "b.ts", fileDiff: files[5] },
                { type: "file", name: "i.ts", fileDiff: files[2] },
              ],
            },
            {
              type: "directory",
              name: "lib",
              children: [{ type: "file", name: "c.ts", fileDiff: files[4] }],
            },
            { type: "file", name: "a.ts", fileDiff: files[8] },
            { type: "file", name: "f.ts", fileDiff: files[3] },
          ],
        },
        {
          type: "directory",
          name: "lib",
          children: [
            {
              type: "directory",
              name: "api/hooks",
              children: [{ type: "file", name: "e.ts", fileDiff: files[6] }],
            },
            {
              type: "directory",
              name: "utils",
              children: [{ type: "file", name: "h.ts", fileDiff: files[0] }],
            },
          ],
        },
        { type: "file", name: "d.ts", fileDiff: files[1] },
        { type: "file", name: "g.ts", fileDiff: files[7] },
      ]);
    });
  });
});

describe("flattenFileTree", () => {
  it("returns an empty array when given an empty tree", () => {
    expect(flattenFileTree([])).toEqual([]);
  });

  it("flattens a tree of root-level files", () => {
    const files = createFileMeta(["a.ts", "b.ts", "c.ts"]);

    const tree: FileTreeNode[] = [
      { type: "file", name: "a.ts", fileDiff: files[0] },
      { type: "file", name: "b.ts", fileDiff: files[1] },
      { type: "file", name: "c.ts", fileDiff: files[2] },
    ];

    expect(flattenFileTree(tree)).toEqual([files[0], files[1], files[2]]);
  });

  it("flattens a tree of files within a single directory", () => {
    const files = createFileMeta(["app/a.ts", "app/b.ts", "app/c.ts"]);

    const tree: FileTreeNode[] = [
      {
        type: "directory",
        name: "app",
        children: [
          { type: "file", name: "a.ts", fileDiff: files[0] },
          { type: "file", name: "b.ts", fileDiff: files[1] },
          { type: "file", name: "c.ts", fileDiff: files[2] },
        ],
      },
    ];

    expect(flattenFileTree(tree)).toEqual([files[0], files[1], files[2]]);
  });

  it("flattens a tree of files across multiple nested directories", () => {
    const files = createFileMeta([
      "app/a.ts",
      "app/pages/b.ts",
      "app/pages/utils/c.ts",
    ]);

    const tree: FileTreeNode[] = [
      {
        type: "directory",
        name: "app",
        children: [
          {
            type: "directory",
            name: "pages",
            children: [
              {
                type: "directory",
                name: "utils",
                children: [{ type: "file", name: "c.ts", fileDiff: files[2] }],
              },
              { type: "file", name: "b.ts", fileDiff: files[1] },
            ],
          },
          { type: "file", name: "a.ts", fileDiff: files[0] },
        ],
      },
    ];
    expect(flattenFileTree(tree)).toEqual([files[2], files[1], files[0]]);
  });

  it("flattens a tree of files with sibling directories", () => {
    const files = createFileMeta(["a.ts", "b.ts", "app/c.ts", "app/d.ts"]);

    const tree: FileTreeNode[] = [
      {
        type: "directory",
        name: "app",
        children: [
          { type: "file", name: "c.ts", fileDiff: files[2] },
          { type: "file", name: "d.ts", fileDiff: files[3] },
        ],
      },
      { type: "file", name: "a.ts", fileDiff: files[0] },
      { type: "file", name: "b.ts", fileDiff: files[1] },
    ];
    expect(flattenFileTree(tree)).toEqual([
      files[2],
      files[3],
      files[0],
      files[1],
    ]);
  });
});

describe("orderParsedDiffs", () => {
  it("does nothing when given no diffs and an empty flat file tree", () => {
    const diffs: FileData[] = [];

    orderParsedDiffs(diffs, []);
    expect(diffs).toEqual([]);
  });

  it("preserves order when diffs already match the flat file tree", () => {
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts"]);
    const diffs = [
      createDiff({ type: "modify", oldPath: "a.ts", newPath: "a.ts" }),
      createDiff({ type: "modify", oldPath: "b.ts", newPath: "b.ts" }),
      createDiff({ type: "modify", oldPath: "c.ts", newPath: "c.ts" }),
    ];

    orderParsedDiffs(diffs, flatFileTree);
    expect(diffs).toEqual([
      createDiff({ type: "modify", oldPath: "a.ts", newPath: "a.ts" }),
      createDiff({ type: "modify", oldPath: "b.ts", newPath: "b.ts" }),
      createDiff({ type: "modify", oldPath: "c.ts", newPath: "c.ts" }),
    ]);
  });

  it("reorders diffs to match the flat file tree", () => {
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts"]);
    const diffs = [
      createDiff({ type: "modify", oldPath: "c.ts", newPath: "c.ts" }),
      createDiff({ type: "modify", oldPath: "b.ts", newPath: "b.ts" }),
      createDiff({ type: "modify", oldPath: "a.ts", newPath: "a.ts" }),
    ];

    orderParsedDiffs(diffs, flatFileTree);
    expect(diffs).toEqual([
      createDiff({ type: "modify", oldPath: "a.ts", newPath: "a.ts" }),
      createDiff({ type: "modify", oldPath: "b.ts", newPath: "b.ts" }),
      createDiff({ type: "modify", oldPath: "c.ts", newPath: "c.ts" }),
    ]);
  });

  it("reorders deleted-file diffs by their oldPath", () => {
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts"]);
    const diffs = [
      createDiff({ type: "delete", oldPath: "c.ts", newPath: "" }),
      createDiff({ type: "delete", oldPath: "a.ts", newPath: "" }),
      createDiff({ type: "delete", oldPath: "b.ts", newPath: "" }),
    ];

    orderParsedDiffs(diffs, flatFileTree);
    expect(diffs).toEqual([
      createDiff({ type: "delete", oldPath: "a.ts", newPath: "" }),
      createDiff({ type: "delete", oldPath: "b.ts", newPath: "" }),
      createDiff({ type: "delete", oldPath: "c.ts", newPath: "" }),
    ]);
  });

  it("reorders added-file diffs by their newPath", () => {
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts"]);
    const diffs = [
      createDiff({ type: "add", oldPath: "", newPath: "c.ts" }),
      createDiff({ type: "add", oldPath: "", newPath: "a.ts" }),
      createDiff({ type: "add", oldPath: "", newPath: "b.ts" }),
    ];

    orderParsedDiffs(diffs, flatFileTree);
    expect(diffs).toEqual([
      createDiff({ type: "add", oldPath: "", newPath: "a.ts" }),
      createDiff({ type: "add", oldPath: "", newPath: "b.ts" }),
      createDiff({ type: "add", oldPath: "", newPath: "c.ts" }),
    ]);
  });

  it("reorders renamed-file diffs by their newPath", () => {
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts"]);
    const diffs = [
      createDiff({ type: "rename", oldPath: "old-c.ts", newPath: "c.ts" }),
      createDiff({ type: "rename", oldPath: "old-a.ts", newPath: "a.ts" }),
      createDiff({ type: "rename", oldPath: "old-b.ts", newPath: "b.ts" }),
    ];

    orderParsedDiffs(diffs, flatFileTree);
    expect(diffs).toEqual([
      createDiff({ type: "rename", oldPath: "old-a.ts", newPath: "a.ts" }),
      createDiff({ type: "rename", oldPath: "old-b.ts", newPath: "b.ts" }),
      createDiff({ type: "rename", oldPath: "old-c.ts", newPath: "c.ts" }),
    ]);
  });

  it("reorders modified-file diffs by their newPath", () => {
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts"]);
    const diffs = [
      createDiff({ type: "modify", oldPath: "", newPath: "c.ts" }),
      createDiff({ type: "modify", oldPath: "", newPath: "a.ts" }),
      createDiff({ type: "modify", oldPath: "", newPath: "b.ts" }),
    ];

    orderParsedDiffs(diffs, flatFileTree);
    expect(diffs).toEqual([
      createDiff({ type: "modify", oldPath: "", newPath: "a.ts" }),
      createDiff({ type: "modify", oldPath: "", newPath: "b.ts" }),
      createDiff({ type: "modify", oldPath: "", newPath: "c.ts" }),
    ]);
  });

  it("reorders a mix of diff types to match the flat file tree", () => {
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts", "d.ts"]);
    const diffs = [
      createDiff({ type: "delete", oldPath: "c.ts", newPath: "" }),
      createDiff({ type: "add", oldPath: "", newPath: "d.ts" }),
      createDiff({ type: "rename", oldPath: "old-b.ts", newPath: "b.ts" }),
      createDiff({ type: "modify", oldPath: "", newPath: "a.ts" }),
    ];

    orderParsedDiffs(diffs, flatFileTree);
    expect(diffs).toEqual([
      createDiff({ type: "modify", oldPath: "", newPath: "a.ts" }),
      createDiff({ type: "rename", oldPath: "old-b.ts", newPath: "b.ts" }),
      createDiff({ type: "delete", oldPath: "c.ts", newPath: "" }),
      createDiff({ type: "add", oldPath: "", newPath: "d.ts" }),
    ]);
  });
});

describe("buildPathTreeIndexMap", () => {
  it("returns an empty map for an empty tree", () => {
    expect(buildPathTreeIndexMap([])).toEqual(new Map());
  });

  it("maps each filename to its index in the tree", () => {
    const flatFileTree = createFileMeta(["a.ts", "b.ts", "c.ts"]);
    expect(buildPathTreeIndexMap(flatFileTree)).toEqual(
      new Map([
        ["a.ts", 0],
        ["b.ts", 1],
        ["c.ts", 2],
      ]),
    );
  });

  it("treats filenames as case-sensitive", () => {
    const flatFileTree = createFileMeta(["A.ts", "a.ts"]);
    expect(buildPathTreeIndexMap(flatFileTree)).toEqual(
      new Map([
        ["A.ts", 0],
        ["a.ts", 1],
      ]),
    );
  });

  it("preserves full paths as keys", () => {
    const flatFileTree = createFileMeta(["src/a.ts", "src/utils/a.ts"]);
    expect(buildPathTreeIndexMap(flatFileTree)).toEqual(
      new Map([
        ["src/a.ts", 0],
        ["src/utils/a.ts", 1],
      ]),
    );
  });
});
