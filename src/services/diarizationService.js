// Speaker Diarization Service
// Processes transcription to identify and label different speakers

const applyDiarization = (transcriptionText) => {
  if (!transcriptionText || typeof transcriptionText !== 'string') {
    return transcriptionText;
  }

  // Split transcription into sentences/phrases
  // Look for patterns that indicate speaker changes
  const sentences = transcriptionText
    .split(/(?<=[.!?])\s+|(?<=\.)\s+/)
    .filter(s => s.trim().length > 0);

  let diarizedText = '';
  let currentSpeaker = null;
  let speakerCount = 0;
  const speakerLabels = ['Agent', 'Seller'];
  
  // Keywords that might indicate speaker changes in conversations
  const speakerChangeIndicators = [
    /^(yes|no|okay|ok|sir|ma'am|hello|hi|hey)/i,
    /^(sorry|excuse me|pardon)/i,
    /^(tell me|can you|please|thank you)/i,
    /^(i am|i'm|my name is)/i,
  ];

  sentences.forEach((sentence, index) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;

    // Detect potential speaker change
    let isNewSpeaker = false;
    
    // Check if sentence starts with speaker change indicators
    if (index === 0) {
      isNewSpeaker = true;
    } else {
      // Check for question-answer patterns
      const prevSentence = sentences[index - 1];
      const hasQuestion = prevSentence.trim().endsWith('?');
      const hasGreeting = /^(hello|hi|hey|yes|no|okay|ok)/i.test(trimmed);
      
      // Check for conversational patterns
      if (hasQuestion || hasGreeting) {
        isNewSpeaker = true;
      }
      
      // Check for speaker change indicators
      for (const pattern of speakerChangeIndicators) {
        if (pattern.test(trimmed)) {
          isNewSpeaker = true;
          break;
        }
      }
    }

    // Assign speaker label
    if (isNewSpeaker && currentSpeaker === null) {
      currentSpeaker = speakerLabels[speakerCount % speakerLabels.length];
      speakerCount++;
    } else if (isNewSpeaker && currentSpeaker !== null) {
      // Switch to next speaker
      speakerCount++;
      currentSpeaker = speakerLabels[speakerCount % speakerLabels.length];
    } else if (currentSpeaker === null) {
      currentSpeaker = speakerLabels[0];
      speakerCount = 1;
    }

    // Format with speaker label
    diarizedText += `${currentSpeaker}: ${trimmed}\n\n`;
  });

  return diarizedText.trim();
};

// Advanced diarization using timestamps (if available from API)
const applyDiarizationWithTimestamps = (transcriptionData) => {
  if (!transcriptionData) return transcriptionData;

  // If API returns segments with timestamps and speaker info
  if (Array.isArray(transcriptionData.segments)) {
    let diarizedText = '';
    let currentSpeaker = null;

    transcriptionData.segments.forEach((segment) => {
      const speaker = segment.speaker || `Speaker ${segment.speaker_label || 'Unknown'}`;
      const text = segment.text || segment.transcript || '';
      const startTime = segment.start ? formatTime(segment.start) : '';
      const endTime = segment.end ? formatTime(segment.end) : '';

      if (speaker !== currentSpeaker) {
        diarizedText += `\n[${startTime} - ${endTime}] ${speaker}:\n`;
        currentSpeaker = speaker;
      }

      diarizedText += `${text} `;
    });

    return diarizedText.trim();
  }

  // Fallback to basic diarization
  if (typeof transcriptionData === 'string') {
    return applyDiarization(transcriptionData);
  }

  return transcriptionData;
};

// Format seconds to MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Smart diarization that analyzes conversation flow
const smartDiarization = (transcriptionText) => {
  if (!transcriptionText || typeof transcriptionText !== 'string') {
    return transcriptionText;
  }

  // Split by sentences and common conversation patterns
  // Split on sentence endings, questions, and common conversational markers
  const segments = transcriptionText
    .split(/(?<=[.!?])\s+|(?<=\.)\s+|(?<=\?)\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (segments.length === 0) {
    return transcriptionText;
  }

  let diarizedText = '';
  let speakerIndex = 0;
  const speakers = ['Agent', 'Seller'];
  let currentSpeaker = speakers[0];
  let lastWasQuestion = false;

  segments.forEach((segment, index) => {
    if (!segment || segment.length < 3) return;

    // Detect speaker changes based on conversation patterns
    const isQuestion = segment.trim().endsWith('?');
    const isDirectResponse = /^(yes|no|okay|ok|sir|ma'am|hello|hi|hey|sorry|excuse me)/i.test(segment);
    const isStatement = /^(i am|i'm|my name is|i have|i will|tell me|can you|please)/i.test(segment);
    const isAcknowledgment = /^(okay|ok|yes|no|alright|got it|understood)/i.test(segment);
    
    // Check for conversational markers that indicate speaker change
    const hasSpeakerMarker = /^(sir|ma'am|hello|hi|hey|sorry|excuse me|tell me|can you|please|thank you)/i.test(segment);
    
    // Alternate speakers for questions and responses
    if (index > 0) {
      // If previous was a question, next speaker is likely different
      if (lastWasQuestion) {
        speakerIndex = (speakerIndex + 1) % speakers.length;
        currentSpeaker = speakers[speakerIndex];
      }
      // If current segment is a direct response or has speaker markers
      else if (isDirectResponse || hasSpeakerMarker) {
        // Check if it's a continuation or new speaker
        const wordCount = segment.split(/\s+/).length;
        // Short responses are likely new speaker
        if (wordCount < 10 || isAcknowledgment) {
          speakerIndex = (speakerIndex + 1) % speakers.length;
          currentSpeaker = speakers[speakerIndex];
        }
      }
      // If current is a question and previous wasn't, likely new speaker
      else if (isQuestion && !lastWasQuestion) {
        speakerIndex = (speakerIndex + 1) % speakers.length;
        currentSpeaker = speakers[speakerIndex];
      }
    }

    // Format with speaker label
    diarizedText += `${currentSpeaker}: ${segment}\n\n`;
    lastWasQuestion = isQuestion;
  });

  return diarizedText.trim();
};

export { applyDiarization, applyDiarizationWithTimestamps, smartDiarization };

