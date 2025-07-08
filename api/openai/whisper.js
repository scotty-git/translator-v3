// Vercel API function for OpenAI Whisper transcription
// Note: For now, this returns a simple response. 
// File upload handling will be implemented when needed.

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
    
    // For now, return a mock response
    // TODO: Implement proper file upload handling
    const mockResponse = {
      text: "This is a test transcription from Vercel deployment",
      language: "english",
      duration: 5.0,
      segments: []
    };

    console.log('✅ Whisper transcription successful (mock)');
    res.json(mockResponse);
  } catch (error) {
    console.error('❌ Whisper error:', error.message);
    res.status(500).json({ error: error.message });
  }
}