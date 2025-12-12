# SOP Generation Agent

A React application that allows you to upload recording files from your device and transcribe them using an LLM model.

## Features

- Upload audio/video files from your device
- File validation and size checking (max 500MB)
- Transcribe recordings using OpenAI GPT-4o-transcribe
- **Speaker Diarization** - Automatically identify different speakers in conversations
- **Data Cleaning** - Clean transcripts using GPT-4o-mini (remove filler words, fix duplicates, combine broken lines)
- View both raw and cleaned transcriptions
- Modern, responsive UI

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_LLM_API_URL=https://api.openai.com/v1/audio/transcriptions
REACT_APP_LLM_API_KEY=your_openai_api_key_here
REACT_APP_LLM_MODEL=gpt-4o-transcribe
REACT_APP_CLEANING_MODEL=gpt-4o-mini
```

### 3. LLM API Setup

Update the `REACT_APP_LLM_API_URL` and `REACT_APP_LLM_API_KEY` in `.env` with your LLM service credentials.

For OpenAI Whisper API:
- URL: `https://api.openai.com/v1/audio/transcriptions`
- Model: `whisper-1`

For other LLM services, adjust the URL and request format in `src/services/transcriptionService.js`.

### 4. Run the Application

```bash
npm start
```

The app will open at `http://localhost:3000`

## Project Structure

```
src/
  ├── components/
  │   ├── FileUpload.jsx          # Component for uploading files from device
  │   └── TranscriptionPanel.jsx  # Component for transcription functionality
  ├── services/
  │   ├── transcriptionService.js # Service for LLM transcription API calls
  │   ├── diarizationService.js    # Service for speaker diarization
  │   └── cleaningService.js       # Service for transcript cleaning using GPT-4o-mini
  ├── App.jsx                      # Main application component
  ├── App.css                      # Application styles
  ├── index.js                     # Application entry point
  └── index.css                    # Global styles
```

## Usage

1. Click **"Choose File"** to select an audio or video file from your device
2. Supported formats: 
   - Audio: MP3, WAV, M4A, OGG, WebM
   - Video: MP4, MOV, AVI, WebM
3. Maximum file size: 500MB
4. Configure options:
   - **Enable Speaker Diarization**: Automatically identify different speakers (enabled by default)
   - **Enable Data Cleaning**: Clean transcript using GPT-4o-mini (enabled by default)
5. Click **"Start Transcription"**
6. Wait for the transcription to complete
7. View the cleaned transcription in the result panel
8. Click "View Raw Transcription" to see the original transcription before cleaning

## Notes

- Uses OpenAI GPT-4o-transcribe for transcription
- Uses OpenAI GPT-4o-mini for data cleaning
- Speaker diarization uses pattern-based detection (for true speaker identification, consider specialized APIs)
- Data cleaning removes filler words, fixes duplicates, combines broken lines, and preserves speaker labels
- Files are processed locally before being sent to the transcription API
- Both raw and cleaned transcriptions are available for comparison
