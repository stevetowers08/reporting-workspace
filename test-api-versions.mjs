import { readFileSync } from 'fs';

// Load environment variables from .env file
const envContent = readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
envLines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

async function testAPIVersions() {
  console.log('🔍 Testing GoHighLevel API Versions...\n');

  const accessToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoiZ2xnWG5FS0xNZ2dnMENGaEJSTjgiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjhlMTM1YWExN2Y1NzQwNjdjZmI3ZTM5LW1nb2V2dmt1IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoiZ2xnWG5FS0xNZ2dnMENGaEJSTjgiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5Iiwib3Bwb3J0dW5pdGllcy5yZWFkb25seSIsImNhbGVuZGFycy5yZWFkb25seSIsImZ1bm5lbHMvZnVubmVsLnJlYWRvbmx5IiwiZnVubmVscy9wYWdlLnJlYWRvbmx5IiwibG9jYXRpb25zLnJlYWRvbmx5Il0sImNsaWVudCI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOSIsInZlcnNpb25JZCI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOSIsImNsaWVudEtleSI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOS1tZ29ldnZrdSJ9LCJpYXQiOjE3NjAzMjU5NzQuNTkxLCJleHAiOjE3NjA0MTIzNzQuNTkxfQ.ou-bQUFoBpcLHCffz39v13IgwPEKJYYifwoU9i0bcw1v0q3dri3Gx3yoWFTnkFnKp6Ef9aExbsUdZ1ai5jmOva8RmZNNrBWNoHMGdcmGjkdMPPXNpg9rQekVx8HffS2NeXniCq5Xn1yHHiFbkwEm0RFgg_geQuew119MbiEdmZB4Vuqu55DkhxF-Qxkm13HaSyk_mMIYFt4tUZJTJwefs8Bcc-rslQ2FKjb0-Xrd8XDTKUzAl87jiDJfOCzb8xeGoywh68gXb9Zm-QlCRIBr11JtSNSSx3APsMOrGHUY3gkzmtJDy09fs4Ca_n7hm9Ry1x3v2i1hOWa0fDQUBO9O5HB4GSRvjHKlI9j0AEdYVLNzUlb7BojAHYLIaEx9fuQkzbCVXadg1BQYy01_OKmqh6MIb8bCwKazGBi9lsk9beghZPzb6f5A1a7b_UF-rphITcEq5UV8VdKSlYGl1kAPX04DcyjgrF7vfSe5-Ya5HfpTapgAL4Rcg9959sPwxEuQ42-yf9_bFPv5t6s9uQeCrtIj81eirLcFjR9gZTHQc6zSVWFL6TAXIA1U_BMOUe9Xt9ThID1EsVqZlxJj9YM6ChaAed5a7uVkHVfKmpwdIq5dAiA-B5ykRleGNSad2-8xdaVJcj2Psdp-Efjxl2rKVvoHynio01-I3fLWX8QcbQQ';

  const versions = [
    '2021-07-28', // Original API 1.0
    '2022-01-01', // Test API 2.0 variant 1
    '2022-07-28', // Test API 2.0 variant 2
    '2023-01-01', // Test API 2.0 variant 3
    '2023-07-28', // Test API 2.0 variant 4
    '2024-01-01', // Test API 2.0 variant 5
  ];

  for (const version of versions) {
    console.log(`📊 Testing API Version: ${version}`);
    
    try {
      const response = await fetch('https://services.leadconnectorhq.com/contacts/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': version
        },
        body: JSON.stringify({
          locationId: 'glgXnEKLMggg0CFhBRN8',
          pageLimit: 1,
          query: ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Version ${version} - SUCCESS:`, {
          total: data.total,
          contacts: data.contacts?.length || 0
        });
      } else {
        const errorText = await response.text();
        console.log(`❌ Version ${version} - Error:`, response.status, errorText.substring(0, 100));
      }
    } catch (error) {
      console.log(`❌ Version ${version} - Exception:`, error.message);
    }
    
    console.log('---');
  }
}

testAPIVersions();
