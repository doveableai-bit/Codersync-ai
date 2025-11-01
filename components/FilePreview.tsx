import React, { useState, useEffect, useMemo } from 'react';
import type { FileObject, TreeNode } from '../types';
import { FileIcon, ChevronRightIcon } from './Icons';
import { buildFileTree } from '../utils/helpers';

const FileTreeNodeComponent: React.FC<{
  node: TreeNode;
  onFileSelect: (file: TreeNode) => void;
  selectedPath: string | null;
  level: number;
}> = ({ node, onFileSelect, selectedPath, level }) => {
  const [isOpen, setIsOpen] = useState(true);

  const isFolder = node.type === 'folder';

  const handleSelect = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node);
    }
  };

  const isSelected = !isFolder && selectedPath === node.path;

  return (
    <>
      <li>
        <button
          onClick={handleSelect}
          style={{ paddingLeft: `${0.5 + level * 1.25}rem` }}
          className={`w-full text-left py-1.5 text-sm rounded-md flex items-center space-x-2 transition-colors ${
            isSelected
              ? 'bg-blue-900/50 text-white'
              : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          {isFolder ? (
            <ChevronRightIcon className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          ) : (
            <FileIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
      </li>
      {isFolder && isOpen && node.children && (
        <ul className="pl-0">
          {node.children.map((childNode) => (
            <FileTreeNodeComponent
              key={childNode.path}
              node={childNode}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </>
  );
};

const FilePreview: React.FC<{ files: FileObject[] }> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);
  const fileTree = useMemo(() => buildFileTree(files), [files]);

  useEffect(() => {
    const findFirstFile = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.type === 'file') return node;
        if (node.children) {
          const firstFile = findFirstFile(node.children);
          if (firstFile) return firstFile;
        }
      }
      return null;
    };

    if (files.length > 0) {
      setSelectedFile(findFirstFile(fileTree));
    } else {
      setSelectedFile(null);
    }
  }, [files, fileTree]);
  
  const handleFileSelect = (file: TreeNode) => {
    if (file.type === 'file') {
      setSelectedFile(file);
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 justify-center items-center text-gray-500">
        <p>No files to preview.</p>
        <p className="text-sm">Provide input on the left to see results here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      <h2 className="text-lg font-semibold text-white p-4 border-b border-gray-700 flex-shrink-0">
        File Preview ({files.length} files)
      </h2>
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto p-2">
          <ul className="pl-0">
            {fileTree.map((node) => (
              <FileTreeNodeComponent
                key={node.path}
                node={node}
                onFileSelect={handleFileSelect}
                selectedPath={selectedFile?.path ?? null}
                level={0}
              />
            ))}
          </ul>
        </div>
        <div className="w-2/3 flex flex-col">
          {selectedFile ? (
            <div className="flex-grow overflow-hidden">
                <pre className="h-full w-full overflow-auto p-4 text-sm bg-gray-800">
                  <code className="font-mono text-gray-200">{selectedFile.content}</code>
                </pre>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-500">
              Select a file to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
