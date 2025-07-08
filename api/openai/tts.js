// Vercel API function for OpenAI TTS
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
    console.log('🔄 TTS request received');
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
    
    // Convert response to buffer and send
    const audioBuffer = await response.arrayBuffer();
    res.end(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('❌ TTS error:', error.message);
    res.status(500).json({ error: error.message });
  }
}