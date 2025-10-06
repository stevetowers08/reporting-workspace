module.exports = async function handler(req, res) {
  try {
    console.log('🔍 OAuth callback function started');
    
    const { query } = req;
    const code = query.code;
    
    console.log('🔍 Query params:', { code: !!code, query });
    
    res.status(200).json({ 
      success: true, 
      message: 'OAuth callback function is working',
      code: !!code,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.status(500).json({ 
      error: 'OAuth callback failed', 
      message: error.message
    });
  }
}