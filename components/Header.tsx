import React from 'react';
import { GithubIcon, FileIcon, ZipIcon, DocumentTextIcon, FolderIcon } from './Icons';
import { AppMode } from '../types';

interface HeaderProps {
    currentMode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = ({ currentMode, onModeChange }) => {
    const navItems = [
        { mode: AppMode.PARAGRAPH, label: 'Text Input', icon: <DocumentTextIcon className="h-5 w-5 mr-2" /> },
        { mode: AppMode.SINGLE_FILE, label: 'Upload File', icon: <FileIcon className="h-5 w-5 mr-2" /> },
        { mode: AppMode.ZIP, label: 'Upload ZIP', icon: <ZipIcon className="h-5 w-5 mr-2" /> },
        { mode: AppMode.FOLDER, label: 'Upload Folder', icon: <FolderIcon className="h-5 w-5 mr-2" /> },
    ];

    return (
        <header className="bg-gray-900 border-b border-gray-700 p-4">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <GithubIcon className="h-8 w-8 text-blue-400" />
                    <h1 className="text-xl font-bold text-white">CodeSyncer AI</h1>
                </div>
                <nav className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
                    {navItems.map(item => (
                        <button
                            key={item.mode}
                            onClick={() => onModeChange(item.mode)}
                            aria-current={currentMode === item.mode ? 'page' : undefined}
                            className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                currentMode === item.mode
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
};

export default Header;