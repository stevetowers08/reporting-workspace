import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // Debug: Log component mounting
  console.log('🔍 OAuthCallback component mounted - v5 - MINIMAL');
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Search params:', window.location.search);
  
  // Force immediate execution for testing
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  console.log('🔍 IMMEDIATE TEST - Code:', code ? 'EXISTS' : 'MISSING');
  console.log('🔍 IMMEDIATE TEST - State:', state ? 'EXISTS' : 'MISSING');
  
  if (code && state) {
    console.log('🔍 IMMEDIATE TEST - OAuth parameters found, should process');
    setStatus('success');
    setMessage('OAuth callback received parameters!');
  } else {
    console.log('🔍 IMMEDIATE TEST - No OAuth parameters found');
    setStatus('error');
    setMessage('No OAuth parameters found');
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>OAuth Callback Test</h1>
      <p>Status: {status}</p>
      <p>Message: {message}</p>
      <p>Code: {code ? 'EXISTS' : 'MISSING'}</p>
      <p>State: {state ? 'EXISTS' : 'MISSING'}</p>
      <button onClick={() => navigate('/admin')}>Go to Admin</button>
    </div>
  );
};

export default OAuthCallback;