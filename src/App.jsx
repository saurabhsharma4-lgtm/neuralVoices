import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import TranscriptionPanel from './components/TranscriptionPanel';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setTranscription(null);
  };

  const handleTranscriptionComplete = (result) => {
    setTranscription(result);
    setIsTranscribing(false);
  };

  const handleTranscriptionStart = () => {
    setIsTranscribing(true);
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>SOP Generation Agent</h1>
          <p>Upload and transcribe recordings using LLM</p>
        </header>

        <div className="main-content">
          <FileUpload 
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />

          {selectedFile && (
            <TranscriptionPanel
              file={selectedFile}
              onTranscriptionStart={handleTranscriptionStart}
              onTranscriptionComplete={handleTranscriptionComplete}
              isTranscribing={isTranscribing}
              transcription={transcription}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

