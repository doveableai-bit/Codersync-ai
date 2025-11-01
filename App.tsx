
import React, { useState, useCallback, useEffect } from 'react';
import { AppMode, FileObject, SyncStatus, GithubUser } from './types';
import Header from './components/Header';
import CodeInput from './components/CodeInput';
import FilePreview from './components/FilePreview';
import GithubSync from './components/GithubSync';
import { exchangeCodeForToken, getGithubUser } from './services/githubService';

const GITHUB_CLIENT_ID = 'Ov23li1FK2tzlEDmFyWE';
const GITHUB_TOKEN_KEY = 'github_access_token';


function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.PARAGRAPH);
  const [files, setFiles] = useState<FileObject[]>([]);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [repoName, setRepoName] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle', message: '' });
  
  const handleAuth = useCallback(async (token: string) => {
    try {
      setSyncStatus({ state: 'idle', message: '' });
      setIsAuthenticating(true);
      const user = await getGithubUser(token);
      setGithubToken(token);
      setGithubUser(user);
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
    } catch (error: any) {
      console.error('Authentication error:', error);
      setSyncStatus({ state: 'error', message: `Authentication failed: ${error.message}` });
      handleDisconnect();
    } finally {
      setIsAuthenticating(false);
    }
  }, []);
  
  const handleDisconnect = useCallback(() => {
    setGithubToken(null);
    setGithubUser(null);
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    setSyncStatus({ state: 'idle', message: '' });
  }, []);

  // Effect to handle OAuth callback from GitHub
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      setIsAuthenticating(true);
      setSyncStatus({state: 'loading', message: 'Authenticating with GitHub...'});
      exchangeCodeForToken(code)
        .then(token => {
          handleAuth(token);
          // Clean the URL by removing the code parameter
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        })
        .catch(error => {
          console.error('Token exchange error:', error);
          setSyncStatus({ state: 'error', message: `GitHub login failed: ${error.message}` });
          setIsAuthenticating(false);
          // Clean the URL by removing the code parameter
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        });
    }
  }, [handleAuth]);

  // Effect to check for a stored token on initial app load
  useEffect(() => {
    const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY);
    const urlParams = new URLSearchParams(window.location.search);
    if (storedToken && !urlParams.has('code')) {
      handleAuth(storedToken);
    } else {
      setIsAuthenticating(false);
    }
  }, [handleAuth]);


  const handleFilesParsed = useCallback((parsedFiles: FileObject[]) => {
    setFiles(parsedFiles);
    setSyncStatus({ state: 'idle', message: '' });
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setSyncStatus({ state: 'idle', message: '' });
  }, []);

  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
    clearAll();
  }, [clearAll]);
  
  const handleConnect = () => {
    // For a Single Page Application, the redirect URI should point back to the main app page (the root).
    // The app will then handle the 'code' query parameter from the URL upon redirection.
    // IMPORTANT: You must update your GitHub OAuth App's "Authorization callback URL" to match this.
    // Set it to your application's homepage URL (e.g., https://codersync-ai.vercel.app/).
    const redirectUri = window.location.origin;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
    window.location.href = githubAuthUrl;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header currentMode={mode} onModeChange={handleModeChange} />
      <main className="flex-grow container mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col space-y-4">
          <div className="flex-grow">
            <CodeInput mode={mode} onFilesParsed={handleFilesParsed} clearFiles={clearAll} />
          </div>
          <div>
            <GithubSync 
                files={files}
                token={githubToken}
                repoName={repoName}
                status={syncStatus}
                user={githubUser}
                isAuthenticating={isAuthenticating}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                setRepoName={setRepoName}
                setStatus={setSyncStatus}
            />
          </div>
        </div>
        <div className="md:h-[calc(100vh-100px)]">
          <FilePreview files={files} />
        </div>
      </main>
    </div>
  );
}

export default App;
