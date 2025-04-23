import React, { useEffect, useState, useRef } from 'react';
import useWebSocket from 'react-use-websocket';

export function Home({ username, fullName }) {
  const WS_URL = `ws://127.0.0.1:53840`;
  const { sendJsonMessage, lastJsonMessage } = useWebSocket(WS_URL, {
    queryParams: { username, fullName },
  });

  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (lastJsonMessage) {
      if (lastJsonMessage.type === "history") {
        const messages = lastJsonMessage.data;
        const lastSevenMessages = messages.slice(-7);
        setChatHistory(lastSevenMessages);
        
        console.log(`Loaded ${lastSevenMessages.length} messages from history`);
      } else {
        setChatHistory(prev => {
          const newHistory = [...prev, lastJsonMessage];
          return newHistory.slice(-7);
        });
      }
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const sendMessage = () => {
    if (message.trim()) {
      sendJsonMessage({ type: 'text', message });
      setMessage('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) { // 5MB limit
      const reader = new FileReader();
      reader.onload = (event) => {
        sendJsonMessage({
          type: 'media',
          message: event.target.result,
          mediaType: file.type
        });
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert('File size should be less than 5MB');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div
        ref={chatContainerRef}
        style={{
          height: '500px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1rem'
        }}
      >
        <div style={{
          textAlign: 'center',
          padding: '0.5rem',
          backgroundColor: '#e9f7ef',
          color: '#28a745',
          borderRadius: '4px',
          marginBottom: '1rem',
          fontSize: '0.9rem'
        }}>
          Showing last {chatHistory.length} messages (max 7)
        </div>
        
        {chatHistory.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666',
            marginTop: '1rem' 
          }}>
            No message history available
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {chatHistory.map((msg, idx) => (
              <li key={idx} style={{
                marginBottom: '1rem',
                padding: '0.5rem',
                backgroundColor: msg.sender === username ? '#e3f2fd' : 'transparent',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === username ? 'flex-end' : 'flex-start'
              }}>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#666',
                  marginBottom: '0.2rem' 
                }}>
                  <strong>{msg.fullName}</strong> ({msg.sender})
                </div>
                <div style={{
                  backgroundColor: msg.sender === username ? '#2196f3' : '#f1f1f1',
                  color: msg.sender === username ? 'white' : 'black',
                  padding: '0.5rem 1rem',
                  borderRadius: '1rem',
                  maxWidth: '80%'
                }}>
                  {msg.type === 'media' ? (
                    msg.mediaType.startsWith('image/') ? (
                      <img 
                        src={msg.message} 
                        alt="Shared content" 
                        style={{
                          maxWidth: '200px',
                          borderRadius: '0.5rem'
                        }} 
                      />
                    ) : msg.mediaType.startsWith('video/') ? (
                      <video 
                        controls 
                        style={{
                          maxWidth: '200px',
                          borderRadius: '0.5rem'
                        }}
                      >
                        <source src={msg.message} type={msg.mediaType} />
                      </video>
                    ) : (
                      <span>Unsupported media type</span>
                    )
                  ) : msg.message}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#666',
                  marginTop: '0.2rem' 
                }}>
                  {new Date(msg.sent_time).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          onClick={sendMessage}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,video/*"
          style={{ display: 'none' }}
        />
        <button 
          onClick={() => fileInputRef.current.click()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Media
        </button>
      </div>
    </div>
  );
}
