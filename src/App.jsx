import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import TranscriptionPanel from './components/TranscriptionPanel';
import EnhancedTranscriptionPanel from './components/EnhancedTranscriptionPanel';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [useEnhancedPanel, setUseEnhancedPanel] = useState(true);

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
            <>
              <div style={{ 
                marginBottom: '15px', 
                display: 'flex', 
                gap: '10px',
                justifyContent: 'center'
              }}>
                <button
                  className="button"
                  onClick={() => setUseEnhancedPanel(!useEnhancedPanel)}
                  style={{
                    background: useEnhancedPanel ? '#667eea' : '#6c757d',
                    fontSize: '0.9em',
                    padding: '8px 16px'
                  }}
                >
                  {useEnhancedPanel ? 'Using Enhanced Panel' : 'Switch to Enhanced Panel'}
                </button>
              </div>
              
              {useEnhancedPanel ? (
                <EnhancedTranscriptionPanel
                  file={selectedFile}
                  onTranscriptionStart={handleTranscriptionStart}
                  onTranscriptionComplete={handleTranscriptionComplete}
                  isTranscribing={isTranscribing}
                  transcription={transcription}
                />
              ) : (
                <TranscriptionPanel
                  file={selectedFile}
                  onTranscriptionStart={handleTranscriptionStart}
                  onTranscriptionComplete={handleTranscriptionComplete}
                  isTranscribing={isTranscribing}
                  transcription={transcription}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

