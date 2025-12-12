import React, { useState } from 'react';
import '../App.css';
import { transcribeAudio } from '../services/transcriptionService';

const TranscriptionPanel = ({ 
  file, 
  onTranscriptionStart, 
  onTranscriptionComplete, 
  isTranscribing,
  transcription 
}) => {
  const [error, setError] = useState(null);

  const handleTranscribe = async () => {
    setError(null);
    onTranscriptionStart();

    try {
      // Use the uploaded file directly
      if (!file.file) {
        throw new Error('File not found. Please upload a file first.');
      }

      const audioBlob = file.file;

      // Transcribe using LLM service
      const result = await transcribeAudio(audioBlob, file.name);
      onTranscriptionComplete(result);
    } catch (err) {
      setError(err.message || 'Failed to transcribe audio');
      onTranscriptionComplete(null);
    }
  };

  return (
    <div className="card">
      <h2>Transcription</h2>
      
      <button 
        className="button" 
        onClick={handleTranscribe}
        disabled={isTranscribing}
      >
        {isTranscribing ? (
          <>
            <span className="loading-spinner"></span>
            Transcribing...
          </>
        ) : (
          'Start Transcription'
        )}
      </button>

      {error && (
        <div className="status error">
          Error: {error}
        </div>
      )}

      {isTranscribing && (
        <div className="status loading">
          Processing audio file. This may take a few moments...
        </div>
      )}

      {transcription && !isTranscribing && (
        <div className="transcription-result">
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Transcription Result:</h3>
          <pre>{transcription}</pre>
        </div>
      )}
    </div>
  );
};

export default TranscriptionPanel;

