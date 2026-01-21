import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';
import { auth, db } from './firebase/firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore'; 

// *** FOR LOCAL TESTING: MUST BE LOCALHOST ***
const BASE_URL = 'http://127.0.0.1:5000'; 

// Default code for each language
const defaultCode = {
  python: `def calculate_sum(n):\n    total = 0\n    for i in range(n + 1):\n        total += i\n    return total\n\nprint(calculate_sum(10))`,
  java: `public class Main {\n    public static int findMax(int[] arr) {\n        int max = arr[0];\n        for (int i = 1; i < arr.length; i++) {\n            if (arr[i] > max) {\n                max = arr[i]; \n            }\n        }\n        return max;\n    }\n    public static void main(String[] args) {\n        int[] numbers = {10, 50, 30, 20, 40};\n        System.out.println("Max is: " + findMax(numbers));\n    }\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, Smart Compile!\\n");\n    return 0;\n}`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, Smart Compile!" << " from C++" << std::endl;\n    return 0;\n}`,
};


// -------------------------------------------------------------------
// --- AUTHENTICATION COMPONENT ---
// -------------------------------------------------------------------

const AuthComponent = ({ initialMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(initialMessage || '');

  const handleAuth = async () => {
    setError('');
    setMessage('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage('Login successful!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Account created successfully! You are now logged in.');
      }
    } catch (e) {
      console.error(e);
      const errorMessage = e.code.replace('auth/', '').replace(/-/g, ' ');
      setError(`Auth Error: ${errorMessage}`);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Bot Welcome Block */}
      <div className="welcome-bot-block">
        <div className="bot-icon">🤖</div>
        <div className="welcome-text">
          <h2>Welcome to Smart Compile</h2>
          <p className="tagline">An AI Powered Interactive Code Reviewer And Compiler</p>
          <p className="status-message">Please Sign In or Register to use the compiler.</p>
        </div>
      </div>
      
      {/* Login/Register Form Block */}
      <div className="auth-form-block">
        <div className="auth-container">
          <h2>{isLogin ? 'Sign In' : 'Sign Up'}</h2>
          
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          {/* Stacking inputs vertically */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="auth-button" onClick={handleAuth}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>

          <p className="toggle-info">
            {isLogin ? "Need an account? " : "Already have an account? "}
            <span 
              className="toggle-link" 
              onClick={() => {
                setIsLogin(!isLogin); 
                setError(''); 
                setMessage('');
              }}
            >
              {isLogin ? 'Register Here' : 'Sign In Here'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};


// -------------------------------------------------------------------
// --- MAIN APP COMPONENT ---
// -------------------------------------------------------------------

function App() {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(defaultCode.python);
  const [output, setOutput] = useState('');
  const [rawError, setRawError] = useState(''); 
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [history, setHistory] = useState([]); 
  const [showHistory, setShowHistory] = useState(false); 
  const [logoutQuote, setLogoutQuote] = useState('');
  const [level, setLevel] = useState('easy'); // NEW STATE: Default to Easy
  const TAGLINE = "An AI Powered Interactive Code Reviewer And Compiler";

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        setOutput(`Welcome back, ${currentUser.email}!`);
        setLogoutQuote(''); 
      } else {
        setOutput('Please sign in to use the compiler.');
      }
    });
    return () => unsubscribe();
  }, []);

  // History Listener
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'codeHistory'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      sessions.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      setHistory(sessions);
    }, (error) => {
      console.error("Error fetching history: ", error);
      setOutput(`Error loading history: ${error.message}`);
    });

    return () => unsubscribe();
  }, [user]); 


  // --- Helper function to format timestamp ---
  const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return timestamp.toDate().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // --- FUNCTION: LOAD SELECTED SESSION ---
  const handleLoadSession = (session) => {
    setCode(session.codeContent);
    setLanguage(session.language);
    setOutput(`Loaded session: "${session.title}" (${session.language})`);
    setShowHistory(false); 
  };


  const handleEditorChange = (value) => {
    setCode(value);
  };

  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    setLanguage(newLang);
    setCode(defaultCode[newLang]);
    setOutput('');
    setRawError('');
  };

  const handleLevelChange = (event) => {
    setLevel(event.target.value);
    setOutput(`AI learning level set to: ${event.target.value.toUpperCase()}`);
  };

  // Generic Function for Fetch Requests
  const apiFetch = async (endpoint, payload) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
  
  // ------------------------------------------------------------------
  // --- CORE FEATURE HANDLERS (Updated to send Level) ---
  // ------------------------------------------------------------------
  
  const handleRunCode = async () => {
    setOutput('Running code...');
    setRawError('');
    try {
      const data = await apiFetch('/run', { code: code, language: language });
      setOutput(data.output);
      setRawError(data.raw_error); 

    } catch (error) {
      setOutput(`Error connecting to backend: ${error.message}. Check Flask.`);
    }
  };

  const handleExplainError = async () => {
    if (!rawError) {
      setOutput("Please run your code first and generate an error before explaining.");
      return;
    }
    setOutput("Generating AI explanation...");
    
    try {
        const data = await apiFetch('/explain', { 
            code: code, 
            language: language, 
            raw_error: rawError, 
            level: level // Send Level
        });
        setOutput(data.explanation); 

    } catch (error) {
        setOutput(`Error: Could not get AI explanation. Detail: ${error.message}`);
    }
  };
  
  const handleAICodeReview = async (reviewType) => {
    const reviewName = reviewType === 'static_check' ? 'AI Code Review' : 'Complexity Analysis';
    setOutput(`Running ${reviewName} for ${language} at ${level.toUpperCase()} level...`);
    setRawError('');

    try {
      const data = await apiFetch('/code_review', { 
          code: code, 
          language: language, 
          review_type: reviewType,
          level: level // Send Level
      });
      setOutput(`--- ${reviewName} Results ---\n${data.output}`);

    } catch (error) {
      setOutput(`Error connecting to backend for ${reviewName}: ${error.message}`);
    }
  };


  const handleAutoComment = async () => {
    setOutput('Generating inline comments...');
    setRawError('');
    
    try {
      const data = await apiFetch('/auto_comment', { code: code, language: language });
      setCode(data.output);
      setOutput('Comments generated successfully! Check the code editor.');

    } catch (error) {
      setOutput(`Error generating comments: ${error.message}`);
    }
  };


  const handleFormatCode = async () => {
    setOutput('Formatting code...');
    setRawError('');
    
    try {
      const data = await apiFetch('/format_code', { code: code, language: language });
      setCode(data.output);
      setOutput('Code formatted successfully! Check the code editor.');

    } catch (error) {
      setOutput(`Error formatting code: ${error.message}`);
    }
  };
  
  const handleSaveSession = async () => {
    if (!user) {
      setOutput('Error: You must be logged in to save code.');
      return;
    }
    
    const title = prompt("Enter a title for this code session (e.g., 'Python Max Sum Function'):");
    
    if (!title || title.trim() === "") {
      setOutput('Save operation cancelled.');
      return;
    }

    setOutput(`Attempting to save session: "${title}"...`);

    const sessionData = {
      userId: user.uid,
      title: title.trim(),
      codeContent: code,
      language: language,
      timestamp: serverTimestamp(), 
    };

    try {
      await addDoc(collection(db, 'codeHistory'), sessionData);
      setOutput(`Success! Code session "${title}" saved to the cloud under your account.`);
    } catch (e) {
      console.error("Error saving document: ", e);
      setOutput(`Error saving session: ${e.message}. (Did you publish the security rules?)`);
    }
  };
  // ------------------------------------------------------------------


  // Handle Sign Out (with Quote)
  const handleSignOut = () => {
    const quotes = [
      "The only way to learn a new programming language is by writing programs in it.",
      "The best way to predict the future is to create it.",
      "Programming is not about knowing, it is about understanding.",
      "Every great developer you know started by being a terrible developer.",
      "First, solve the problem. Then, write the code.",
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setLogoutQuote(randomQuote);
    signOut(auth);
    setCode(defaultCode.python); 
  }

  if (loadingAuth) {
    return <div className="loading-screen">Loading application...</div>;
  }

  // --- Render Auth Screen ---
  if (!user) {
    return (
      <div className="App">
        <header className="App-header-unauth">
          {/* Quote and Tagline on Logout */}
          <p className="unauth-quote-line">{logoutQuote}</p>
          <p className="unauth-tagline">{TAGLINE}</p>
        </header>
        <AuthComponent 
            initialMessage={''} 
        />
      </div>
    );
  }

  // --- Render Main Compiler Screen ---
  return (
    <div className="App">
      <header className="App-header">
        <h1 className="logo-text">Smart Compile</h1>
        {/* Top Right Control Panel */}
        <div className="user-control-panel">
          <span className="user-email">Logged in as: {user.email}</span>
          <button className="signout-button" onClick={handleSignOut}>Sign Out</button>
          
          {/* Code History Button */}
          <button 
            className="history-toggle-button"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide History' : `Show History (${history.length})`}
          </button>
        </div>
      </header>
      
      {/* Collapsible History Bar */}
      <div className={`history-bar-container ${showHistory ? 'visible' : ''}`}>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="empty-history">No saved sessions yet. Click "Save Session"!</p>
          ) : (
            history.map((session) => (
              <div 
                key={session.id} 
                className="history-item" 
                onClick={() => handleLoadSession(session)}
                title={`Load: ${session.title}`}
              >
                <span className="history-title">{session.title}</span>
                <span className="history-meta">({session.language.toUpperCase()}) - Saved {formatTimestamp(session.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Language and Level Selectors */}
      <div className="selector-bar">
        <div className="selector-group">
          <label htmlFor="language-select">Select Language: </label>
          <select id="language-select" value={language} onChange={handleLanguageChange}>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        {/* NEW: Level Selector */}
        <div className="selector-group">
          <label htmlFor="level-select">Select AI Level: </label>
          <select id="level-select" value={level} onChange={handleLevelChange}>
            <option value="easy">Easy (7th Grade)</option>
            <option value="medium">Medium (Intermediate)</option>
            <option value="hard">Hard (B.Tech / Advanced)</option>
          </select>
        </div>
      </div>


      {/* Main Layout: Editor (Left) & Buttons (Right) */}
      <div className="main-compiler-area">
        {/* Left Column: Editor */}
        <div className="editor-area">
          <Editor
            height="100%"
            width="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
          />
        </div>

        {/* Right Column: Buttons */}
        <div className="button-side-panel">
            <button className="action-button primary-action" onClick={handleRunCode}>Run Code</button>
            <button className="action-button primary-action" onClick={handleSaveSession}>Save Session</button>
            <button className="action-button ai-action" onClick={() => handleAICodeReview('static_check')}>AI Code Review</button>
            <button className="action-button ai-action" onClick={handleExplainError}>Explain Error</button>
            <button className="action-button ai-action" onClick={handleAutoComment}>Auto-Comment</button>
            <button className="action-button ai-action" onClick={() => handleAICodeReview('complexity')}>Complexity Analysis</button>
            <button className="action-button ai-action" onClick={handleFormatCode}>Format Code</button>
        </div>
      </div>
      
      {/* Output Panel (Full Width Bottom) */}
      <div className="output-panel-full">
        <h2>Output:</h2>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default App;