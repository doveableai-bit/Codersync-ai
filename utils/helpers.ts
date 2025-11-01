import type { FileObject, TreeNode } from './types';

declare global {
  interface Window {
    JSZip: any;
  }
}

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};


export const processZipFile = async (file: File): Promise<FileObject[]> => {
    if (!window.JSZip) {
        throw new Error("JSZip library not loaded. Cannot process ZIP files.");
    }
    const zip = await window.JSZip.loadAsync(file);
    const fileObjects: FileObject[] = [];
    const textFileExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.json', '.md', '.txt', '.py', '.java', '.c', '.cpp', '.go', '.rs', '.php', '.rb', '.sh', '.xml', '.yml', '.yaml', '.toml', '.svg', '.gitignore', '.npmrc', '.prettierrc', '.eslintrc', '.babelrc'];
    const textFileNames = ['Dockerfile', 'LICENSE', 'Procfile', 'Jenkinsfile'];
    const ignoredDirs = ['.git/', 'node_modules/', '__pycache__/'];

    const promises: Promise<void>[] = [];
    zip.forEach((_, zipEntry) => {
        const entryName = zipEntry.name.split('/').pop() || '';
        const isTextFileByExt = !zipEntry.dir && textFileExtensions.some(ext => zipEntry.name.toLowerCase().endsWith(ext));
        const isTextFileByName = !zipEntry.dir && textFileNames.includes(entryName);
        const isIgnored = ignoredDirs.some(dir => zipEntry.name.startsWith(dir));

        if ((isTextFileByExt || isTextFileByName) && !isIgnored) {
            const promise = zipEntry.async('string').then(content => {
                fileObjects.push({
                    path: zipEntry.name,
                    content: content,
                });
            }).catch(err => {
                console.warn(`Could not read zipped file ${zipEntry.name} as text, skipping.`, err);
            });
            promises.push(promise);
        }
    });

    await Promise.all(promises);
    return fileObjects;
};

const DENY_LIST_DIRS = ['node_modules', '.git', '.vscode', 'dist', 'build', '__pycache__'];
const DENY_LIST_EXTENSIONS = ['.ds_store', '.zip', '.tar', '.gz', '.rar', '.7z', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.mp3', '.mp4', '.mov', '.avi', '.exe', '.dll', '.so', '.o', '.a', '.class', '.pyc'];

export const processFolderUpload = async (fileList: FileList): Promise<FileObject[]> => {
    const fileObjects: FileObject[] = [];
    const files = Array.from(fileList);

    const promises = files.map(file => {
        const path = (file as any).webkitRelativePath;

        if (!path) {
            console.warn('File without webkitRelativePath, skipping:', file.name);
            return Promise.resolve();
        }

        const isDeniedDir = DENY_LIST_DIRS.some(dir => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`));
        const isDeniedExt = DENY_LIST_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));
        const isHiddenPath = path.split('/').some(part => part.startsWith('.') && part.length > 1 && !['.github', '.circleci'].includes(part));

        if (isDeniedDir || isDeniedExt || isHiddenPath) {
            return Promise.resolve();
        }

        return readFileAsText(file)
            .then(content => {
                fileObjects.push({ path, content });
            })
            .catch(() => {
                console.warn(`Could not read file '${path}' as text, skipping. It might be binary.`);
            });
    });
    
    await Promise.all(promises);
    return fileObjects;
};

export const buildFileTree = (files: FileObject[]): TreeNode[] => {
    const root: TreeNode = { name: 'root', type: 'folder', path: '', children: [] };

    files.forEach(file => {
        let currentNode = root;
        const parts = file.path.split('/').filter(p => p);
        
        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            let childNode = currentNode.children!.find(child => child.name === part && child.type === (isFile ? 'file' : 'folder'));

            if (!childNode) {
                childNode = {
                    name: part,
                    type: isFile ? 'file' : 'folder',
                    path: parts.slice(0, index + 1).join('/'),
                };
                if (isFile) {
                    childNode.content = file.content;
                } else {
                    childNode.children = [];
                }
                currentNode.children!.push(childNode);
            }
            currentNode = childNode;
        });
    });

    const sortTree = (node: TreeNode) => {
        if (node.children) {
            node.children.sort((a, b) => {
                if (a.type === 'folder' && b.type === 'file') return -1;
                if (a.type === 'file' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name);
            });
            node.children.forEach(sortTree);
        }
    };
    
    sortTree(root);
    return root.children || [];
};
