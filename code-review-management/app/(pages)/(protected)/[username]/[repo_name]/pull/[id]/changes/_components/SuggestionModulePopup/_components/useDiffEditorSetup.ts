import { useRef, useEffect, useLayoutEffect } from "react";
import type { editor } from "monaco-editor";
import { DiffOnMount } from "@monaco-editor/react";
import { SuggestionDiffEditorProps, RegionData } from "./SuggestionDiffEditor";
import {
  getLineCount,
  calculateExpandedRegions,
  getLanguageIdFromFilename,
  vsCodeLightPlus,
} from "./mountUtils";
import styles from "./SuggestionDiffEditor.module.css";

/**
 * This function orchestrates the initialization of each editor. This is how we add the properties of each editor from user interactions.
 * This includes the decorative regions, line gutter clicking, bounds enforcing, and code change
 * This also intiliazes style choises of the editor such as themeing and language
 * @param props Contians information about the suggestion, mostly the code regions, file information,
 * and a function to update regions
 * @returns It returns the function that will be run on the mount of the editor
 */
export function useDiffEditorSetup(
  props: SuggestionDiffEditorProps,
): DiffOnMount {
  const {
    beforeCode,
    originalCode,
    modifiedCode,
    afterCode,
    hasCarriageReturn,
    onCodeChange,
  } = props;

  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const hoveredLineRef = useRef<number | null>(null);
  const hoverDecorationsRef =
    useRef<editor.IEditorDecorationsCollection | null>(null);
  const updateDecorationsRef = useRef<(() => void) | null>(null);

  // Pre-calculate initial boundaries so they are ready on first mount
  const initialBeforeLines = getLineCount(beforeCode);
  const initialAfterLines = getLineCount(afterCode);
  const initialStartLine = initialBeforeLines > 0 ? initialBeforeLines + 1 : 1;

  const boundariesRef = useRef({
    start: initialStartLine,
    end: initialStartLine + getLineCount(modifiedCode) - 1,
    originalEnd: initialStartLine + getLineCount(originalCode) - 1,
    afterLines: initialAfterLines,
  });

  const latestPropsRef = useRef<RegionData>({
    beforeCode,
    originalCode,
    modifiedCode,
    afterCode,
  });

  useLayoutEffect(() => {
    latestPropsRef.current = {
      beforeCode,
      originalCode,
      modifiedCode,
      afterCode,
    };

    const beforeLines = getLineCount(beforeCode);
    const afterLines = getLineCount(afterCode);
    const startLine = beforeLines > 0 ? beforeLines + 1 : 1;

    boundariesRef.current = {
      start: startLine,
      end: startLine + getLineCount(modifiedCode) - 1,
      originalEnd: startLine + getLineCount(originalCode) - 1,
      afterLines: afterLines,
    };
  }, [beforeCode, originalCode, modifiedCode, afterCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (updateDecorationsRef.current) {
        updateDecorationsRef.current();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [beforeCode, originalCode, modifiedCode, afterCode]);

  const handleEditorMount: DiffOnMount = (editorInstance, monaco) => {
    const compilerOptions = {
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowNonTsExtensions: true
    };

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

    monaco.editor.defineTheme("vs-light-plus", vsCodeLightPlus);
    monaco.editor.setTheme("vs-light-plus");

    diffEditorRef.current = editorInstance;

    const originalEditor = editorInstance.getOriginalEditor();
    const modifiedEditor = editorInstance.getModifiedEditor();

    const languageId = getLanguageIdFromFilename(props.filename, monaco);

    const originalModel = originalEditor.getModel();
    const modifiedModel = modifiedEditor.getModel();

    if (originalModel) {
      monaco.editor.setModelLanguage(originalModel, languageId);
      if (hasCarriageReturn)
        originalModel.setEOL(monaco.editor.EndOfLineSequence.CRLF);
      else originalModel.setEOL(monaco.editor.EndOfLineSequence.LF);
    }

    if (modifiedModel) {
      monaco.editor.setModelLanguage(modifiedModel, languageId);
      if (hasCarriageReturn)
        modifiedModel.setEOL(monaco.editor.EndOfLineSequence.CRLF);
      else modifiedModel.setEOL(monaco.editor.EndOfLineSequence.LF);
    }

    const modifiedDecorations = modifiedEditor.createDecorationsCollection();
    const originalDecorations = originalEditor.createDecorationsCollection();
    hoverDecorationsRef.current = modifiedEditor.createDecorationsCollection([]);

    const updateDecorations = () => {
      const { start, end, originalEnd, afterLines } = boundariesRef.current;

      const modifiedTotalLines = modifiedEditor.getModel()?.getLineCount() || 0;
      const originalTotalLines = originalEditor.getModel()?.getLineCount() || 0;

      const dimOptions = {
        isWholeLine: true,
        inlineClassName: "readOnlyTextDim",
        className: "readOnlyBackgroundDim",
      };

      const newModifiedDecorations = [];
      const newOriginalDecorations = [];

      if (start > 1) {
        const topRange = new monaco.Range(1, 1, start - 1, 1);
        newModifiedDecorations.push({ range: topRange, options: dimOptions });
        newOriginalDecorations.push({ range: topRange, options: dimOptions });
      }

      if (afterLines > 0) {
        newModifiedDecorations.push({
          range: new monaco.Range(end + 1, 1, modifiedTotalLines, 1),
          options: dimOptions,
        });
        newOriginalDecorations.push({
          range: new monaco.Range(originalEnd + 1, 1, originalTotalLines, 1),
          options: dimOptions,
        });
      }

      if (end >= start) {
        newModifiedDecorations.push({
          range: new monaco.Range(start, 1, end, 1),
          options: { isWholeLine: true, className: "modifiedBlockBg" },
        });
        newModifiedDecorations.push({
          range: new monaco.Range(start, 1, start, 1),
          options: { isWholeLine: true, className: "modifiedBlockTop" },
        });
        newModifiedDecorations.push({
          range: new monaco.Range(end, 1, end, 1),
          options: { isWholeLine: true, className: "modifiedBlockBottom" },
        });
      }

      if (originalEnd >= start) {
        newOriginalDecorations.push({
          range: new monaco.Range(start, 1, originalEnd, 1),
          options: { isWholeLine: true, className: "originalBlockBg" },
        });
        newOriginalDecorations.push({
          range: new monaco.Range(start, 1, start, 1),
          options: { isWholeLine: true, className: "originalBlockTop" },
        });
        newOriginalDecorations.push({
          range: new monaco.Range(originalEnd, 1, originalEnd, 1),
          options: { isWholeLine: true, className: "originalBlockBottom" },
        });
      }

      modifiedDecorations.set(newModifiedDecorations);
      originalDecorations.set(newOriginalDecorations);
    };

    updateDecorationsRef.current = updateDecorations;

    modifiedEditor.onDidChangeCursorPosition((e) => {
      const currentLine = e.position.lineNumber;
      const { start, end } = boundariesRef.current;

      if (currentLine < start || currentLine > end) {
        modifiedEditor.updateOptions({ readOnly: true });
      } else {
        modifiedEditor.updateOptions({ readOnly: false });
      }
    });

    modifiedEditor.onKeyDown((e) => {
      const { start, end } = boundariesRef.current;
      const selections = modifiedEditor.getSelections();
      const position = modifiedEditor.getPosition();

      if (!selections || !position) return;
      const isSelectionCrossingBoundaries = selections.some((selection) => {
        return (
          selection.startLineNumber < start || selection.endLineNumber > end
        );
      });

      const isSelectionEmpty = selections.every((sel) => sel.isEmpty());
      if (!isSelectionEmpty && isSelectionCrossingBoundaries) {
        const isModifyingKey =
          e.keyCode === monaco.KeyCode.Backspace ||
          e.keyCode === monaco.KeyCode.Delete ||
          e.keyCode === monaco.KeyCode.Enter ||
          e.keyCode === monaco.KeyCode.Space ||
          (e.keyCode >= monaco.KeyCode.KeyA &&
            e.keyCode <= monaco.KeyCode.KeyZ) ||
          (e.keyCode >= monaco.KeyCode.Digit0 &&
            e.keyCode <= monaco.KeyCode.Digit9);

        if (isModifyingKey) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      if (isSelectionEmpty) {
        if (
          e.keyCode === monaco.KeyCode.Backspace &&
          position.lineNumber === start &&
          position.column === 1
        ) {
          e.preventDefault();
          e.stopPropagation();
        }

        if (
          e.keyCode === monaco.KeyCode.Delete &&
          position.lineNumber === end &&
          position.column === modifiedEditor.getModel()?.getLineMaxColumn(end)
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    });

    const handleExpandRegionClick = (clickedLine: number) => {
      const newRegions = calculateExpandedRegions(
        clickedLine,
        latestPropsRef.current,
        hasCarriageReturn
      );
      if (newRegions) {
        onCodeChange(
          newRegions.beforeCode,
          newRegions.originalCode,
          newRegions.modifiedCode,
          newRegions.afterCode,
        );
      }
    };

    modifiedEditor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
        const clickedLine = e.target.position?.lineNumber;
        if (clickedLine && clickedLine === hoveredLineRef.current) {
          handleExpandRegionClick(clickedLine);
        }
      }
    });

    modifiedEditor.onMouseMove((e) => {
      const target = e.target;
      const position = target.position;

      if (
        !position ||
        target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        clearHover();
        return;
      }

      const currentLine = position.lineNumber;
      const { start, end } = boundariesRef.current;
      const isExpandable = currentLine < start || currentLine > end;

      if (currentLine !== hoveredLineRef.current) {
        hoveredLineRef.current = currentLine;

        if (isExpandable) {
          hoverDecorationsRef.current?.set([
            {
              range: new monaco.Range(currentLine, 1, currentLine, 1),
              options: {
                isWholeLine: true,
                className: styles["monaco-hover-line-yellow"],
                marginClassName: styles["monaco-expand-plus-btn"],
              },
            },
          ]);
        } else {
          clearHover();
        }
      }
    });

    modifiedEditor.onMouseLeave(() => clearHover());

    function clearHover() {
      if (hoveredLineRef.current !== null) {
        hoveredLineRef.current = null;
        hoverDecorationsRef.current?.clear();
      }
    }

    modifiedEditor.onDidChangeModelContent((e) => {
      const totalLines = modifiedEditor.getModel()?.getLineCount() || 0;
      boundariesRef.current.end = totalLines - boundariesRef.current.afterLines;
      updateDecorations();

      if (e.isFlush) return;

      if (onCodeChange) {
        const model = modifiedEditor.getModel();
        if (model) {
          const { start, end } = boundariesRef.current;
          let extractedCode = "";

          if (end >= start) {
            const endColumn = model.getLineMaxColumn(end);
            extractedCode = model.getValueInRange(
              new monaco.Range(start, 1, end, endColumn),
            );
          }

          const { beforeCode, originalCode, afterCode, modifiedCode } =
            latestPropsRef.current;

          if (extractedCode !== modifiedCode) {
            onCodeChange(beforeCode, originalCode, extractedCode, afterCode);
          }
        }
      }
    });

    setTimeout(() => {
      updateDecorations();
      const startLine = boundariesRef.current.start;
      setTimeout(() => {
        modifiedEditor.revealLineNearTop(startLine);
      }, 50);
    }, 50);
  };

  return handleEditorMount;
}