const testData = {
  spreadsheetId: "1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4",
  range: "Wedding Leads!A:Z"
};

fetch('http://localhost:3001/google-sheets-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
})
.catch(error => {
  console.error('Error:', error);
});
