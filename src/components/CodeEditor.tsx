import Editor from "@monaco-editor/react";
import type { AppSettings } from "../types";

interface CodeEditorProps {
  path: string;
  language: string;
  content: string;
  settings: AppSettings;
  onChange: (value: string) => void;
}

export function CodeEditor({ path, language, content, settings, onChange }: CodeEditorProps) {
  return (
    <Editor
      key={path}
      height="100%"
      language={language}
      value={content}
      theme={settings.editor_theme}
      onChange={(v) => onChange(v ?? "")}
      options={{
        fontSize: settings.editor_font_size,
        fontFamily: "Consolas, monospace",
        minimap: { enabled: settings.editor_minimap },
        scrollBeyondLastLine: false,
        wordWrap: settings.editor_word_wrap ? "on" : "off",
        tabSize: settings.editor_tab_size,
        lineNumbers: settings.editor_line_numbers ? "on" : "off",
        automaticLayout: true,
      }}
    />
  );
}
