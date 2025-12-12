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
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [enableCleaning, setEnableCleaning] = useState(true);
  const [enableIntentClassification, setEnableIntentClassification] = useState(true);
  const [rawTranscription, setRawTranscription] = useState(null);
  const [intentClassifications, setIntentClassifications] = useState(null);

  const handleTranscribe = async () => {
    setError(null);
    onTranscriptionStart();

    try {
      // Use the uploaded file directly
      if (!file.file) {
        throw new Error('File not found. Please upload a file first.');
      }

      const audioBlob = file.file;

      // Get transcription (with diarization but without cleaning first if cleaning is enabled)
      let rawResult = null;
      let finalResult = null;
      
      if (enableCleaning) {
        // Get raw transcription first to show comparison
        rawResult = await transcribeAudio(audioBlob, file.name, enableDiarization, false);
        setRawTranscription(rawResult);
        
        // Then clean it
        const { cleanTranscription } = await import('../services/cleaningService');
        finalResult = await cleanTranscription(rawResult);
      } else {
        setRawTranscription(null);
        finalResult = await transcribeAudio(audioBlob, file.name, enableDiarization, false);
      }
      
      // Perform intent classification if enabled
      if (enableIntentClassification && finalResult) {
        try {
          const { classifyIntents } = await import('../services/intentClassificationService');
          const classifications = await classifyIntents(finalResult);
          setIntentClassifications(classifications);
        } catch (classificationError) {
          console.error('Intent classification failed:', classificationError);
          setIntentClassifications(null);
          // Don't fail the whole process if classification fails
        }
      } else {
        setIntentClassifications(null);
      }
      
      onTranscriptionComplete(finalResult);
    } catch (err) {
      setError(err.message || 'Failed to transcribe audio');
      onTranscriptionComplete(null);
    }
  };

  return (
    <div className="card">
      <h2>Transcription</h2>
      
      <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enableDiarization}
            onChange={(e) => setEnableDiarization(e.target.checked)}
            disabled={isTranscribing}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ color: '#666', fontSize: '0.95em' }}>
            Enable Speaker Diarization (identify different speakers)
          </span>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enableCleaning}
            onChange={(e) => setEnableCleaning(e.target.checked)}
            disabled={isTranscribing}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ color: '#666', fontSize: '0.95em' }}>
            Enable Data Cleaning (remove filler words, fix duplicates using GPT-4o-mini)
          </span>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enableIntentClassification}
            onChange={(e) => setEnableIntentClassification(e.target.checked)}
            disabled={isTranscribing}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ color: '#666', fontSize: '0.95em' }}>
            Enable Intent Classification (classify intents for each turn)
          </span>
        </label>
      </div>
      
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
          {enableCleaning && rawTranscription 
            ? (enableIntentClassification ? 'Cleaning and classifying intents...' : 'Cleaning transcription with GPT-4o-mini...')
            : (enableIntentClassification ? 'Classifying intents...' : 'Processing audio file. This may take a few moments...')}
        </div>
      )}

      {transcription && !isTranscribing && (
        <div className="transcription-result">
          <h3 style={{ marginBottom: '15px', color: '#333' }}>
            {enableCleaning ? 'Cleaned Transcription:' : 'Transcription Result:'}
          </h3>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordWrap: 'break-word',
            fontFamily: 'inherit',
            lineHeight: '1.6',
            color: '#333'
          }}>{transcription}</pre>
          
          {enableCleaning && rawTranscription && (
            <details style={{ marginTop: '20px' }}>
              <summary style={{ 
                cursor: 'pointer', 
                color: '#667eea', 
                fontWeight: '500',
                marginBottom: '10px'
              }}>
                View Raw Transcription (Before Cleaning)
              </summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                wordWrap: 'break-word',
                fontFamily: 'inherit',
                lineHeight: '1.6',
                color: '#666',
                background: '#f5f5f5',
                padding: '15px',
                borderRadius: '5px',
                marginTop: '10px',
                fontSize: '0.9em'
              }}>{rawTranscription}</pre>
            </details>
          )}
          
          {enableIntentClassification && intentClassifications && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>Intent Classifications:</h3>
              <div style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '8px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {Array.isArray(intentClassifications) ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                      <tr style={{ background: '#e9ecef', borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Speaker</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Utterance</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Intent</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intentClassifications.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '10px', textTransform: 'capitalize', fontWeight: '500' }}>
                            {item.speaker || 'unknown'}
                          </td>
                          <td style={{ padding: '10px', maxWidth: '300px', wordWrap: 'break-word' }}>
                            {item.utterance || '-'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              background: '#667eea', 
                              color: 'white', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontSize: '0.85em'
                            }}>
                              {item.intent || 'other'}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            {item.confidence !== undefined 
                              ? (item.confidence * 100).toFixed(0) + '%' 
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordWrap: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: '0.85em'
                  }}>{JSON.stringify(intentClassifications, null, 2)}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptionPanel;

