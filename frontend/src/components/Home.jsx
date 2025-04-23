// Home.jsx
import React, { useEffect, useState, useRef } from 'react';
import useWebSocket from 'react-use-websocket';

export function Home({ username, fullName, onLogout }) {
  const WS_URL = `ws://127.0.0.1:53840`;
  const { sendJsonMessage, lastJsonMessage } = useWebSocket(WS_URL, {
    queryParams: { username, fullName },
  });

  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const chunksRef = useRef([]);

  // Effect to update time every second
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(timerId);
  }, []);

  // Process incoming messages
  useEffect(() => {
    if (lastJsonMessage) {
      const { type } = lastJsonMessage;
      if (type === 'history') {
        const messages = lastJsonMessage.data.map(m => ({
          ...m,
          reactions: m.reactions || {}
        }));
        setChatHistory(messages.slice(-7));
      } else if (type === 'reaction') {
        const { messageId, reaction } = lastJsonMessage;
        setChatHistory(prev => prev.map(msg => {
          const id = msg._id || msg.sent_time;
          if (id === messageId) {
            const updated = { ...msg.reactions };
            updated[reaction] = (updated[reaction] || 0) + 1;
            return { ...msg, reactions: updated };
          }
          return msg;
        }));
      } else {
        // text, media, file, voice
        setChatHistory(prev => {
          const newMsg = { ...lastJsonMessage, reactions: lastJsonMessage.reactions || {} };
          return [...prev, newMsg].slice(-7);
        });
      }
    }
  }, [lastJsonMessage]);

  // Scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Send text message
  const sendMessage = () => {
    if (message.trim()) {
      sendJsonMessage({ type: 'text', message });
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Upload files
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64Data = evt.target.result;
      const isImageOrVideo =
        file.type.startsWith('image/') || file.type.startsWith('video/');
      if (isImageOrVideo) {
        // Treat as media
        sendJsonMessage({
          type: 'media',
          message: base64Data,
          mediaType: file.type
        });
      } else {
        // Treat as generic file
        sendJsonMessage({
          type: 'file',
          fileName: file.name,
          fileData: base64Data,
          mimeType: file.type
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Reactions
  const handleReaction = (msg, reactionType) => {
    const messageId = msg._id || msg.sent_time;
    sendJsonMessage({
      type: 'reaction',
      messageId,
      reaction: reactionType
    });
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      const mediaRecorder = new MediaRecorder(stream);
      setRecorder(mediaRecorder);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          sendJsonMessage({
            type: 'voice',
            audioData: reader.result,
            mediaType: 'audio/webm'
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopRecording();
        }
      }, 60_000); // stop after 60s
    } catch (err) {
      console.error(err);
      alert('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    setIsRecording(false);
  };

  const handleRecordClick = () => {
    isRecording ? stopRecording() : startRecording();
  };

  return (
    <div 
      className="home-container"
      style={{
        width: '100%', // Make container take full width
        height: '100%', // Make container take full height
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header className="home-header">
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          {currentTime.toLocaleTimeString()}
        </span>
        <button onClick={onLogout}>Logout</button>
      </header>

      <div className="chat-area" ref={chatContainerRef}>
        {chatHistory.map((msg, idx) => {
          const isSelf = (msg.sender === username);
          return (
            <div
              key={idx}
              className={`chat-message ${isSelf ? 'self' : ''}`}
            >
              <div className="chat-meta">
                {msg.avatarUrl && (
                  <img
                    src={msg.avatarUrl}
                    alt="avatar"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#eee',
                      marginRight: '8px',
                      verticalAlign: 'middle'
                    }}
                  />
                )}
                <strong>{msg.sender}</strong>
              </div>

              {/* Render different message types with increased font size */}
              <div style={{ fontSize: '1.1rem' }}>
                {msg.type === 'text' && <div>{msg.message}</div>}

                {msg.type === 'media' && msg.mediaType && (
                  <div>
                    {msg.mediaType.startsWith('image/') ? (
                      <img src={msg.message} alt="img" style={{ maxWidth: '200px' }} />
                    ) : msg.mediaType.startsWith('video/') ? (
                      <video controls style={{ maxWidth: '200px' }}>
                        <source src={msg.message} type={msg.mediaType} />
                      </video>
                    ) : (
                      <span>Unsupported media type</span>
                    )}
                  </div>
                )}

                {msg.type === 'file' && msg.fileName && msg.fileData && (
                  <div>
                    <a href={msg.fileData} download={msg.fileName}>
                      {msg.fileName}
                    </a>
                  </div>
                )}

                {msg.type === 'voice' && msg.audioData && (
                  <audio controls style={{ maxWidth: '250px' }}>
                    <source src={msg.audioData} type="audio/webm" />
                  </audio>
                )}
              </div>

              <div className="chat-meta-time">
                {new Date(msg.sent_time).toLocaleString()}
              </div>

              {/* Reaction buttons */}
              <div className="reactions">
                <button onClick={() => handleReaction(msg, 'thumbs_up')}>
                  👍 {msg.reactions.thumbs_up || 0}
                </button>
                <button onClick={() => handleReaction(msg, 'heart')}>
                  ❤️ {msg.reactions.heart || 0}
                </button>
                <button onClick={() => handleReaction(msg, 'lol')}>
                  😂 {msg.reactions.lol || 0}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recording indicator + text input + file upload */}
      <div className="chat-input">
        {isRecording && <div className="record-dot"></div>}
        <button onClick={handleRecordClick}>
          {isRecording ? 'Stop Recording' : 'Record Voice'}
        </button>
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message"
        />
        <button onClick={sendMessage}>Send</button>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          accept="*/*"
        />
        <button onClick={() => fileInputRef.current.click()}>Upload File</button>
      </div>
    </div>
  );
}
