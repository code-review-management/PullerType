import { attemptFileMerge } from "./get-merge-diff"; // Adjust path as needed
import * as Diff3 from "node-diff3";

// Mock the external diff3 library
jest.mock("node-diff3", () => ({
  merge: jest.fn(),
}));

describe("attemptFileMerge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("splits input strings and maps them to the correct Diff3.merge arguments (ours, base, theirs)", () => {
    const ancestor = "line1\nline2";
    const target = "line1\nline2\ntarget-added";
    const feature = "feature-added\nline1\nline2";

    // Setup the mock to return a clean merge
    (Diff3.merge as jest.Mock).mockReturnValue({
      conflict: false,
      result: ["feature-added", "line1", "line2", "target-added"],
    });

    const result = attemptFileMerge(ancestor, target, feature);

    // Verify Diff3.merge was called with the correctly split arrays in the right order!
    // Order must be: (ours [feature], base [ancestor], theirs [target])
    expect(Diff3.merge).toHaveBeenCalledWith(
      ["feature-added", "line1", "line2"], // ours
      ["line1", "line2"],                  // base
      ["line1", "line2", "target-added"]   // theirs
    );

    // Verify the function joins the array back into a string and passes the conflict flag
    expect(result).toEqual({
      hasConflict: false,
      content: "feature-added\nline1\nline2\ntarget-added",
    });
  });

  it("correctly identifies and returns conflicts with conflict markers", () => {
    const ancestor = "base-line";
    const target = "target-change";
    const feature = "feature-change";

    // Setup the mock to simulate a merge conflict
    (Diff3.merge as jest.Mock).mockReturnValue({
      conflict: true,
      result: [
        "<<<<<<<",
        "feature-change",
        "=======",
        "target-change",
        ">>>>>>>",
      ],
    });

    const result = attemptFileMerge(ancestor, target, feature);

    expect(result.hasConflict).toBe(true);
    expect(result.content).toBe(
      "<<<<<<<\nfeature-change\n=======\ntarget-change\n>>>>>>>"
    );
  });

  it("handles empty files gracefully", () => {
    (Diff3.merge as jest.Mock).mockReturnValue({
      conflict: false,
      result: [""],
    });

    const result = attemptFileMerge("", "", "");

    // "".split("\n") results in [""]
    expect(Diff3.merge).toHaveBeenCalledWith([""], [""], [""]);
    
    expect(result).toEqual({
      hasConflict: false,
      content: "",
    });
  });
});