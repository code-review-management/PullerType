import {
    getLineCount,
    getLines,
    calculateExpandedRegions,
    getLanguageIdFromFilename,
    vsCodeLightPlus,
} from "./mountUtils"; // Replace with your actual file path
import { Monaco } from "@monaco-editor/react";

describe("SuggestionDiffEditor Utilities", () => {
    describe("getLineCount", () => {
        it("returns 0 for an empty string or falsy value", () => {
            expect(getLineCount("")).toBe(0);
            expect(getLineCount(undefined as unknown as string)).toBe(0);
        });

        it("returns 1 for a single line", () => {
            expect(getLineCount("const x = 10;")).toBe(1);
        });

        it("returns the correct count for multiple lines", () => {
            expect(getLineCount("line1\nline2\nline3")).toBe(3);
        });
    });

    describe("getLines", () => {
        it("returns an empty array for an empty string or falsy value", () => {
            expect(getLines("", false)).toEqual([]);
            expect(getLines(undefined as unknown as string, false)).toEqual([]);
        });

        it("returns an array with a single element for a single line", () => {
            expect(getLines("const x = 10;", false)).toEqual(["const x = 10;"]);
        });

        it("returns an array of lines for a multiline string", () => {
            expect(getLines("line1\nline2\nline3", false)).toEqual(["line1", "line2", "line3"]);
        });

        it ("handles carriage returns", () => {
            expect(getLines("line1\r\nline2\r\nline3", true)).toEqual(["line1", "line2", "line3"]);
        })
    });

    describe("calculateExpandedRegions", () => {
        const defaultData = {
            beforeCode: "line1\nline2",
            originalCode: "line3",
            modifiedCode: "line3-changed",
            afterCode: "line4\nline5",
        };

        it("returns null if the clicked line is within the diff bounds", () => {
            // beforeCode has 2 lines, so diff starts at line 3 and ends at line 3.
            expect(calculateExpandedRegions(3, defaultData, false)).toBeNull();
        });

        it("shifts 'beforeCode' into the diff region when clicking above the diff", () => {
            // Clicking on line 1 should take 2 lines from 'beforeCode' (lines 1 and 2)
            const result = calculateExpandedRegions(1, defaultData, false);

            expect(result).not.toBeNull();
            expect(result?.beforeCode).toBe("");
            expect(result?.originalCode).toBe("line1\nline2\nline3");
            expect(result?.modifiedCode).toBe("line1\nline2\nline3-changed");
            expect(result?.afterCode).toBe("line4\nline5");
        });

        it("shifts 'afterCode' into the diff region when clicking below the diff", () => {
            const result = calculateExpandedRegions(5, defaultData, false);

            expect(result).not.toBeNull();
            expect(result?.beforeCode).toBe("line1\nline2");
            expect(result?.originalCode).toBe("line3\nline4\nline5");
            expect(result?.modifiedCode).toBe("line3-changed\nline4\nline5");
            expect(result?.afterCode).toBe("");
        });

        it("handles missing original or modified code gracefully when expanding before", () => {
            const emptyMiddleData = {
                beforeCode: "line1\nline2",
                originalCode: "",
                modifiedCode: "",
                afterCode: "line4",
            };

            const result = calculateExpandedRegions(2, emptyMiddleData, false);

            expect(result?.beforeCode).toBe("line1");
            expect(result?.originalCode).toBe("line2");
            expect(result?.modifiedCode).toBe("line2");
        });

        it("handles missing original or modified code gracefully when expanding after", () => {
            const emptyMiddleData = {
                beforeCode: "line1",
                originalCode: "",
                modifiedCode: "",
                afterCode: "line3\nline4",
            };

            // Change from 3 to 2 to click on the first line of the afterCode
            const result = calculateExpandedRegions(2, emptyMiddleData, false);

            expect(result?.afterCode).toBe("line4");
            expect(result?.originalCode).toBe("line3");
            expect(result?.modifiedCode).toBe("line3");
        });

        it("calculates startLine as 1 when there is no beforeCode (diff is at the top of the file)", () => {
            const topOfFileData = {
                beforeCode: "",
                originalCode: "line1",
                modifiedCode: "line1-changed",
                afterCode: "line2\nline3",
            };

            const result = calculateExpandedRegions(2, topOfFileData, false);

            expect(result).not.toBeNull();
            expect(result?.beforeCode).toBe("");

            expect(result?.originalCode).toBe("line1\nline2");
            expect(result?.modifiedCode).toBe("line1-changed\nline2");

            expect(result?.afterCode).toBe("line3");
        });
    });

    describe("getLanguageIdFromFilename", () => {
        let mockMonaco: Monaco;

        beforeEach(() => {
            // Create a mock Monaco instance with a realistic getLanguages implementation
            mockMonaco = {
                languages: {
                    getLanguages: jest.fn().mockReturnValue([
                        { id: "typescript", extensions: [".ts", ".tsx"] },
                        { id: "javascript", extensions: [".js", ".jsx"] },
                        { id: "csharp", extensions: [".cs"] },
                    ]),
                },
            } as unknown as Monaco;
        });

        it("returns 'plaintext' if no filename is provided", () => {
            expect(getLanguageIdFromFilename("", mockMonaco)).toBe("plaintext");
            expect(getLanguageIdFromFilename(undefined as unknown as string, mockMonaco)).toBe("plaintext");
        });

        it("returns the correct language id based on the file extension", () => {
            expect(getLanguageIdFromFilename("index.ts", mockMonaco)).toBe("typescript");
            expect(getLanguageIdFromFilename("App.tsx", mockMonaco)).toBe("typescript");
            expect(getLanguageIdFromFilename("Program.cs", mockMonaco)).toBe("csharp");
        });

        it("is case-insensitive when checking extensions", () => {
            expect(getLanguageIdFromFilename("PROGRAM.CS", mockMonaco)).toBe("csharp");
        });

        it("returns 'plaintext' if the extension is not found in the registry", () => {
            expect(getLanguageIdFromFilename("data.unknown", mockMonaco)).toBe("plaintext");
        });
    });

    describe("vsCodeLightPlus", () => {
        it("exports the correct base theme object configuration", () => {
            expect(vsCodeLightPlus).toBeDefined();
            expect(vsCodeLightPlus.base).toBe("vs");
            expect(vsCodeLightPlus.inherit).toBe(true);
            expect(vsCodeLightPlus.rules.length).toBeGreaterThan(0);
            expect(vsCodeLightPlus.colors["editor.background"]).toBe("#FFFFFF");
        });
    });
});