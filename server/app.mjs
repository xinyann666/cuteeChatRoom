// app.mjs
import { WebSocketServer } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import url from 'url';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

const uri = "mongodb+srv://YOUR_MONGODB_URI";
const client = new MongoClient(uri);

await client.connect();
console.log("MongoDB connected successfully ✅");

const mongoCollection = client.db('chatroomDB').collection('chatMessages');
const usersCollection = client.db('chatroomDB').collection('users');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', 2592000); // 30 days
  
  // Handle login and register requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Read request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      // Handle login request
      if (path === '/login' && req.method === 'POST') {
        const { username, password } = JSON.parse(body);
        
        // Find user in database
        const user = await usersCollection.findOne({ username });
        
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Account does not exist' }));
          return;
        }
        
        // Check password (in production, use bcrypt.compare)
        if (user.password !== password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Incorrect password' }));
          return;
        }
        
        // Login successful
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          username: user.username,
          fullName: user.fullName
        }));
        return;
      }
      
      // Handle registration request
      if (path === '/register' && req.method === 'POST') {
        const { username, password, fullName } = JSON.parse(body);
        
        // Check if username already exists
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Username already exists' }));
          return;
        }
        
        // Create new user
        const avatarUrl = `https://api.dicebear.com/8.x/bottts/svg?seed=${encodeURIComponent(username)}`;
        
        await usersCollection.insertOne({
          username,
          password, // In production, use bcrypt.hash
          fullName,
          avatarUrl,
          createdAt: new Date()
        });
        
        // Registration successful
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          username,
          fullName,
          avatarUrl
        }));
        return;
      }
      
      // Handle other requests
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

const wsServer = new WebSocketServer({ server });
const port = 53840;

const connections = {};
const users = {};

const handleMessage = async (bytes, uuid) => {
  const messageData = JSON.parse(bytes.toString());
  const user = users[uuid];
  if (!user) return;

  if (messageData.type === 'reaction') {
    // Reaction message
    const reactionMsg = {
      type: 'reaction',
      messageId: messageData.messageId,
      reaction: messageData.reaction,
      reacted_by: user.username,
      reacted_at: new Date().toISOString()
    };
    broadcast(reactionMsg);

  } else if (messageData.type === 'media') {
    // Images or videos
    const mediaMsg = {
      sender: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      type: 'media',
      message: messageData.message,
      mediaType: messageData.mediaType,
      sent_time: new Date().toISOString(),
      reactions: {}
    };
    await mongoCollection.insertOne(mediaMsg);
    broadcast(mediaMsg);

  } else if (messageData.type === 'file') {
    // PDF, DOCX, etc.
    const fileMsg = {
      sender: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      type: 'file',
      fileName: messageData.fileName,
      fileData: messageData.fileData,
      mimeType: messageData.mimeType,
      sent_time: new Date().toISOString(),
      reactions: {}
    };
    await mongoCollection.insertOne(fileMsg);
    broadcast(fileMsg);

  } else if (messageData.type === 'voice') {
    const voiceMsg = {
      sender: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      type: 'voice',
      audioData: messageData.audioData,
      mediaType: messageData.mediaType,
      sent_time: new Date().toISOString(),
      reactions: {}
    };
    await mongoCollection.insertOne(voiceMsg);
    broadcast(voiceMsg);

  } else {
    // Text message
    const chatMsg = {
      sender: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      type: 'text',
      message: messageData.message,
      sent_time: new Date().toISOString(),
      reactions: {}
    };
    await mongoCollection.insertOne(chatMsg);
    broadcast(chatMsg);
  }
};

const broadcast = (msg) => {
  const strMsg = JSON.stringify(msg);
  Object.values(connections).forEach(connection => {
    connection.send(strMsg);
  });
};

const handleClose = (uuid) => {
  if (users[uuid]) {
    console.log(`${users[uuid].username} disconnected`);
  }
  delete connections[uuid];
  delete users[uuid];
};

wsServer.on('connection', async (connection, request) => {
  // Parse username/fullName from query parameters
  const { username, fullName } = url.parse(request.url, true).query;
  console.log(`${fullName} (${username}) connected`);

  const uuid = uuidv4();
  connections[uuid] = connection;
  users[uuid] = { 
    username, 
    fullName,
    avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=${encodeURIComponent(username)}`
  };

  try {
    const chatHistory = await mongoCollection
      .find()
      .sort({ sent_time: -1 })
      .limit(7)
      .toArray();

    // Send the 7 newest messages in chronological order
    connection.send(JSON.stringify({
      type: 'history',
      data: chatHistory.reverse()
    }));
  } catch (error) {
    console.error('Error fetching chat history:', error);
    connection.send(JSON.stringify({
      type: 'history',
      data: []
    }));
  }

  connection.on('message', (message) => handleMessage(message, uuid));
  connection.on('close', () => handleClose(uuid));
});

server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
  console.log(`Authentication server is also running on the same port`);
});
