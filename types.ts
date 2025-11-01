export enum AppMode {
  PARAGRAPH = 'paragraph',
  SINGLE_FILE = 'single_file',
  ZIP = 'zip',
  FOLDER = 'folder',
}

export interface FileObject {
  path: string;
  content: string;
}

export interface SyncStatus {
  state: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  url?: string;
}

export interface ParsedFile {
    filename: string;
    language: string;
    code: string;
}

export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: TreeNode[];
  content?: string;
}

export interface GithubUser {
  login: string;
  avatar_url: string;
  name: string;
}
