import styles from "./ConflictResolution.module.css";
import { Monaco } from "@monaco-editor/react";
import type * as MonacoEditor from "monaco-editor";

// A generic representation of a conflict block for a specific side (Current or Incoming)
export interface SideConflictBlock {
  id: string; // Unique ID linking this conflict across all 3 windows
  start: number; // Start line in this specific read-only editor
  end: number; // End line in this specific read-only editor
  text: string; // The text content to transfer to the bottom
  isResolved: boolean; // Whether the user has already transferred this block
}

/**
 * This function will handle the renderering of each widget, inserting it above each conflict block
 * @param block Further parsed block. Refers to a specific conflict block
 * @param side String used to add to text depending on whether it is the current or incoming side
 * @param monaco monaco instance
 * @param editor code editor instance
 * @param acceptFunc Funciton call to update the result with this new widget
 * @returns Widgets that are used to accept changes
 */
function insertSideWidget(
  block: SideConflictBlock,
  side: "current" | "incoming",
  monaco: Monaco,
  editor: MonacoEditor.editor.IStandaloneCodeEditor,
  acceptFunc: (block: SideConflictBlock) => void,
): [MonacoEditor.editor.IContentWidget, string] {
  const widget: MonacoEditor.editor.IContentWidget = {
    getId() {
      return `conflict.widget.${side}.${block.id}`;
    },

    getDomNode() {
      const node = document.createElement("div");
      node.className = styles.conflictWidget;

      const acceptBtn = document.createElement("button");
      acceptBtn.innerText =
        side === "current" ? "Accept Current" : "Accept Incoming";
      acceptBtn.className = styles.conflictWidgetButton;

      // Single action: Transfer this block's text
      acceptBtn.addEventListener("click", () => {
        acceptFunc(block);
      });

      node.appendChild(acceptBtn);
      return node;
    },

    getPosition() {
      return {
        position: {
          lineNumber: block.start,
          column: 1,
        },
        preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE],
      };
    },
  };

  let zoneId: string = "";

  editor.changeViewZones((accessor) => {
    const domNode = document.createElement("div");
    domNode.className = styles.viewZone;

    zoneId = accessor.addZone({
      afterLineNumber: block.start - 1,
      heightInLines: 1,
      domNode,
    });
  });

  editor.addContentWidget(widget);
  return [widget, zoneId];
}

/**
 * Tells the editor to remove widgets and the blank space they come with
 * @param editor monaco editor instance
 * @param widgets widgets to remove
 * @param zoneIds zones that have the view zone above them
 */
function clearWidgets(
  editor: MonacoEditor.editor.IStandaloneCodeEditor,
  widgets: Map<string, MonacoEditor.editor.IContentWidget>,
  zoneIds: Map<string, string>,
): void {
  for (const widget of widgets.values()) {
    editor.removeContentWidget(widget);
  }
  editor.changeViewZones((accessor) => {
    for (const zoneId of zoneIds.values()) {
      accessor.removeZone(zoneId);
    }
  });
}

/**
 * This function will render the conflict blocks. It seperates them into decoration blocks, and inserts a widget above them.
 * @param editor monaco editor instance
 * @param model text model, handles the look and scrolling
 * @param monaco monaco
 * @param blocks a collection of actual conflict blocks inside of the editor
 * @param side string used for widgets, just represents current/incoming
 * @param oldDecorationIds previous decoration ids, used by monoco to update their decorations
 * @param widgets collection of widgets rendered on the editor
 * @param zoneIds collection of zoneIds, corresponding to the different blocks
 * @param acceptFunc what to do when the widget is clicked (updates the result)
 * @returns The new deocration ids, which will be reused on rerenders
 */
export function renderSideConflicts(
  editor: MonacoEditor.editor.IStandaloneCodeEditor,
  model: MonacoEditor.editor.ITextModel,
  monaco: Monaco,
  blocks: SideConflictBlock[],
  side: "current" | "incoming",
  oldDecorationIds: string[],
  widgets: Map<string, MonacoEditor.editor.IContentWidget>,
  zoneIds: Map<string, string>,
  acceptFunc: (block: SideConflictBlock) => void,
): string[] {
  clearWidgets(editor, widgets, zoneIds);
  const newDecorationsList: MonacoEditor.editor.IModelDeltaDecoration[] = [];

  for (const block of blocks) {
    if (!block.isResolved) {
      const [widget, zoneId] = insertSideWidget(
        block,
        side,
        monaco,
        editor,
        acceptFunc,
      );
      widgets.set(block.id, widget);
      zoneIds.set(block.id, zoneId);
    }

    if (block.start !== block.end) {
      newDecorationsList.push({
        range: new monaco.Range(block.start, 1, block.end, 1),
        options: {
          isWholeLine: true,
          className: side === "current" ? styles.current : styles.incoming,
        },
      });
    } else {
      console.log("Empty block found, skipping visual highlight");
    }
  }

  return model.deltaDecorations(oldDecorationIds, newDecorationsList);
}

/**
 * Inserts the reverse changes widget in the result editor.
 * It makes the widget then returns the widget and id to be inserted
 * @param editor monaco window instance
 * @param monaco monaco
 * @param conflictId Id of the deocration this refers to
 * @param lineNumber line number the widget correlates to
 * @param handleReverseFunc reverse function on click
 * @returns the widget and zone id to be used for insertion
 */
export function insertReverseWidget(
  editor: MonacoEditor.editor.IStandaloneCodeEditor,
  monaco: Monaco,
  conflictId: string,
  lineNumber: number,
  handleReverseFunc: (id: string) => void,
): [MonacoEditor.editor.IContentWidget, string] {
  const widget: MonacoEditor.editor.IContentWidget = {
    getId() {
      return `conflict.widget.reverse.${conflictId}`;
    },

    getDomNode() {
      const node = document.createElement("div");
      node.className = styles.conflictWidget;

      const reverseBtn = document.createElement("button");
      reverseBtn.innerText = "Reverse Changes";
      reverseBtn.className = styles.conflictWidgetButton;

      reverseBtn.addEventListener("click", () => {
        handleReverseFunc(conflictId);
      });

      node.appendChild(reverseBtn);
      return node;
    },

    getPosition() {
      return {
        position: {
          lineNumber: lineNumber,
          column: 1,
        },
        preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE],
      };
    },
  };

  let zoneId: string = "";

  editor.changeViewZones((accessor) => {
    const domNode = document.createElement("div");
    domNode.className = styles.viewZone;

    zoneId = accessor.addZone({
      afterLineNumber: lineNumber - 1,
      heightInLines: 1,
      domNode,
    });
  });

  editor.addContentWidget(widget);

  return [widget, zoneId];
}
