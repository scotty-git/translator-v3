import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// CORS setup for development
app.use(cors({
  origin: 'http://127.0.0.1:5173',
  credentials: true
}));

app.use(express.json());

// Get OpenAI API key from environment (server-side only)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

console.log('✅ OpenAI API key loaded from environment');

// Text translation endpoint
app.post('/api/openai/translate', async (req, res) => {
  try {
    console.log('🔄 Translation request received');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    console.log('✅ Translation successful');
    res.json(data);
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Whisper transcription endpoint (file upload)
app.post('/api/openai/whisper', upload.single('file'), async (req, res) => {
  try {
    console.log('🔄 Whisper transcription request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(req.file.path);
    const blob = new Blob([fileBuffer], { type: req.file.mimetype });
    
    formData.append('file', blob, req.file.originalname);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json'); // Match existing service expectations
    formData.append('temperature', '0');
    
    // Add any additional parameters from request body
    if (req.body.language) {
      formData.append('language', req.body.language);
    }
    if (req.body.prompt) {
      formData.append('prompt', req.body.prompt);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    });

    const data = await response.json();
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    console.log('✅ Whisper transcription successful');
    res.json(data);
  } catch (error) {
    console.error('❌ Whisper error:', error.message);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Text-to-speech endpoint
app.post('/api/openai/tts', async (req, res) => {
  try {
    console.log('🔄 TTS request received');
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    console.log('✅ TTS successful');
    
    // Forward the audio response
    res.setHeader('Content-Type', 'audio/mpeg');
    
    // Convert Web Stream to Node.js stream for Node.js 18+
    const { Readable } = require('stream');
    if (response.body instanceof ReadableStream) {
      // Node.js 18+ with Web Streams API
      const nodeStream = Readable.fromWeb(response.body);
      nodeStream.pipe(res);
    } else {
      // Fallback for older Node.js versions
      response.body.pipe(res);
    }
  } catch (error) {
    console.error('❌ TTS error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'OpenAI proxy server running' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 OpenAI proxy server running on http://localhost:${PORT}`);
  console.log('   Available endpoints:');
  console.log('   - POST /api/openai/translate');
  console.log('   - POST /api/openai/whisper');
  console.log('   - POST /api/openai/tts');
  console.log('   - GET  /health');
});