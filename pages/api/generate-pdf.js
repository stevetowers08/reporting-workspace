// API route to proxy PDF generation requests to Supabase Edge Function
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { url, clientName, dateRange, tabs, authToken } = req.body;

    if (!url || !clientName) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: url and clientName' 
      });
      return;
    }

    // Call Supabase Edge Function
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      res.status(500).json({ 
        success: false, 
        error: 'Supabase configuration missing' 
      });
      return;
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-pdf`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        url,
        clientName,
        dateRange,
        tabs: tabs || ['summary', 'meta', 'google', 'leads'],
        authToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    res.status(200).json(result);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate PDF'
    });
  }
}
