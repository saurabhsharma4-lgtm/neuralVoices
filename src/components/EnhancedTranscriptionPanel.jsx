import React, { useState, useEffect } from 'react';
import '../App.css';
import { transcribeAudio } from '../services/transcriptionService';
import { classifyIntents } from '../services/intentClassificationService';

const EnhancedTranscriptionPanel = ({ 
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
  const [diarizedSegments, setDiarizedSegments] = useState(null);
  const [editingSegment, setEditingSegment] = useState(null);
  const [highlightKeywords, setHighlightKeywords] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  // Keywords to highlight
  const keywords = [
    /\b\d{10,}\b/g, // Phone numbers
    /\b\d{15}\b/g, // GST numbers
    /\b[A-Z]{2}[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g, // GST format
    /\b(IndiaMart|IndiaMART|indiamart)\b/gi,
    /\b(OTP|password|account|registration|GST|company)\b/gi,
  ];

  // Highlight keywords in text
  const highlightText = (text) => {
    if (!highlightKeywords || !text) return text;
    
    let highlighted = text;
    keywords.forEach((keyword) => {
      highlighted = highlighted.replace(keyword, (match) => {
        return `<mark style="background: #fff3cd; padding: 2px 4px; border-radius: 3px;">${match}</mark>`;
      });
    });
    
    return highlighted;
  };

  // Parse diarized segments from transcription
  const parseDiarizedSegments = (transcript) => {
    if (!transcript) return null;

    const segments = [];
    const lines = transcript.split('\n').filter(line => line.trim());
    
    let currentSpeaker = null;
    let currentText = '';
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check if line starts with speaker label
      const speakerMatch = trimmed.match(/^(Agent|Seller|Speaker \d+):\s*(.+)$/i);
      
      if (speakerMatch) {
        // Save previous segment if exists
        if (currentSpeaker && currentText) {
          segments.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            start: null,
            end: null
          });
        }
        
        // Extract speaker name (normalize to Agent/Seller)
        const speakerLabel = speakerMatch[1];
        currentSpeaker = speakerLabel.toLowerCase().includes('agent') || speakerLabel.toLowerCase().includes('speaker 1') 
          ? 'Agent' 
          : 'Seller';
        currentText = speakerMatch[2] || '';
      } else if (currentSpeaker) {
        // Continuation of current speaker's text
        currentText += ' ' + trimmed;
      }
    });
    
    // Add last segment
    if (currentSpeaker && currentText) {
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        start: null,
        end: null
      });
    }

    return {
      speakers: new Set(segments.map(s => s.speaker)).size,
      segments: segments
    };
  };

  // Perform LLM-based diarization
  const performLLMDiarization = async (transcript) => {
    try {
      const apiKey = process.env.REACT_APP_LLM_API_KEY;
      const diarizationModel = process.env.REACT_APP_CLEANING_MODEL || 'openai/gpt-4.1-mini';
      const apiUrl = process.env.REACT_APP_LLM_API_URL_CHAT || "https://imllm.intermesh.net/v1/chat/completions";

      const diarizationPrompt = `You are a speaker diarization system for customer service calls.

Given a transcript, identify speakers and separate the conversation into segments.

Rules:
1. Identify the AGENT: The person who starts with "My name is [Name], how may I help you?" or similar greeting is the Agent.
2. All other speakers are SELLER or CUSTOMER (label as "Seller").
3. Separate each speaker turn into segments.
4. Return ONLY valid JSON in this exact format:

{
  "speakers": 2,
  "segments": [
    { "speaker": "Agent", "text": "Hello, how may I help you?", "start": null, "end": null },
    { "speaker": "Seller", "text": "Hi, I have a query.", "start": null, "end": null }
  ]
}

Do NOT include any explanations, markdown, or text outside the JSON.

Transcript:
${transcript}`;

      setProgressMessage('Performing speaker diarization...');
      setProgress(60);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: diarizationModel,
          messages: [
            {
              role: 'system',
              content: 'You are a speaker diarization system. Output ONLY valid JSON arrays with speaker segments. Never include explanations or markdown.'
            },
            {
              role: 'user',
              content: diarizationPrompt
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Diarization API error: ${response.status}`);
      }

      const data = await response.json();
      const resultText = data.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      const cleanedText = resultText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const diarizationResult = JSON.parse(cleanedText);
      return diarizationResult;
    } catch (error) {
      console.error('LLM diarization failed:', error);
      // Fallback to parsing-based diarization
      return parseDiarizedSegments(transcript);
    }
  };

  const handleTranscribe = async () => {
    setError(null);
    setProgress(0);
    setProgressMessage('Starting transcription...');
    onTranscriptionStart();

    try {
      if (!file.file) {
        throw new Error('File not found. Please upload a file first.');
      }

      const audioBlob = file.file;

      // Step 1: Transcription
      setProgressMessage('Transcribing audio...');
      setProgress(20);
      
      let rawResult = null;
      let finalResult = null;
      
      if (enableCleaning) {
        rawResult = await transcribeAudio(audioBlob, file.name, enableDiarization, false);
        setRawTranscription(rawResult);
        setProgress(40);
        
        const { cleanTranscription } = await import('../services/cleaningService');
        setProgressMessage('Cleaning transcription...');
        finalResult = await cleanTranscription(rawResult);
        setProgress(50);
      } else {
        setRawTranscription(null);
        finalResult = await transcribeAudio(audioBlob, file.name, enableDiarization, false);
        setProgress(50);
      }

      // Step 2: LLM Diarization
      if (enableDiarization && finalResult) {
        setProgressMessage('Performing speaker diarization...');
        const diarizationResult = await performLLMDiarization(finalResult);
        setDiarizedSegments(diarizationResult);
        setProgress(70);
      } else {
        // Fallback to parsing-based diarization
        const parsed = parseDiarizedSegments(finalResult);
        setDiarizedSegments(parsed);
        setProgress(70);
      }

      // Step 3: Intent Classification
      if (enableIntentClassification && finalResult) {
        try {
          setProgressMessage('Classifying intents...');
          setProgress(85);
          const classifications = await classifyIntents(finalResult);
          setIntentClassifications(classifications);
        } catch (classificationError) {
          console.error('Intent classification failed:', classificationError);
          setIntentClassifications(null);
        }
      } else {
        setIntentClassifications(null);
      }

      setProgress(100);
      setProgressMessage('Complete!');
      onTranscriptionComplete(finalResult);
      
      // Reset progress after a delay
      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to transcribe audio');
      setProgress(0);
      setProgressMessage('');
      onTranscriptionComplete(null);
    }
  };

  // Update speaker label
  const handleSpeakerEdit = (index, newSpeaker) => {
    if (!diarizedSegments) return;
    
    const updated = { ...diarizedSegments };
    updated.segments[index].speaker = newSpeaker;
    setDiarizedSegments(updated);
    setEditingSegment(null);
  };

  // Download diarized conversation as JSON
  const handleDownloadJSON = () => {
    if (!diarizedSegments) return;
    
    const dataStr = JSON.stringify(diarizedSegments, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diarized-conversation-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSpeakerColor = (speaker) => {
    return speaker === 'Agent' ? '#667eea' : '#48bb78';
  };

  return (
    <div className="card">
      <h2>Enhanced Transcription</h2>
      
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
            Enable Speaker Diarization
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
            Enable Data Cleaning
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
            Enable Intent Classification
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={highlightKeywords}
            onChange={(e) => setHighlightKeywords(e.target.checked)}
            disabled={isTranscribing}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ color: '#666', fontSize: '0.95em' }}>
            Highlight Keywords (phone numbers, GST, etc.)
          </span>
        </label>
      </div>
      
      <button 
        className="button" 
        onClick={handleTranscribe}
        disabled={isTranscribing}
        style={{ width: '100%', marginBottom: '15px' }}
      >
        {isTranscribing ? (
          <>
            <span className="loading-spinner"></span>
            {progressMessage || 'Processing...'}
          </>
        ) : (
          'Start Transcription'
        )}
      </button>

      {/* Progress Bar */}
      {isTranscribing && progress > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: '#e9ecef', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${progress}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          <div style={{ 
            fontSize: '0.85em', 
            color: '#666', 
            marginTop: '5px',
            textAlign: 'center'
          }}>
            {progress}% - {progressMessage}
          </div>
        </div>
      )}

      {error && (
        <div className="status error">
          Error: {error}
        </div>
      )}

      {/* Diarized Conversation Display */}
      {diarizedSegments && diarizedSegments.segments && !isTranscribing && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h3 style={{ color: '#333', margin: 0 }}>
              Diarized Conversation ({diarizedSegments.speakers} speakers)
            </h3>
            <button 
              className="button" 
              onClick={handleDownloadJSON}
              style={{ 
                background: '#48bb78',
                fontSize: '0.9em',
                padding: '8px 16px'
              }}
            >
              Download JSON
            </button>
          </div>

          <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {diarizedSegments.segments.map((segment, index) => (
              <div 
                key={index}
                style={{ 
                  marginBottom: '15px',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  borderLeft: `4px solid ${getSpeakerColor(segment.speaker)}`
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '8px'
                }}>
                  {editingSegment === index ? (
                    <select
                      value={segment.speaker}
                      onChange={(e) => handleSpeakerEdit(index, e.target.value)}
                      onBlur={() => setEditingSegment(null)}
                      autoFocus
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #667eea',
                        fontSize: '0.9em',
                        fontWeight: '600',
                        color: getSpeakerColor(segment.speaker)
                      }}
                    >
                      <option value="Agent">Agent</option>
                      <option value="Seller">Seller</option>
                    </select>
                  ) : (
                    <>
                      <span style={{ 
                        fontWeight: '600', 
                        color: getSpeakerColor(segment.speaker),
                        fontSize: '0.95em',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        background: `${getSpeakerColor(segment.speaker)}20`,
                        borderRadius: '4px'
                      }}
                      onClick={() => setEditingSegment(index)}
                      title="Click to edit speaker"
                      >
                        {segment.speaker}
                      </span>
                      <span style={{ fontSize: '0.8em', color: '#999' }}>
                        Turn {index + 1}
                      </span>
                    </>
                  )}
                </div>
                <div 
                  style={{ 
                    color: '#333',
                    lineHeight: '1.6',
                    fontSize: '0.95em'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: highlightKeywords ? highlightText(segment.text) : segment.text 
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Transcription */}
      {transcription && !isTranscribing && (
        <div className="transcription-result" style={{ marginTop: '20px' }}>
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
        </div>
      )}

      {/* Intent Classifications */}
      {enableIntentClassification && intentClassifications && Array.isArray(intentClassifications) && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Intent Classifications:</h3>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTranscriptionPanel;

