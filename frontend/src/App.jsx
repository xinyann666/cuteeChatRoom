// App.jsx
import { useState } from 'react';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Home } from './components/Home';
import './App.css';

function App() {
  // user object is null if no one is logged in, or an object with user details when logged in
  const [user, setUser] = useState(null);
  // authMode controls which form to show ("login" or "register")
  const [authMode, setAuthMode] = useState('login');
  // Global error message to be set from Login or Register failures
  const [error, setError] = useState('');
  const studentName = "GAO XINYAN";
  
  // API URL for our server
  const API_URL = 'http://localhost:53840';

  // Simple logout handler
  const handleLogout = () => {
    setUser(null);
    setAuthMode('login');
    setError('');
  };

  // Function for Login component
  const handleLogin = async ({ username, password }) => {
    setError('');
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    try {
      // Call the server's login endpoint
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        setError(data.error || 'Login failed');
        return;
      }
      
      // Login successful
      setUser({
        username: data.username,
        fullName: data.fullName
      });
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Make sure the server is running.');
    }
  };
  
  // Function for Register component
  const handleRegister = async ({ username, password, fullName }) => {
    setError('');
    
    if (!username.trim() || !fullName.trim()) {
      setError('Username and full name are required');
      return;
    }
    
    try {
      // Call the server's register endpoint
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        setError(data.error || 'Registration failed');
        return;
      }
      
      // Registration successful
      setUser({
        username: data.username,
        fullName: data.fullName
      });
      
    } catch (err) {
      console.error('Registration error:', err);
      setError('Connection error. Make sure the server is running.');
    }
  };

  return (
    <div className="app-container" style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        marginBottom: '2rem',
        textAlign: 'center',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h1 style={{ fontSize: '2rem' }}>IERG3840 Chat Room</h1>
        <div style={{ color: '#666', marginBottom: '1rem' }}>
          <p>Student Name: <strong>{studentName}</strong></p>
          {user ? (
            <p>Logged in as: <strong>{user.username}</strong></p>
          ) : (
            <p>Please login or register.</p>
          )}
        </div>
        {user && (
          <div style={{
            fontSize: '0.9rem',
            color: '#28a745',
            backgroundColor: '#e9f7ef',
            padding: '0.5rem',
            borderRadius: '4px',
            marginTop: '0.5rem'
          }}>
            <span>✓ Connected via WebSocket to ws://127.0.0.1:53840</span>
          </div>
        )}
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {user ? (
          // If a user is logged in, render the Home component
          // Home component already has width: 100% from previous step
          <Home 
            username={user.username} 
            fullName={user.fullName}
            onLogout={handleLogout}
          />
        ) : (
          // Otherwise, render the authentication box.
          <div style={{
            width: '100%', 
            maxWidth: '600px', // Increased size from 400px to 600px
            margin: '0 auto',
            padding: '2rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {error && (
              <div style={{
                padding: '0.5rem',
                marginBottom: '1rem',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
            
            {authMode === 'login' ? (
              <>
                <Login onLogin={handleLogin} />
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <p>
                    Don't have an account?{' '}
                    <button 
                      onClick={() => {
                        setError('');
                        setAuthMode('register');
                      }}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#0275d8', 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '0 5px'
                      }}
                    >
                      Register
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <Register onRegister={handleRegister} />
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <p>
                    Already have an account?{' '}
                    <button 
                      onClick={() => {
                        setError('');
                        setAuthMode('login');
                      }}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#0275d8', 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '0 5px'
                      }}
                    >
                      Login
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer style={{
        marginTop: '2rem',
        textAlign: 'center',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#666'
      }}>        
        <p>WebSocket Chat Application by {studentName}</p>
      </footer>
    </div>
  );
}

export default App;

