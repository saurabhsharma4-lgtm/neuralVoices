// Transcription service using LLM model
// Replace the API endpoint and credentials with your actual LLM service

const transcribeAudio = async (audioBlob, fileName) => {
  try {
    // Validate environment variables
    const apiUrl = process.env.REACT_APP_LLM_API_URL;
    const apiKey = process.env.REACT_APP_LLM_API_KEY;
    const model = process.env.REACT_APP_LLM_MODEL || 'gpt-4o-transcribe';

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
    
    // Handle different response formats
    if (data.text) {
      return data.text;
    } else if (data.transcription) {
      return data.transcription;
    } else if (typeof data === 'string') {
      return data;
    } else {
      // If response is an object, try to extract text or return formatted JSON
      return JSON.stringify(data, null, 2);
    }
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

