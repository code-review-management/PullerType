"use client";
import styles from "./ConflictResolution.module.css";
import { Editor, useMonaco, loader } from "@monaco-editor/react";
import * as MonacoEditor from "monaco-editor";
import { useState, useMemo, useRef, useEffect } from "react";
import useIsDark from "./useIsDark";
import { parseMerge, ParsedConflict } from "./parseMerge";
import {
  updateSidePanelsUI,
  updateResultPanelUI,
  sharedEditorOptions,
} from "./configureEditor";
import { ConflictResolutionProp } from "../../page";
import {
  SyncAnchor,
  bindInterpolatedScroll,
  generateAnchors,
  refreshAnchors,
} from "./syncedScrolling";
import {
  MergeOutput,
  MergeFileOutput,
  MergeCommitInputData,
  MergeCommitContent,
} from "@/app/api/v1/[owner]/[repo]/pulls/[pull_number]/conflicts/_utils/merge-github.types";
import HeaderButton from "@components/HeaderButton/HeaderButton";
import MergeSuccessPopup from "./WindowPopup/MergeSuccessPopup";
import UnresolvedFilesPopup from "./WindowPopup/UnresolvedFilesPopup";

export interface FileWorkspaceState {
  currentModel: MonacoEditor.editor.ITextModel;
  incomingModel: MonacoEditor.editor.ITextModel;
  resultModel: MonacoEditor.editor.ITextModel;
  conflicts: ParsedConflict[];
  resultDecorations: Record<string, string[]>;
  currentDecorations: string[];
  incomingDecorations: string[];
  viewState?: MonacoEditor.editor.ICodeEditorViewState | null;
  syncAnchors: SyncAnchor[];
}

loader.config({ monaco: MonacoEditor });

/**
 * The 3 window conflict resolution view with the top 2 pages being read only and the bottom is writable and the merge contents.
 * It initializes 3 instances of Monaco Editor, and uses decorations to block and color items
 * It uses widgets to interact with the decorations and transfers data between the instances
 * Editor state (for all 3) is cached per file, uploading the correct cache when files are swapped
 * @param conflictResolutionProp contains all the info from the parameters or url and the fetch, split into 2 objects:
 *        branchInfoProp is the parameters including owner, repo, target and feature branch. Used to make API calls
 *        mergeOutput comes form the server. This is file content that we split to render
 */
