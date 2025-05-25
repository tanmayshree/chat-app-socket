// App.js - React.js Frontend for Real-time Chat with Vanilla CSS

import React, { useState, useEffect, useRef } from 'react'; // Import React hooks
import io from 'socket.io-client'; // Import Socket.IO client library
import { Send, User, MessageSquare, Users } from 'lucide-react'; // Import icons from lucide-react

// Import the CSS file for this component
// IMPORTANT: Ensure App.css is located in the same directory as App.js (e.g., frontend/src/App.css)
import './App.css';

// Define the backend server URL
const SOCKET_SERVER_URL = 'https://chat-app-socket-2fxm.onrender.com/';

// Main App component
function App() {
  // State variables for managing the chat application
  const [socket, setSocket] = useState(null); // Socket.IO client instance
  const [messages, setMessages] = useState([]); // Array to store all chat messages (public and private)
  const [messageInput, setMessageInput] = useState(''); // Current message being typed
  const [userId, setUserId] = useState(''); // User's unique ID (username for now)
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Authentication status
  const [loginInput, setLoginInput] = useState(''); // Input for username login

  // New state for personal messaging
  const [currentChatRecipient, setCurrentChatRecipient] = useState(null); // Stores the username of the private chat recipient
  const [showPrivateChatModal, setShowPrivateChatModal] = useState(false); // Controls visibility of private chat modal
  const [privateRecipientInput, setPrivateRecipientInput] = useState(''); // Input for private chat recipient username

  // Ref to automatically scroll to the bottom of the chat messages
  const messagesEndRef = useRef(null);

  // Effect hook for handling Socket.IO connection and events
  useEffect(() => {
    // Only connect if the user is logged in
    if (isLoggedIn) {
      // Initialize Socket.IO client
      const newSocket = io(SOCKET_SERVER_URL);
      setSocket(newSocket);

      // Event listener for 'connect'
      newSocket.on('connect', () => {
        console.log('Connected to server with ID:', newSocket.id);
        // Emit user ID upon connection for the backend to map socket.id to userId
        newSocket.emit('user connected', userId);
      });

      // Event listener for 'chat history' (received when connecting)
      newSocket.on('chat history', (history) => {
        console.log('Received chat history:', history);
        setMessages(history); // Set the initial chat history
      });

      // Event listener for 'public message' (new public messages)
      newSocket.on('public message', (msg) => {
        console.log('Received new public message:', msg);
        // Add new message to the existing messages array
        setMessages((prevMessages) => [...prevMessages, msg]);
      });

      // Event listener for 'private message' (new private messages)
      newSocket.on('private message', (msg) => {
        console.log('Received new private message:', msg);
        // Add new message to the existing messages array
        setMessages((prevMessages) => [...prevMessages, msg]);
      });

      // Event listener for 'disconnect'
      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      // Clean up the socket connection when the component unmounts or user logs out
      return () => {
        newSocket.disconnect();
      };
    }
  }, [isLoggedIn, userId]); // Re-run this effect when isLoggedIn or userId changes

  // Effect hook to scroll to the bottom of the chat whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentChatRecipient]); // Re-scroll when messages or chat recipient changes

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault(); // Prevent default form submission
    if (messageInput.trim() && socket) {
      const messageData = {
        senderId: userId,
        text: messageInput,
        type: currentChatRecipient ? 'private' : 'public', // Message type
        recipientId: currentChatRecipient, // Recipient for private messages
      };

      if (currentChatRecipient) {
        // Emit 'private message' if a recipient is selected
        socket.emit('private message', messageData);
      } else {
        // Emit 'public message' for general chat
        socket.emit('public message', messageData);
      }
      setMessageInput(''); // Clear the input field
    }
  };

  // Handle user login
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginInput.trim()) {
      setUserId(loginInput.trim()); // Set the user ID from input
      setIsLoggedIn(true); // Mark user as logged in
    }
  };

  // Function to format message timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter messages based on current chat recipient
  const filteredMessages = messages.filter(msg => {
    if (currentChatRecipient) {
      // In private chat mode, show messages between current user and recipient
      return (
        (msg.senderId === userId && msg.recipientId === currentChatRecipient) ||
        (msg.senderId === currentChatRecipient && msg.recipientId === userId)
      ) && msg.type === 'private'; // Only show private messages
    } else {
      // In public chat mode, show only public messages
      return msg.type === 'public';
    }
  });

  // Handle opening the private chat modal
  const handleOpenPrivateChatModal = () => {
    setShowPrivateChatModal(true);
    setPrivateRecipientInput(''); // Clear previous input
  };

  // Handle starting a private chat
  const handleStartPrivateChat = (e) => {
    e.preventDefault();
    if (privateRecipientInput.trim() && privateRecipientInput.trim() !== userId) {
      setCurrentChatRecipient(privateRecipientInput.trim());
      setShowPrivateChatModal(false);
    } else {
      // Optional: Add error handling for invalid recipient (e.g., self or empty)
      alert("Please enter a valid recipient username that is not yourself.");
    }
  };

  // Handle switching back to public chat
  const handleBackToPublicChat = () => {
    setCurrentChatRecipient(null);
  };

  // Render the login screen if not logged in
  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h2>Welcome to Chat!</h2>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Enter your username:</label>
              <input
                id="username"
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="e.g., Alice"
                required
              />
            </div>
            <button type="submit" className="login-button">
              Join Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render the chat application if logged in
  return (
    <div className="app-container">
      {/* Header */}
      <header className="chat-header">
        <h1>
          {currentChatRecipient
            ? `Private Chat with ${currentChatRecipient}`
            : `Public Chat (${userId})`}
        </h1>
        <div className="user-info">
          <User size={20} />
          <span>{userId}</span>
        </div>
      </header>

      {/* Chat Messages Area */}
      <main className="chat-messages">
        {filteredMessages.length === 0 && (
          <p className="no-messages-text">
            {currentChatRecipient
              ? `Start your private conversation with ${currentChatRecipient}!`
              : 'No public messages yet. Be the first to send one!'}
          </p>
        )}
        {filteredMessages.map((msg, index) => (
          <div
            key={index} // Using index as key for simplicity, but a unique message ID is better
            className={`message-row ${msg.senderId === userId ? 'sent' : 'received'}`}
          >
            <div
              className={`message-bubble ${msg.senderId === userId ? 'sent' : 'received'}`}
            >
              {/* Sender ID for messages from others in public chat, or if it's a private message from someone else */}
              {(!currentChatRecipient && msg.senderId !== userId) && (
                <div className="message-sender">
                  {msg.senderId}
                </div>
              )}
              {/* Message text */}
              <p className="message-text">{msg.text}</p>
              {/* Timestamp */}
              <div className="message-timestamp">
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
        {/* Dummy div for auto-scrolling */}
        <div ref={messagesEndRef} />
      </main>

      {/* Message Input Area */}
      <footer className="message-input-area">
        <div className="chat-actions">
          {currentChatRecipient ? (
            <button onClick={handleBackToPublicChat} className="action-button public-chat-button">
              <Users size={20} /> Back to Public
            </button>
          ) : (
            <button onClick={handleOpenPrivateChatModal} className="action-button private-chat-button">
              <MessageSquare size={20} /> Private Chat
            </button>
          )}
        </div>
        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={currentChatRecipient ? `Message ${currentChatRecipient}...` : "Type your public message..."}
            className="message-input"
            required
          />
          <button
            type="submit"
            className="send-button"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>

      {/* Private Chat Modal */}
      {showPrivateChatModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Start Private Chat</h2>
            <form onSubmit={handleStartPrivateChat} className="login-form"> {/* Reusing login-form styles */}
              <div className="form-group">
                <label htmlFor="privateRecipient">Recipient Username:</label>
                <input
                  id="privateRecipient"
                  type="text"
                  value={privateRecipientInput}
                  onChange={(e) => setPrivateRecipientInput(e.target.value)}
                  placeholder="Enter recipient's username"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="login-button">
                  Start Chat
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrivateChatModal(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
