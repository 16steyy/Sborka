import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  path: string;
  language: string;
  content: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ path, language, content, onChange }: CodeEditorProps) {
  return (
    <Editor
      key={path}
      height="100%"
      language={language}
      value={content}
      theme="vs-dark"
      onChange={(v) => onChange(v ?? "")}
      options={{
        fontSize: 14,
        fontFamily: "Consolas, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        automaticLayout: true,
      }}
    />
  );
}
