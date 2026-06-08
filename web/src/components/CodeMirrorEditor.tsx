"use client";

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";

interface CodeMirrorEditorProps {
  value: string;
  onChange: (next: string) => void;
}

/**
 * CodeMirror 6 editor with Markdown grammar + nested-language
 * highlighting for fenced code blocks (python, bash, sql, json, mermaid,
 * …). Loaded lazily by Editor.tsx so the language-data bundle isn't on
 * the initial-paint critical path.
 */
export function CodeMirrorEditor({ value, onChange }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height="100%"
      theme={editorTheme}
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorView.lineWrapping,
      ]}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      placeholder="# Paste or type Markdown here…&#10;&#10;Drag a .md file in to load it."
      className="h-full text-sm"
    />
  );
}

/**
 * Light theme tuned to match the Confluence palette used elsewhere in
 * the app. Kept minimal — defers most styling to CodeMirror defaults.
 */
const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "#ffffff",
      color: "#172b4d",
    },
    ".cm-content": {
      fontFamily:
        '"SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      padding: "16px",
      caretColor: "#0747a6",
    },
    ".cm-gutters": {
      backgroundColor: "#ffffff",
      borderRight: "none",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "#deebff !important",
    },
    ".cm-placeholder": {
      color: "#5e6c84",
    },
    ".cm-scroller": {
      lineHeight: "1.55",
    },
  },
  { dark: false },
);
