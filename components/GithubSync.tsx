import React from 'react';
import { syncToGithub } from '../services/githubService';
import type { FileObject, SyncStatus, GithubUser } from '../types';
import { GithubIcon, LoaderIcon, CheckCircleIcon, AlertTriangleIcon } from './Icons';

interface GithubSyncProps {
  files: FileObject[];
  token: string | null;
  repoName: string;
  status: SyncStatus;
  user: GithubUser | null;
  isAuthenticating: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  setRepoName: (repo: string) => void;
  setStatus: (status: SyncStatus) => void;
}

const GithubSync: React.FC<GithubSyncProps> = ({ 
  files, token, repoName, status, user, isAuthenticating, 
  onConnect, onDisconnect, setRepoName, setStatus 
}) => {
  
  const handleSync = async () => {
    if (!token || !repoName || files.length === 0 || !user) {
      setStatus({ state: 'error', message: 'Authentication, repository name, and at least one file are required.' });
      return;
    }
    setStatus({ state: 'loading', message: 'Syncing files to GitHub...' });

    try {
      const repoUrl = await syncToGithub(token, user.login, repoName, files);
      setStatus({ state: 'success', message: 'Successfully synced to GitHub!', url: repoUrl });
    } catch (e: any) {
      setStatus({ state: 'error', message: `Sync failed: ${e.message}` });
    }
  };

  const renderStatus = () => {
    if (status.state === 'idle') return null;
    
    let icon;
    let colorClasses;

    switch(status.state) {
        case 'loading':
            icon = <LoaderIcon className="animate-spin h-5 w-5 mr-3" />;
            colorClasses = "bg-blue-900/50 text-blue-300";
            break;
        case 'success':
            icon = <CheckCircleIcon className="h-5 w-5 mr-3" />;
            colorClasses = "bg-green-900/50 text-green-300";
            break;
        case 'error':
            icon = <AlertTriangleIcon className="h-5 w-5 mr-3" />;
            colorClasses = "bg-red-900/50 text-red-300";
            break;
    }

    return (
        <div className={`p-4 rounded-md flex items-center text-sm ${colorClasses}`}>
            {icon}
            <div>
                <p>{status.message}</p>
                {status.url && (
                    <a href={status.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-white transition-colors">
                        View Repository
                    </a>
                )}
            </div>
        </div>
    );
  }
  
  const renderAuthSection = () => {
    if (isAuthenticating) {
      return (
        <div className="flex items-center justify-center p-4 bg-gray-800 rounded-md">
          <LoaderIcon className="animate-spin h-5 w-5 mr-3 text-gray-300" />
          <span className="text-gray-300">Authenticating...</span>
        </div>
      );
    }

    if (user && token) {
      return (
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-md">
          <div className="flex items-center space-x-3">
            <img src={user.avatar_url} alt="GitHub Avatar" className="h-10 w-10 rounded-full" />
            <div>
              <p className="font-semibold text-white">{user.name || user.login}</p>
              <p className="text-sm text-gray-400">Connected to GitHub</p>
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="px-3 py-1 text-sm bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center space-y-2">
        <button
          onClick={onConnect}
          className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 transition-colors"
        >
          <GithubIcon className="h-5 w-5 mr-2" />
          Connect with GitHub
        </button>
        <p className="text-xs text-gray-500">You'll be redirected to GitHub to authorize this app.</p>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">GitHub Sync</h2>
      
      {renderAuthSection()}

      <div className="p-3 bg-yellow-900/50 border border-yellow-700 text-yellow-200 text-xs rounded-md">
        <strong>Security Warning:</strong> This app will request <code>repo</code> scope access. In a real app, the token exchange would happen on a server, not in the browser. Disconnect the app from your GitHub account settings when you're done.
      </div>

      <div>
        <label htmlFor="repo-name" className="block text-sm font-medium text-gray-300 mb-1">
          Repository Name
        </label>
        <input
          id="repo-name"
          type="text"
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
          placeholder="my-new-project"
          disabled={!token}
          className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow disabled:bg-gray-800/50 disabled:cursor-not-allowed"
        />
      </div>
      
      {renderStatus()}

      <button
        onClick={handleSync}
        disabled={files.length === 0 || !token || !repoName || status.state === 'loading'}
        className="w-full inline-flex items-center justify-center px-4 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        <GithubIcon className="h-5 w-5 mr-2" />
        {status.state === 'loading' ? 'Syncing...' : `Sync ${files.length} Files to GitHub`}
      </button>
    </div>
  );
};

export default GithubSync;
