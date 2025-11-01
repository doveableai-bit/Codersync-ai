import type { FileObject, GithubUser } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

// WARNING: Storing Client ID and Secret on the frontend is insecure and should only be done for demonstration purposes.
// In a production application, the token exchange should happen on a backend server.
const GITHUB_CLIENT_ID = 'Ov23li1FK2tzlEDmFyWE';
const GITHUB_CLIENT_SECRET = 'c80c89733079c6f765935bcef3c99e5a344bf637'; // IMPORTANT: This secret is compromised. Generate a new one on GitHub.

// A proxy is needed to bypass CORS restrictions when making the token request from the browser.
// This is for demo purposes. In production, use a secure backend.
const CORS_PROXY = 'https://cors.sh/';

interface GithubFile {
    path: string;
    mode: '100644';
    type: 'blob';
    sha: string | null;
}

const createHeaders = (token: string) => ({
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
});

// Helper to handle API errors
const handleApiError = async (response: Response, action: string) => {
    if (!response.ok) {
        try {
            const error = await response.json();
            throw new Error(`Failed to ${action}: ${error.message} (Status: ${response.status})`);
        } catch (e: any) {
             // If parsing JSON fails or it's not a JSON error
            if (e instanceof Error && e.message.startsWith('Failed to')) throw e;
            throw new Error(`Failed to ${action}: ${response.statusText} (Status: ${response.status})`);
        }
    }
};

export const exchangeCodeForToken = async (code: string): Promise<string> => {
    const url = `${CORS_PROXY}${GITHUB_OAUTH_URL}/access_token`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // API key for the demo CORS proxy
            'x-cors-api-key': 'temp_1a2c3b4d5e6f7a8b9c0d1e2f3a4b5c6d'
        },
        body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: code,
        }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let message = `GitHub token exchange failed with status ${res.status}.`;
        if (errorData.error_description) {
            message += ` Error: ${errorData.error_description}.`;
        }
        if (res.status >= 400 && res.status < 500) {
            message += ' This often means the Client Secret has been revoked by GitHub for security reasons, or there is an issue with the CORS proxy. Please generate a new secret in your GitHub App settings.'
        }
        throw new Error(message);
    }

    const data = await res.json();
    if (data.error || !data.access_token) {
        throw new Error(`Failed to get access token: ${data.error_description || 'Unknown error'}`);
    }
    
    return data.access_token;
};

export const getGithubUser = async (token: string): Promise<GithubUser> => {
    const res = await fetch(`${GITHUB_API_BASE}/user`, { headers: createHeaders(token) });
    await handleApiError(res, "get user information");
    return res.json();
};

// Step 2: Check if repo exists, if not create it
const ensureRepoExists = async (token: string, owner: string, repo: string) => {
    const repoUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
    const repoRes = await fetch(repoUrl, { headers: createHeaders(token) });
    if (repoRes.ok) return; // Repo exists

    if (repoRes.status !== 404) {
        await handleApiError(repoRes, "check repository existence");
    }

    const createUrl = `${GITHUB_API_BASE}/user/repos`;
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: createHeaders(token),
        body: JSON.stringify({ name: repo, description: 'Repository created by CodeSyncer AI' }),
    });
    await handleApiError(createRes, "create repository");
};

// Step 3 & 4: Get latest commit and base tree SHA
const getLatestCommitInfo = async (token: string, owner: string, repo: string) => {
    try {
        const repoInfoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers: createHeaders(token) });
        await handleApiError(repoInfoRes, "get repository info");
        const repoInfo = await repoInfoRes.json();
        const defaultBranch = repoInfo.default_branch || 'main';

        const refRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers: createHeaders(token) });
        if (!refRes.ok) {
            // This is expected for a new, empty repository.
            if (refRes.status === 404) {
                 return { latestCommitSha: null, baseTreeSha: null, defaultBranch };
            }
            await handleApiError(refRes, "get branch reference");
        }
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;
        
        const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers: createHeaders(token) });
        await handleApiError(commitRes, "get latest commit");
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;
        
        return { latestCommitSha, baseTreeSha, defaultBranch };
    } catch(e) {
        if (e instanceof Error) throw e;
        // This likely means it's a new, empty repo
        return { latestCommitSha: null, baseTreeSha: null, defaultBranch: 'main' };
    }
};

// Step 5: Create blobs for each file
const createBlobs = async (token: string, owner: string, repo: string, files: FileObject[]) => {
    const blobPromises = files.map(async (file) => {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            headers: createHeaders(token),
            body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
        });
        await handleApiError(res, `create blob for ${file.path}`);
        return res.json();
    });
    return Promise.all(blobPromises);
};

// Step 6: Create a new tree
const createTree = async (token: string, owner: string, repo: string, baseTreeSha: string | null, files: GithubFile[]) => {
    const body: { tree: GithubFile[], base_tree?: string } = { tree: files };
    if (baseTreeSha) {
        body.base_tree = baseTreeSha;
    }
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        headers: createHeaders(token),
        body: JSON.stringify(body),
    });
    await handleApiError(res, "create file tree");
    return res.json();
};

// Step 7: Create a new commit
const createCommit = async (token: string, owner: string, repo: string, treeSha: string, parentCommitSha: string | null, message: string) => {
    const body: { message: string, tree: string, parents?: string[] } = { message, tree: treeSha };
    if (parentCommitSha) {
        body.parents = [parentCommitSha];
    }
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        headers: createHeaders(token),
        body: JSON.stringify(body),
    });
    await handleApiError(res, "create commit");
    return res.json();
};

// Step 8: Update the branch reference
const updateRef = async (token: string, owner: string, repo: string, branch: string, commitSha: string) => {
    try {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers: createHeaders(token),
            body: JSON.stringify({ sha: commitSha }),
        });
        if (!res.ok) throw new Error("Branch update failed, attempting to create new branch.");
        return res.json();
    } catch(e) {
         // If PATCH fails, it might be a new repo, so try creating the ref
         const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: createHeaders(token),
            body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitSha }),
        });
        await handleApiError(res, "create branch reference");
        return res.json();
    }
};

export const syncToGithub = async (token: string, owner: string, repoName: string, files: FileObject[]): Promise<string> => {
    await ensureRepoExists(token, owner, repoName);

    const { latestCommitSha, baseTreeSha, defaultBranch } = await getLatestCommitInfo(token, owner, repoName);
    
    const blobs = await createBlobs(token, owner, repoName, files);
    
    const treeFiles: GithubFile[] = files.map((file, index) => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobs[index].sha,
    }));
    
    const newTree = await createTree(token, owner, repoName, baseTreeSha, treeFiles);
    
    const commitMessage = `Sync ${files.length} files via CodeSyncer AI`;
    const newCommit = await createCommit(token, owner, repoName, newTree.sha, latestCommitSha, commitMessage);
    
    if (!newCommit.sha) {
        throw new Error("Failed to create commit: GitHub API did not return a commit SHA.");
    }
    
    await updateRef(token, owner, repoName, defaultBranch, newCommit.sha);

    return `https://github.com/${owner}/${repoName}`;
};