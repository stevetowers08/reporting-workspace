# Facebook App Credentials

**App ID:** `2922447491235718`
**App Secret:** `1931f7ba0db26d624129eedc0d4ee10f`

## OAuth Redirect URI

`http://localhost:8082/oauth/callback`

## Required Permissions

- `ads_read` - Read ad performance data
- `ads_management` - Access campaign details  
- `business_management` - Access business account info

## Setup Instructions

1. Go to <https://developers.facebook.com/>
2. Select your app (ID: 2922447491235718)
3. Go to Products → Facebook Login → Settings
4. Add redirect URI: `http://localhost:8082/oauth/callback`
5. Save changes

## Testing

- App runs on: <http://localhost:8082/>
- OAuth callback: <http://localhost:8082/oauth/callback>
- Admin Panel: <http://localhost:8082/admin>
