# SOP Generation Agent

A React application that allows you to upload recording files from your device and transcribe them using an LLM model.

## Features

- Upload audio/video files from your device
- File validation and size checking (max 500MB)
- Transcribe recordings using LLM API
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
REACT_APP_LLM_API_KEY=your_llm_api_key_here
REACT_APP_LLM_MODEL=whisper-1
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
  │   └── transcriptionService.js # Service for LLM transcription API calls
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
4. Once a file is selected, click **"Start Transcription"**
5. Wait for the transcription to complete
6. View the transcribed text in the result panel

## Notes

- Make sure your LLM API supports audio transcription
- Adjust the API endpoint and request format in `transcriptionService.js` based on your LLM provider
- Files are processed locally before being sent to the transcription API
- No Google Drive or OAuth setup required - just upload files directly!
