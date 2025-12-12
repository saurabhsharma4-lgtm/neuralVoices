// Transcription service using LLM model
// Replace the API endpoint and credentials with your actual LLM service

const transcribeAudio = async (audioBlob, fileName, enableDiarization = false, enableCleaning = false) => {
  try {
    // Validate environment variables
    const apiUrl = process.env.REACT_APP_LLM_API_URL;
    const apiKey = process.env.REACT_APP_LLM_API_KEY;
    const model = process.env.REACT_APP_LLM_MODEL || 'openai/gpt-4o-transcribe';

    if (!apiUrl || !apiKey) {
      throw new Error('Missing API credentials. Please check your .env file.');
    }

    // Use FormData for multipart/form-data upload (OpenAI transcription API format)
    // This matches: curl -F file="@audio.mp3" -F model="gpt-4o-transcribe"
    const formData = new FormData();
    formData.append('file', audioBlob, fileName);
    formData.append('model', model);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // Don't set Content-Type for FormData - browser will set it automatically with boundary
        // This matches: -H "Content-Type: multipart/form-data"
      },
      body: formData  // FormData automatically sets multipart/form-data
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `API error: ${response.status}` };
      }
      
      throw new Error(errorData.error?.message || errorData.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract transcription text
    let transcriptionText = '';
    if (data.text) {
      transcriptionText = data.text;
    } else if (data.transcription) {
      transcriptionText = data.transcription;
    } else if (typeof data === 'string') {
      transcriptionText = data;
    } else if (data.segments) {
      // If API returns segments, use them for better diarization
      transcriptionText = data;
    } else {
      // If response is an object, try to extract text or return formatted JSON
      transcriptionText = JSON.stringify(data, null, 2);
    }

    // Apply diarization if enabled
    let finalText = transcriptionText;
    if (enableDiarization) {
      const { applyDiarizationWithTimestamps, smartDiarization } = await import('./diarizationService');
      
      // If data has segments with speaker info, use advanced diarization
      if (data.segments && Array.isArray(data.segments)) {
        finalText = applyDiarizationWithTimestamps(data);
      }
      // Otherwise use smart diarization on text
      else if (typeof transcriptionText === 'string') {
        finalText = smartDiarization(transcriptionText);
      }
    }

    // Apply cleaning if enabled
    if (enableCleaning && typeof finalText === 'string' && finalText.trim().length > 0) {
      const { cleanTranscription } = await import('./cleaningService');
      try {
        finalText = await cleanTranscription(finalText);
      } catch (cleaningError) {
        // If cleaning fails, return the text without cleaning
        console.error('Cleaning failed, returning uncleaned text:', cleaningError);
        // Don't throw - just return the text without cleaning
      }
    }
    
    return finalText;
  } catch (error) {
    throw error;
  }
};

// Alternative: If you need to convert audio to base64 first
const transcribeAudioBase64 = async (audioBlob, fileName) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result.split(',')[1]; // Remove data:audio/...;base64, prefix
      
      try {
        const response = await fetch(process.env.REACT_APP_LLM_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_LLM_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.REACT_APP_LLM_MODEL || 'whisper-1',
            audio: base64Audio,
            format: 'text'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        resolve(data.text || data.transcription || JSON.stringify(data, null, 2));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
};

export { transcribeAudio, transcribeAudioBase64 };

