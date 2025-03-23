require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// API endpoint to securely get the API key
app.get('/api/config', (req, res) => {
  // In a production environment, you should implement proper authentication
  // before returning the API key
  
  res.json({
    apiKey: process.env.API_KEY
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});