export default function ConflictResolution({
  conflictResolutionProp,
}: {
  conflictResolutionProp: ConflictResolutionProp;
}) {
  const mergeOutput: MergeOutput = conflictResolutionProp.mergeOutput;
  const monaco = useMonaco();
  const { isDark } = useIsDark();
  const themeStr = isDark ? "vs-dark" : "vs-light";
  const { owner, repo, pullId, targetBranch, featureBranch } =
    conflictResolutionProp.branchInfoProp;

  const conflictingFiles = useMemo(
    () => mergeOutput.mergedFiles.filter((file) => file.hasConflict),
    [mergeOutput],
  );
  const [activeFile, setActiveFile] = useState<MergeFileOutput | null>(
    conflictingFiles.length > 0 ? conflictingFiles[0] : null,
  );

  // Editor references
  const [currentEditor, setCurrentEditor] =
    useState<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const [incomingEditor, setIncomingEditor] =
    useState<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const [resultEditor, setResultEditor] =
    useState<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);

  //Merge state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showUnresolvedPopup, setShowUnresolvedPopup] = useState(false);
  const [unresolvedFilesList, setUnresolvedFilesList] = useState<string[]>([]);

  // Model Cache
  const workspaceCache = useRef<Record<string, FileWorkspaceState>>({});
  const prevFileRef = useRef<string | null>(null);

  // Global Widget Refs
  const currentWidgetsRef = useRef(
    new Map<string, MonacoEditor.editor.IContentWidget>(),
  );
  const currentZoneIdsRef = useRef(new Map<string, string>());

  const incomingWidgetsRef = useRef(
    new Map<string, MonacoEditor.editor.IContentWidget>(),
  );
  const incomingZoneIdsRef = useRef(new Map<string, string>());

  const resultWidgetsRef = useRef(
    new Map<string, MonacoEditor.editor.IContentWidget>(),
  );
  const resultZoneIdsRef = useRef(new Map<string, string>());

  // State Tracking
  const [globalResolvedState, setGlobalResolvedState] = useState<
    Record<string, Record<string, { ours?: boolean; theirs?: boolean }>>
  >({});
  const resolvedState = activeFile
    ? globalResolvedState[activeFile.filename] || {}
    : {};

  //Used to update the file state of each function
  const setResolvedState = (updater: any) => {
    if (!activeFile) return;
    setGlobalResolvedState((prev) => {
      const currentState = prev[activeFile.filename] || {};
      const newState =
        typeof updater === "function" ? updater(currentState) : updater;
      return { ...prev, [activeFile.filename]: newState };
    });
  };

  /**
   * This effect handles file state caching upon a request
   */
  useEffect(() => {
    if (
      !monaco ||
      !currentEditor ||
      !incomingEditor ||
      !resultEditor ||
      !activeFile
    )
      return;

    const filename = activeFile.filename;

    if (prevFileRef.current && workspaceCache.current[prevFileRef.current]) {
      workspaceCache.current[prevFileRef.current].viewState =
        resultEditor.saveViewState();
    }

    if (!workspaceCache.current[filename]) {
      const parsed = parseMerge(activeFile.contents);

      const cModel = monaco.editor.createModel(
        parsed.currentContent,
        undefined,
        monaco.Uri.file("current_" + filename),
      );
      const iModel = monaco.editor.createModel(
        parsed.incomingContent,
        undefined,
        monaco.Uri.file("incoming_" + filename),
      );
      const rModel = monaco.editor.createModel(
        parsed.resultContent,
        undefined,
        monaco.Uri.file(filename),
      );
      const resultDecs: Record<string, string[]> = {};

      parsed.conflicts.forEach((c) => {
        resultDecs[c.id] = rModel.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(
                c.resultInsertLine,
                1,
                c.resultInsertLine,
                1,
              ),
              options: {
                stickiness:
                  monaco.editor.TrackedRangeStickiness
                    .AlwaysGrowsWhenTypingAtEdges,
              },
            },
          ],
        );
      });

      const initialAnchors = generateAnchors(
        parsed.conflicts,
        rModel,
        resultDecs,
        cModel.getLineCount(),
        iModel.getLineCount(),
        rModel.getLineCount(),
      );

      workspaceCache.current[filename] = {
        currentModel: cModel,
        incomingModel: iModel,
        resultModel: rModel,
        conflicts: parsed.conflicts,
        resultDecorations: resultDecs,
        currentDecorations: [],
        incomingDecorations: [],
        viewState: null,
        syncAnchors: initialAnchors,
      };
    }

    // Swap the models into the editors!
    const cache = workspaceCache.current[filename];
    currentEditor.setModel(cache.currentModel);
    incomingEditor.setModel(cache.incomingModel);
    resultEditor.setModel(cache.resultModel);

    if (cache.viewState) {
      resultEditor.restoreViewState(cache.viewState);
    }

    prevFileRef.current = filename;
  }, [activeFile, monaco, currentEditor, incomingEditor, resultEditor]);

  /**
   * This triggers when the editor is changed, and calls the functions to interpolate between the scroll locations
   */
  useEffect(() => {
    if (!currentEditor || !incomingEditor || !resultEditor || !activeFile)
      return;

    const cache = workspaceCache.current[activeFile.filename];
    if (!cache) return;

    const syncState = { isSyncing: false };

    // Pass a getter function `() => cache.syncAnchors` so it always has the latest data
    const sync1 = bindInterpolatedScroll(
      currentEditor,
      incomingEditor,
      resultEditor,
      () => cache.syncAnchors,
      "currentLine",
      "incomingLine",
      "resultLine",
      syncState,
    );
    const sync2 = bindInterpolatedScroll(
      incomingEditor,
      currentEditor,
      resultEditor,
      () => cache.syncAnchors,
      "incomingLine",
      "currentLine",
      "resultLine",
      syncState,
    );
    const sync3 = bindInterpolatedScroll(
      resultEditor,
      currentEditor,
      incomingEditor,
      () => cache.syncAnchors,
      "resultLine",
      "currentLine",
      "incomingLine",
      syncState,
    );

    return () => {
      sync1.dispose();
      sync2.dispose();
      sync3.dispose();
    };
  }, [activeFile, currentEditor, incomingEditor, resultEditor]);

  /**
   * This is called when the "Accept ..." is clicked. it gives the resulting block a new decoration of text zone
   * @param conflictId the id of the decoration block of the change
   * @param side which side the change comes from
   * @param textToInsert text of the block
   */
  const handleTransferBlock = (
    conflictId: string,
    side: "ours" | "theirs",
    textToInsert: string,
  ) => {
    if (!resultEditor || !monaco || !activeFile) return;

    const cache = workspaceCache.current[activeFile.filename];
    const decorationIds = cache?.resultDecorations[conflictId];
    if (!decorationIds) return;

    const currentRange = cache.resultModel.getDecorationRange(decorationIds[0]);
    if (!currentRange) return;

    const linesToInsert = textToInsert ? textToInsert.split("\n").length : 0;
    const textPayload = textToInsert ? textToInsert + "\n" : "";
    const insertLine = currentRange.endLineNumber;

    resultEditor.executeEdits("merge-resolver", [
      {
        range: new monaco.Range(insertLine, 1, insertLine, 1),
        text: textPayload,
        forceMoveMarkers: true,
      },
    ]);

    const trackingEndLine = insertLine + linesToInsert;
    const visualEndLine = trackingEndLine - 1;
    const totalLinesInBlock = trackingEndLine - currentRange.startLineNumber;

    const deltaDecorations: MonacoEditor.editor.IModelDeltaDecoration[] = [
      {
        range: new monaco.Range(
          currentRange.startLineNumber,
          1,
          trackingEndLine,
          1,
        ),
        options: {
          stickiness:
            monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
          zIndex: 0,
        },
      },
    ];

    if (totalLinesInBlock > 0) {
      deltaDecorations.push({
        range: new monaco.Range(
          currentRange.startLineNumber,
          1,
          visualEndLine,
          1,
        ),
        options: {
          stickiness:
            monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
          isWholeLine: true,
          className: styles.resolvedHighlight,
          zIndex: 10,
        },
      });
    }

    cache.resultDecorations[conflictId] = cache.resultModel.deltaDecorations(
      decorationIds,
      deltaDecorations,
    );
    refreshAnchors(cache);
    setResolvedState((prev: any) => ({
      ...prev,
      [conflictId]: { ...prev[conflictId], [side]: true },
    }));
  };

  /**
   * This is called when the "Reverse" is clicked.
   * It tells monaco to reverse changes in the docoration range
   * @param conflictId the id of the decoration block to reverse
   */
  const handleReverseBlock = (conflictId: string) => {
    if (!resultEditor || !monaco || !activeFile) return;

    const cache = workspaceCache.current[activeFile.filename];
    const decorationIds = cache?.resultDecorations[conflictId];
    if (!decorationIds) return;

    const currentRange = cache.resultModel.getDecorationRange(decorationIds[0]);
    if (!currentRange) return;

    resultEditor.executeEdits("merge-resolver-undo", [
      {
        range: new monaco.Range(
          currentRange.startLineNumber,
          1,
          currentRange.endLineNumber,
          1,
        ),
        text: "",
        forceMoveMarkers: true,
      },
    ]);

    cache.resultDecorations[conflictId] = cache.resultModel.deltaDecorations(
      decorationIds,
      [
        {
          range: new monaco.Range(
            currentRange.startLineNumber,
            1,
            currentRange.startLineNumber,
            1,
          ),
          options: {
            stickiness:
              monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
          },
        },
      ],
    );

    refreshAnchors(cache);

    setResolvedState((prev: any) => {
      const newState = { ...prev };
      delete newState[conflictId];
      return newState;
    });
  };

  /**
   * Handles when the mergebutton is clicked
   * Does a popup if there are untouched blocks
   */
  const handleMergeClicked = async () => {
    if (isMerging) return;

    const filesWithUnresolvedConflicts: string[] = [];
    for (const file of conflictingFiles) {
      const filename = file.filename;
      let fileConflicts: ParsedConflict[] = [];

      // If the user opened the file, grab conflicts from the cache.
      // If they haven't opened it yet, parse it quickly to find the conflicts.
      if (workspaceCache.current[filename]) {
        fileConflicts = workspaceCache.current[filename].conflicts;
      } else {
        const parsed = parseMerge(file.contents);
        fileConflicts = parsed.conflicts;
      }

      const fileResolvedState = globalResolvedState[filename] || {};

      // Check if any block in this file is missing both 'ours' and 'theirs'
      const hasUnresolved = fileConflicts.some((conflict) => {
        const blockState = fileResolvedState[conflict.id];
        return !blockState || (!blockState.ours && !blockState.theirs);
      });

      if (hasUnresolved) {
        filesWithUnresolvedConflicts.push(filename);
      }
    }

    if (filesWithUnresolvedConflicts.length > 0) {
      setUnresolvedFilesList(filesWithUnresolvedConflicts);
      setShowUnresolvedPopup(true);
      return;
    } else {
      mergeResolutionContents();
    }
  };

  /**
   * Gathers relevant info from each model cache, and then it sends the api request to merge
   * Does pop up on success
   */
  const mergeResolutionContents = async () => {
    if (isMerging) return;
    setIsMerging(true);
    try {
      const contentPayload: MergeCommitContent[] = mergeOutput.mergedFiles.map(
        (file) => {
          const cachedWorkspace = workspaceCache.current[file.filename];
          return {
            filename: file.filename,
            content: cachedWorkspace
              ? cachedWorkspace.resultModel.getValue()
              : file.contents,
          };
        },
      );

      const inputPayload: MergeCommitInputData = {
        owner: owner,
        repo: repo,
        targetMergeSha: mergeOutput.targetShaAtMerge,
        targetBranch: targetBranch,
        featureBranch: featureBranch,
      };

      const response = await fetch(
        `/api/v1/${owner}/${repo}/pulls/${pullId}/conflicts/commit-merge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mergeCommitData: inputPayload,
            mergeContent: contentPayload,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Server rejected with status: ${response.status}`);
      }

      setShowSuccessPopup(true);
    } catch (error) {
      console.error("Merge submission failed:", error);
      alert("Merge Failed, something went wrong");
    } finally {
      setIsMerging(false);
    }
  };

  /**
   * This effect rerenders the editors on change.
   * It resets each editor then it calls the rerender functions
   */
  useEffect(() => {
    if (
      !activeFile ||
      !currentEditor ||
      !incomingEditor ||
      !resultEditor ||
      !monaco
    )
      return;

    const cache = workspaceCache.current[activeFile.filename];
    if (!cache) return; // Wait until models are created

    // WIPE Current/Incoming Widgets
    currentWidgetsRef.current.forEach((w) =>
      currentEditor.removeContentWidget(w),
    );
    currentWidgetsRef.current.clear();
    currentEditor.changeViewZones((accessor) => {
      currentZoneIdsRef.current.forEach((z) => accessor.removeZone(z));
      currentZoneIdsRef.current.clear();
    });

    incomingWidgetsRef.current.forEach((w) =>
      incomingEditor.removeContentWidget(w),
    );
    incomingWidgetsRef.current.clear();
    incomingEditor.changeViewZones((accessor) => {
      incomingZoneIdsRef.current.forEach((z) => accessor.removeZone(z));
      incomingZoneIdsRef.current.clear();
    });

    // WIPE Result Widgets
    resultWidgetsRef.current.forEach((w) =>
      resultEditor.removeContentWidget(w),
    );
    resultWidgetsRef.current.clear();
    resultEditor.changeViewZones((accessor) => {
      resultZoneIdsRef.current.forEach((z) => accessor.removeZone(z));
      resultZoneIdsRef.current.clear();
    });

    const { newCurrentIds, newIncomingIds } = updateSidePanelsUI(
      monaco,
      currentEditor,
      incomingEditor,
      cache.currentModel,
      cache.incomingModel,
      cache.conflicts,
      resolvedState,
      cache.currentDecorations, // Pass from cache
      cache.incomingDecorations, // Pass from cache
      currentWidgetsRef.current,
      incomingWidgetsRef.current,
      currentZoneIdsRef.current,
      incomingZoneIdsRef.current,
      (blockId, text) => handleTransferBlock(blockId, "ours", text),
      (blockId, text) => handleTransferBlock(blockId, "theirs", text),
    );

    // SAVE the new IDs back to the cache so they can be cleaned up next time!
    cache.currentDecorations = newCurrentIds;
    cache.incomingDecorations = newIncomingIds;

    updateResultPanelUI(
      monaco,
      resultEditor,
      cache.resultModel, // NEW
      cache.conflicts,
      resolvedState,
      cache.resultDecorations, // Now strictly an array of string IDs
      resultWidgetsRef.current,
      resultZoneIdsRef.current,
      handleReverseBlock,
    );
  }, [
    activeFile,
    resolvedState,
    currentEditor,
    incomingEditor,
    resultEditor,
    monaco,
  ]);

  if (!activeFile)
    return <div className={styles.noConflicts}>No conflicts to resolve.</div>;

  return (
    <div
      className={styles.conflictResolution}
      data-theme={isDark ? "dark" : "light"}
    >
      <div className={styles.fileTabBar}>
        {conflictingFiles.map((file) => (
          <button
            key={file.filename}
            className={`${styles.tabButton} ${activeFile?.filename === file.filename ? styles.activeTab : ""}`}
            onClick={() => setActiveFile(file)}
          >
            {file.filename}
          </button>
        ))}

        <div className={styles.completeMergeButton}>
          <HeaderButton onClick={() => handleMergeClicked()}>
            <span
              className={
                isMerging ? styles.loadingText : styles.completeMergeButtonText
              }
            >
              {isMerging ? "Merging" : "Merge"}
            </span>
          </HeaderButton>
        </div>
      </div>

      <UnresolvedFilesPopup
        isOpen={showUnresolvedPopup}
        onClose={() => setShowUnresolvedPopup(false)}
        files={unresolvedFilesList}
        isDarkMode={isDark}
      >
        <HeaderButton
          onClick={() => {
            setShowUnresolvedPopup(false);
            mergeResolutionContents();
          }}
          variant="primary"
        >
          Proceed
        </HeaderButton>
      </UnresolvedFilesPopup>

      <MergeSuccessPopup
        isOpen={showSuccessPopup}
        isDark={isDark}
        targetBranch={conflictResolutionProp.branchInfoProp.targetBranch}
        featureBranch={conflictResolutionProp.branchInfoProp.featureBranch}
      >
        <HeaderButton
          href={`/${owner}/${repo}/pull/${pullId}`}
          variant="secondary"
        >
          Home
        </HeaderButton>
      </MergeSuccessPopup>

      <div className={styles.mergeLayout}>
        <div className={styles.topHalf}>
          <div className={styles.splitPaneLeft}>
            <div className={styles.paneHeader}>Current (Ours)</div>
            <Editor
              theme={themeStr}
              defaultLanguage="javascript"
              options={{
                ...sharedEditorOptions,
                readOnly: true,
                minimap: { enabled: false },
              }}
              onMount={(editor) => {
                setCurrentEditor(editor);
              }}
            />
          </div>

          <div className={styles.splitPaneRight}>
            <div className={styles.paneHeader}>Incoming (Theirs)</div>
            <Editor
              theme={themeStr}
              defaultLanguage="javascript"
              options={{
                ...sharedEditorOptions,
                readOnly: true,
                minimap: { enabled: false },
              }}
              onMount={(editor) => {
                setIncomingEditor(editor);
              }}
            />
          </div>
        </div>

        <div className={styles.bottomHalf}>
          <div className={styles.paneHeader}>Result (Interactive)</div>
          <Editor
            theme={themeStr}
            defaultLanguage="javascript"
            options={{ ...sharedEditorOptions, minimap: { enabled: true } }}
            onMount={(editor) => {
              setResultEditor(editor);
            }}
          />
        </div>
      </div>
    </div>
  );
}
