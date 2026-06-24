import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";
import type { FileNode } from "../types";

interface FileTreeProps {
  nodes: FileNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  depth?: number;
}

function TreeNode({
  node,
  activePath,
  onSelect,
  onContextMenu,
  depth = 0,
}: {
  node: FileNode;
  activePath: string | null;
  onSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.is_dir) {
    return (
      <div>
        <div
          className="tree-item"
          style={{ paddingLeft: depth * 16 + 8 }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(e) => onContextMenu(e, node)}
        >
          {expanded ? <ChevronDown size={14} className="icon" /> : <ChevronRight size={14} className="icon" />}
          {expanded ? <FolderOpen size={14} className="icon" /> : <Folder size={14} className="icon" />}
          <span className="name">{node.name}</span>
        </div>
        {expanded && node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            activePath={activePath}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`tree-item ${activePath === node.path ? "active" : ""}`}
      style={{ paddingLeft: depth * 16 + 28 }}
      onClick={() => onSelect(node.path)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      <File size={14} className="icon" />
      <span className="name">{node.name}</span>
    </div>
  );
}

export function FileTree({ nodes, activePath, onSelect, onContextMenu, depth = 0 }: FileTreeProps) {
  return (
    <div className="file-tree">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          activePath={activePath}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          depth={depth}
        />
      ))}
    </div>
  );
}
