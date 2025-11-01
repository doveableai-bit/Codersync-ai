import React, { useState, useCallback, useEffect } from 'react';
import { AppMode, FileObject } from '../types';
import { parseCodeFromText, extractCodeFromImage } from '../services/geminiService';
import { readFileAsText, processZipFile, processFolderUpload } from '../utils/helpers';
import { LoaderIcon, UploadIcon } from './Icons';

interface CodeInputProps {
  mode: AppMode;
  onFilesParsed: (files: FileObject[]) => void;
  clearFiles: () => void;
}

const CodeInput: React.FC<CodeInputProps> = ({ mode, onFilesParsed, clearFiles }) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setText('');
    setSelectedFile(null);
    setError(null);
    clearFiles();
  }, [clearFiles]);

  useEffect(() => {
    resetState();
  }, [mode, resetState]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleParseText = async () => {
    if (!text.trim()) {
      setError("Text area is empty.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const parsedFiles = await parseCodeFromText(text);
      onFilesParsed(parsedFiles.map(f => ({ path: f.filename, content: f.code })));
    } catch (e: any) {
      setError(e.message);
      onFilesParsed([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    setError(null);
    const targetFiles = e.target.files;

    try {
      if (mode === AppMode.SINGLE_FILE) {
        const file = targetFiles?.[0];
        if (!file) return;
        resetState();
        setSelectedFile(file);
        if (file.type.startsWith('image/')) {
          const extractedText = await extractCodeFromImage(file);
          setText(extractedText);
        } else if (file.type.startsWith('text/') || file.type === 'application/json' || !file.name.includes('.')) {
          try {
            const fileContent = await readFileAsText(file);
            setText(fileContent);
          } catch (readError) {
            setError(`Could not read file '${file.name}'. It may be a binary file.`);
          }
        } else {
          setError(`File type '${file.type || 'unknown'}' is not supported. Please use a text file, image, ZIP, or folder.`);
        }
      } else if (mode === AppMode.ZIP) {
        const file = targetFiles?.[0];
        if (!file) return;
        resetState();
        setSelectedFile(file);
        const files = await processZipFile(file);
        if (files.length === 0) {
          setError("No readable text-based files found in the ZIP archive.");
        }
        onFilesParsed(files);
      } else if (mode === AppMode.FOLDER) {
        if (!targetFiles || targetFiles.length === 0) return;
        resetState();
        const files = await processFolderUpload(targetFiles);
        if (files.length === 0) {
          setError("No readable files found in the selected folder. Common build/binary files are ignored.");
        }
        onFilesParsed(files);
      }
    } catch (err: any) {
      setError(err.message);
      onFilesParsed([]);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };


  const renderParagraphInput = () => (
    <>
      <textarea
        value={text}
        onChange={handleTextChange}
        placeholder="Paste paragraphs containing multiple code blocks here... The AI will automatically detect and separate them."
        className="w-full flex-grow bg-gray-800 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow resize-none"
      />
      <div className="flex space-x-2">
        <button
          onClick={handleParseText}
          disabled={isLoading}
          className="flex-grow inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? <LoaderIcon className="animate-spin h-5 w-5 mr-2" /> : null}
          {isLoading ? 'Parsing...' : 'Analyze & Separate Code'}
        </button>
        <button 
            onClick={resetState}
            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
        >Clear</button>
      </div>
    </>
  );

  const renderFileInput = ({ isZip = false, isFolder = false }) => {
    const accept = isZip ? '.zip' : (isFolder ? '' : 'text/*,image/*');
    const title = isFolder ? "Upload a Project Folder" : (isZip ? "Upload a ZIP Archive" : "Upload a Document or Image");
    const description = isFolder
      ? "Select a project folder. Its file structure will be preserved. Common binary/build folders are ignored."
      : (isZip
        ? "Select a ZIP file. Text-based files within it will be automatically extracted and listed."
        : "Select a text file or an image containing code. Its contents will be loaded into the text area below.");
    const inputProps: any = isFolder ? { webkitdirectory: "", directory: "" } : {};

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg">
                <label htmlFor="file-upload" className="w-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800/50 p-4 rounded-lg transition-colors">
                    <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
                    <span className="text-md font-semibold text-white">
                        {selectedFile && !isFolder ? selectedFile.name : title}
                    </span>
                    <p className="text-xs text-gray-400 text-center mt-1">{description}</p>
                    <input id="file-upload" type="file" className="hidden" accept={accept} onChange={handleFileChange} {...inputProps} />
                </label>
                {isLoading && (
                    <div className="flex items-center text-blue-300 mt-4">
                        <LoaderIcon className="animate-spin h-5 w-5 mr-2" />
                        <span>Processing files...</span>
                    </div>
                )}
            </div>

            {mode === AppMode.SINGLE_FILE && (
                <div className="flex flex-col flex-grow mt-4 space-y-4">
                    <textarea
                        value={text}
                        onChange={handleTextChange}
                        placeholder="File content will appear here after upload. You can edit it before analyzing."
                        className="w-full flex-grow bg-gray-800 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow resize-none"
                    />
                    <div className="flex space-x-2">
                        <button
                            onClick={handleParseText}
                            disabled={isLoading || !text}
                            className="flex-grow inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading && text ? <LoaderIcon className="animate-spin h-5 w-5 mr-2" /> : 'Analyze & Separate Code'}
                        </button>
                         <button 
                            onClick={resetState}
                            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
                        >Clear</button>
                    </div>
                </div>
            )}
        </div>
    );
  };
  
  const renderContent = () => {
    switch(mode) {
      case AppMode.PARAGRAPH:
        return renderParagraphInput();
      case AppMode.SINGLE_FILE:
        return renderFileInput({});
      case AppMode.ZIP:
        return renderFileInput({ isZip: true });
      case AppMode.FOLDER:
        return renderFileInput({ isFolder: true });
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">Input Source</h2>
      {error && <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-md text-sm">{error}</div>}
      
      {renderContent()}
    </div>
  );
};

export default CodeInput;