import { useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import monacoStyles from "./MonacoEditor.module.css"
import { useDiffEditorSetup } from "./useDiffEditorSetup";

export interface SuggestionDiffEditorProps {
  originalCode: string;
  modifiedCode: string;
  beforeCode: string;
  afterCode: string;
  hasCarriageReturn: boolean;
  filename: string;
  onCodeChange: (
    newBeforeCode: string,
    newOriginalCode: string,
    newModifiedCode: string,
    newAfterCode: string,
  ) => void;
}

export interface RegionData {
  beforeCode: string;
  originalCode: string;
  modifiedCode: string;
  afterCode: string;
}

/**
 * This is the component that contains the monaco editor. It calls helper functions to initialize the actual editors
 * It then mounts these editors into the component
 * @param props Contians information about the suggestion, mostly the code regions, file information,
 *              and a function to update regions
 * @returns The component
 */
export function SuggestionDiffEditor(props: SuggestionDiffEditorProps) {
  const { beforeCode, originalCode, modifiedCode, afterCode, hasCarriageReturn, filename } = props;
  const handleEditorMount = useDiffEditorSetup(props);

  const buildFullCode = (before: string, middle: string, after: string) => {
    const joinToken: string = hasCarriageReturn ? "\r\n" : "\n";
    const parts = [];

    if (before) parts.push(before);
    parts.push(middle !== undefined && middle !== null ? middle : "");
    if (after) parts.push(after);
    return parts.join(joinToken);
  };

  const [editorOriginal, setEditorOriginal] = useState(() =>
    buildFullCode(beforeCode, originalCode, afterCode),
  );
  const [editorModified, setEditorModified] = useState(() =>
    buildFullCode(beforeCode, modifiedCode, afterCode),
  );

  const [prevBoundaries, setPrevBoundaries] = useState({
    before: beforeCode,
    after: afterCode,
  });

  if (
    beforeCode !== prevBoundaries.before ||
    afterCode !== prevBoundaries.after
  ) {
    setPrevBoundaries({ before: beforeCode, after: afterCode });
    setEditorOriginal(buildFullCode(beforeCode, originalCode, afterCode));
    setEditorModified(buildFullCode(beforeCode, modifiedCode, afterCode));
  }

  return (
    <div className={monacoStyles.editorContainer}>
      <DiffEditor
        height="100%"
        original={editorOriginal}
        modified={editorModified}
        originalModelPath={`original-${filename}`}
        modifiedModelPath={`modified-${filename}`}
        onMount={handleEditorMount}
        options={{
          automaticLayout: true,
          lineHeight: 22,
          renderSideBySide: true,
          readOnly: false,
          originalEditable: false,
          wordWrap: "on",
          minimap: { enabled: false },
          ignoreTrimWhitespace: false,
          scrollBeyondLastLine: false,
          renderOverviewRuler: false,
          renderValidationDecorations: 'off',
        }}
      />
    </div>
  );
}
