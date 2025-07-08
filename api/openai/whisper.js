// Vercel API function for OpenAI Whisper transcription

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Whisper transcription request received');
    
    // Parse the multipart form data
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Expected multipart/form-data' });
    }

    // Extract boundary from content-type
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'No boundary found in content-type' });
    }

    // Parse multipart data manually (Vercel doesn't support multer)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Extract the file data from multipart body
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = 0;
    
    while (start < buffer.length) {
      const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
      if (boundaryIndex === -1) break;
      
      const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
      if (nextBoundaryIndex === -1) break;
      
      const part = buffer.slice(boundaryIndex + boundaryBuffer.length, nextBoundaryIndex);
      parts.push(part);
      start = nextBoundaryIndex;
    }

    // Find the file part
    let fileData = null;
    let fileName = 'audio.webm';
    
    for (const part of parts) {
      const headerEndIndex = part.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) continue;
      
      const headers = part.slice(0, headerEndIndex).toString();
      if (headers.includes('name="file"')) {
        fileData = part.slice(headerEndIndex + 4, -2); // Remove \r\n at end
        const fileNameMatch = headers.match(/filename="([^"]+)"/);
        if (fileNameMatch) fileName = fileNameMatch[1];
        break;
      }
    }

    if (!fileData) {
      return res.status(400).json({ error: 'No audio file found in request' });
    }

    // Create FormData for OpenAI
    const formData = new FormData();
    const blob = new Blob([fileData], { type: 'audio/webm' });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');

    // Make request to OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Whisper transcription successful');
    
    res.json(result);
  } catch (error) {
    console.error('❌ Whisper error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll handle it manually
  },
};