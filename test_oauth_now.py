import requests
import json

# Test the OAuth callback URL
url = 'https://tulenreporting.vercel.app/oauth/callback?state=eyJwbGF0Zm9ybSI6Imdvb2dsZSIsInRpbWVzdGFtcCI6MTc1OTc1NDkxOTg0Niwibm9uY2UiOiJ4YWR2a3FpaGIwcSIsImludGVncmF0aW9uUGxhdGZvcm0iOiJnb29nbGVBZHMifQ%3D%3D&code=4/0AVGzR1Bf1k8xWPka1kJ3V8Irrk95FPsFcxRcmp465uB_6gdBiqRoTTlj4KcID_z1j2Oq2Q&scope=https://www.googleapis.com/auth/adwords%20https://www.googleapis.com/auth/spreadsheets.readonly%20https://www.googleapis.com/auth/drive.readonly'

print('🔍 Testing OAuth Callback URL NOW...')

try:
    response = requests.get(url, timeout=15)
    print(f'Status Code: {response.status_code}')
    print(f'Content Length: {len(response.text)}')
    
    # Check for JavaScript execution indicators
    if 'OAuthCallback component mounted' in response.text:
        print('✅ JavaScript component is executing')
    else:
        print('❌ JavaScript component not executing')
    
    if 'v7' in response.text or 'v6' in response.text:
        print('✅ Latest version is deployed')
    else:
        print('❌ Old version still deployed')
        
    if 'Successfully connected' in response.text:
        print('✅ OAuth callback succeeded')
    elif 'error' in response.text.lower():
        print('❌ OAuth callback failed')
    else:
        print('⚠️ OAuth callback status unclear')
        
    # Check for specific error messages
    if 'Something went wrong' in response.text:
        print('❌ Server error detected')
    elif 'Loading Tulen Reporting' in response.text:
        print('⚠️ Still showing loading page')
        
except Exception as e:
    print(f'❌ Error testing URL: {e}')

