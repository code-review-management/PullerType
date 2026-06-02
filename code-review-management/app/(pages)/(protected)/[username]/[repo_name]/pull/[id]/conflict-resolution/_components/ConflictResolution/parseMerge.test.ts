import { parseMerge } from "./parseMerge"; // Update with actual import path

describe("parseMerge", () => {
  it("should return identical content and empty conflicts if no markers are present", () => {
    const input = "line 1\nline 2\nline 3";
    const result = parseMerge(input);

    expect(result.currentContent).toBe(input);
    expect(result.incomingContent).toBe(input);
    expect(result.resultContent).toBe(input);
    expect(result.conflicts.length).toBe(0);
  });

  it("should parse a single merge conflict correctly", () => {
    const input = `Normal start
<<<<<<< HEAD
Current Line 1
Current Line 2
=======
Incoming Line 1
>>>>>>> branch-name
Normal end`;

    const result = parseMerge(input);

    // Assert overall string outputs
    expect(result.currentContent).toBe("Normal start\nCurrent Line 1\nCurrent Line 2\nNormal end");
    expect(result.incomingContent).toBe("Normal start\nIncoming Line 1\nNormal end");
    expect(result.resultContent).toBe("Normal start\nNormal end");

    // Assert conflict parsing
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        currentText: "Current Line 1\nCurrent Line 2",
        incomingText: "Incoming Line 1",
        currentStartLine: 2,
        incomingStartLine: 2,
        resultInsertLine: 2,
      })
    );
  });

  it("should parse multiple merge conflicts and track line numbers accurately", () => {
    const input = `Line 1
<<<<<<< HEAD
Conflict 1 Current
=======
Conflict 1 Incoming
>>>>>>> branch
Line 2
<<<<<<< HEAD
Conflict 2 Current
=======
Conflict 2 Incoming
>>>>>>> branch
Line 3`;

    const result = parseMerge(input);

    expect(result.currentContent).toBe("Line 1\nConflict 1 Current\nLine 2\nConflict 2 Current\nLine 3");
    expect(result.incomingContent).toBe("Line 1\nConflict 1 Incoming\nLine 2\nConflict 2 Incoming\nLine 3");
    expect(result.resultContent).toBe("Line 1\nLine 2\nLine 3");

    expect(result.conflicts).toHaveLength(2);

    // Conflict 1
    expect(result.conflicts[0]).toEqual(
      expect.objectContaining({
        currentText: "Conflict 1 Current",
        incomingText: "Conflict 1 Incoming",
        currentStartLine: 2,
        incomingStartLine: 2,
        resultInsertLine: 2,
      })
    );

    // Conflict 2 - verify lines shifted correctly
    expect(result.conflicts[1]).toEqual(
      expect.objectContaining({
        currentText: "Conflict 2 Current",
        incomingText: "Conflict 2 Incoming",
        currentStartLine: 4, // Line 1 (1) + Conf 1 Cur (1) + Line 2 (1) + 1
        incomingStartLine: 4, 
        resultInsertLine: 3,  // Line 1 (1) + Line 2 (1) + 1
      })
    );
  });

  it("should handle empty conflict blocks (e.g., pure additions or deletions)", () => {
    const input = `<<<<<<< HEAD
=======
Only incoming
>>>>>>> branch`;

    const result = parseMerge(input);

    expect(result.currentContent).toBe("");
    expect(result.incomingContent).toBe("Only incoming");
    expect(result.resultContent).toBe("");

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toEqual(
      expect.objectContaining({
        currentText: "",
        incomingText: "Only incoming",
        currentStartLine: 1,
        incomingStartLine: 1,
        resultInsertLine: 1,
      })
    );
  });

  it("should handle conflicts at the very end of the file seamlessly", () => {
    const input = `Header
<<<<<<< HEAD
Current
=======
Incoming
>>>>>>> end`;

    const result = parseMerge(input);

    expect(result.resultContent).toBe("Header");
    expect(result.conflicts[0].currentStartLine).toBe(2);
    expect(result.conflicts[0].currentText).toBe("Current");
  });
});