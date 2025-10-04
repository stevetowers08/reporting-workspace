// Test the proxy server from browser
fetch('http://localhost:3001/google-sheets-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    spreadsheetId: '1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4',
    range: 'Wedding Leads!A:Z'
  })
})
.then(response => {
  console.log('Proxy server response:', response.status, response.statusText);
  return response.json();
})
.then(data => {
  console.log('Proxy server data:', data);
})
.catch(error => {
  console.error('Proxy server error:', error);
});
