import { getSystemPrompt, getUserPrompt } from "./prompt"; // Update with your actual filename
import { Comment } from "@/types/github.types";
import { FileContext } from "./retrieveContext";

describe("Prompt Generators", () => {
  describe("getSystemPrompt", () => {
    it("should return the static system prompt as a string", () => {
      const prompt = getSystemPrompt();

      // Verify it returns a string
      expect(typeof prompt).toBe("string");

      // Verify it contains the critical instructional constraints
      expect(prompt).toContain("RULES:");
      expect(prompt).toContain("1) Do not add any explanations or backticks");
      expect(prompt).toContain("directly replaced as is");
    });
  });

  describe("getUserPrompt", () => {
    it("should correctly number file content lines and format comments", () => {
      const mockFileContext: FileContext = {
        content: "function hello() {\n  console.log('world');\n}",
      };

      // Mock only the fields of the Comment type that the function actually touches
      const mockComments = [
        {
          user: { login: "reviewer-1" },
          body: "Consider using a standard return here.",
        },
        {
          user: { login: "reviewer-2" },
          body: "Agreed, this looks off.",
        },
      ] as unknown as Comment[];

      const targetLine = 2;

      const result = getUserPrompt(mockFileContext, mockComments, targetLine);

      // 1. Verify Line Numbering
      expect(result).toContain("1 | function hello() {");
      expect(result).toContain("2 |   console.log('world');");
      expect(result).toContain("3 | }");

      // 2. Verify Target Line Injection
      expect(result).toContain("Comment Line:\n    2");

      // 3. Verify Comments Formatting (JSON stringified)
      expect(result).toContain('"user": "reviewer-1"');
      expect(result).toContain('"body": "Consider using a standard return here."');
      expect(result).toContain('"user": "reviewer-2"');
    });

    it("should handle empty file content safely", () => {
      const mockFileContext: FileContext = {
        content: "",
      };
      
      const mockComments = [] as unknown as Comment[];

      const result = getUserPrompt(mockFileContext, mockComments, 1);

      // An empty string split by \n results in an array with one empty string element
      expect(result).toContain("1 | ");
      expect(result).toContain("[]"); // Empty JSON array for comments
    });

    it("should handle the fallback where comment.user is a string rather than an object", () => {
      // Testing the `comment.user.login || comment.user` fallback logic
      const mockFileContext: FileContext = {
        content: "const x = 1;",
      };

      const mockComments = [
        {
          user: "string-fallback-user", // No .login property
          body: "This is a fallback test.",
        },
      ] as unknown as Comment[];

      const result = getUserPrompt(mockFileContext, mockComments, 1);

      expect(result).toContain('"user": "string-fallback-user"');
      expect(result).toContain('"body": "This is a fallback test."');
    });
  });
});