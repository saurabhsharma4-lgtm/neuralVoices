import React, { useState } from 'react';
import '../App.css';

const FileUpload = ({ onFileSelect, selectedFile }) => {
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }

    // Validate file type
    const validTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/webm',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
      'video/webm', 'video/ogg'
    ];

    const isValidType = validTypes.some(type => file.type.includes(type.split('/')[1])) || 
                        file.type.startsWith('audio/') || 
                        file.type.startsWith('video/');

    if (!isValidType) {
      setError('Please select a valid audio or video file (mp3, wav, mp4, m4a, etc.)');
      return;
    }

    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (file.size > maxSize) {
      setError('File size exceeds 500MB limit. Please select a smaller file.');
      return;
    }

    setError(null);
    
    onFileSelect({
      id: 'upload-' + Date.now(),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      file: file
    });
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
    setError(null);
    // Reset file input
    const fileInput = document.getElementById('file-upload-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="card">
      <h2>Upload Recording File</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label 
          htmlFor="file-upload-input" 
          className="button" 
          style={{ 
            cursor: 'pointer', 
            display: 'inline-block',
            marginBottom: '10px'
          }}
        >
          {selectedFile ? 'Change File' : 'Choose File'}
          <input
            id="file-upload-input"
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </label>
        
        {selectedFile && (
          <button 
            className="button" 
            onClick={handleRemoveFile}
            style={{ 
              background: '#dc3545',
              marginLeft: '10px'
            }}
          >
            Remove File
          </button>
        )}
      </div>

      {error && (
        <div className="status error">
          {error}
        </div>
      )}

      {selectedFile && (
        <div className="file-info">
          <p><strong>Selected File:</strong> {selectedFile.name}</p>
          <p><strong>Type:</strong> {selectedFile.mimeType || 'Unknown'}</p>
          <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
        </div>
      )}

      {!selectedFile && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          fontSize: '0.9em',
          color: '#666'
        }}>
          <strong>Supported formats:</strong>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Audio: MP3, WAV, M4A, OGG, WebM</li>
            <li>Video: MP4, MOV, AVI, WebM</li>
          </ul>
          <p style={{ marginTop: '10px', marginBottom: 0 }}>
            <strong>Maximum file size:</strong> 500MB
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

