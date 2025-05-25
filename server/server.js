// server.js - Node.js Backend for Real-time Chat with Private Messaging

// Import necessary modules
const express = require('express'); // Express.js for handling HTTP requests
const http = require('http'); // Node.js built-in HTTP module
const { Server } = require('socket.io'); // Socket.IO for real-time bidirectional communication
const cors = require('cors'); // CORS middleware to allow cross-origin requests from the React frontend

// Initialize Express app
const app = express();
// Create an HTTP server using the Express app
const server = http.createServer(app);

// Initialize Socket.IO server and configure CORS
// The 'cors' option allows the React frontend (running on a different port) to connect
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development. In production, specify your React app's URL.
    methods: ['GET', 'POST'], // Allow GET and POST HTTP methods
  },
});

// Use CORS middleware for Express as well, though Socket.IO handles its own CORS.
// This is good practice for any potential HTTP endpoints you might add later.
app.use(cors());

// Define the port for the server to listen on
const PORT = process.env.PORT || 3001;

// Array to store all chat messages (public and private)
// In-memory for simplicity. In a production app, use a database.
let messages = [];

// Map to store active users and their corresponding socket IDs
// This is crucial for private messaging to target specific users
const activeUsers = new Map(); // userId -> socket.id

// Socket.IO event handling
// 'connection' event fires when a new client connects to the Socket.IO server
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Listen for 'user connected' event from the client
  // This event sends the username (userId) of the connected client
  socket.on('user connected', (userId) => {
    activeUsers.set(userId, socket.id); // Map the userId to its socket.id
    socket.userId = userId; // Attach userId to the socket object for easy access on disconnect
    console.log(`User ${userId} (Socket ID: ${socket.id}) is now active.`);

    // Send all existing messages (public and private) to the newly connected client
    // The frontend will filter these based on the current chat mode.
    socket.emit('chat history', messages);
  });

  // Listen for 'public message' events from clients
  socket.on('public message', (msg) => {
    console.log(`Public message from ${msg.senderId}: ${msg.text}`);

    // Add timestamp and type to the message
    const messageWithDetails = {
      ...msg,
      timestamp: new Date().toISOString(),
      type: 'public', // Explicitly mark as public
    };

    // Store the message
    messages.push(messageWithDetails);

    // Broadcast the public message to all connected clients
    io.emit('public message', messageWithDetails);
  });

  // Listen for 'private message' events from clients
  socket.on('private message', (msg) => {
    console.log(`Private message from ${msg.senderId} to ${msg.recipientId}: ${msg.text}`);

    const recipientSocketId = activeUsers.get(msg.recipientId); // Get recipient's socket ID
    const senderSocketId = activeUsers.get(msg.senderId); // Get sender's socket ID (should be socket.id)

    // Add timestamp and type to the message
    const messageWithDetails = {
      ...msg,
      timestamp: new Date().toISOString(),
      type: 'private', // Explicitly mark as private
    };

    // Store the message
    messages.push(messageWithDetails);

    // Send the private message only to the recipient and the sender
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private message', messageWithDetails);
      console.log(`Private message sent to recipient ${msg.recipientId}`);
    } else {
      // If recipient is not found (offline or invalid username)
      // You might want to send a delivery failure notification back to the sender
      console.log(`Recipient ${msg.recipientId} not found or offline.`);
      // Optional: Send a message back to the sender indicating recipient is offline
      io.to(senderSocketId).emit('private message', {
        senderId: 'System',
        text: `User ${msg.recipientId} is currently offline or does not exist.`,
        timestamp: new Date().toISOString(),
        type: 'private',
        recipientId: msg.senderId // Send back to the sender
      });
    }

    // Always send the message back to the sender's own client
    // This ensures the sender sees their own private messages
    if (senderSocketId && senderSocketId !== recipientSocketId) { // Avoid sending twice if sender is also recipient
        io.to(senderSocketId).emit('private message', messageWithDetails);
    }
  });


  // Listen for 'disconnect' events when a client disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Remove the user from the activeUsers map
    if (socket.userId) {
      activeUsers.delete(socket.userId);
      console.log(`User ${socket.userId} removed from active users.`);
    }
  });
});

// Start the server and listen on the specified port
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Basic Express route (optional, for testing if the server is running)
app.get('/', (req, res) => {
  res.send('Chat server is running!');
});
