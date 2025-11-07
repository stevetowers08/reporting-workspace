#!/bin/bash

# Google Ads API Test Script
# Tests demographics and campaign breakdown queries using curl

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Google Ads API Test Script${NC}\n"

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$ACCESS_TOKEN" ] || [ -z "$DEVELOPER_TOKEN" ] || [ -z "$CUSTOMER_ID" ] || [ -z "$MANAGER_ID" ]; then
  echo -e "${RED}❌ Missing required environment variables${NC}"
  echo "Please set the following variables:"
  echo "  ACCESS_TOKEN - Google Ads OAuth access token"
  echo "  DEVELOPER_TOKEN - Google Ads developer token (from .env.local)"
  echo "  CUSTOMER_ID - Customer ID to test (e.g., 5894368498)"
  echo "  MANAGER_ID - Manager account ID (for login-customer-id header)"
  echo ""
  echo "Example:"
  echo "  export ACCESS_TOKEN='your-access-token'"
  echo "  export DEVELOPER_TOKEN='\$VITE_GOOGLE_ADS_DEVELOPER_TOKEN'"
  echo "  export CUSTOMER_ID='5894368498'"
  echo "  export MANAGER_ID='your-manager-id'"
  echo "  ./scripts/test-google-ads-api.sh"
  exit 1
fi

# API Configuration
API_VERSION="v21"
BASE_URL="https://googleads.googleapis.com/${API_VERSION}/customers/${CUSTOMER_ID}/googleAds:searchStream"
DATE_START="2024-10-01"
DATE_END="2024-10-31"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Customer ID: ${CUSTOMER_ID}"
echo "  Manager ID: ${MANAGER_ID}"
echo "  Date Range: ${DATE_START} to ${DATE_END}"
echo ""

# Test 1: Gender Demographics Query
echo -e "${GREEN}1️⃣ Testing Gender Demographics (segments.gender)${NC}"
GENDER_QUERY="SELECT segments.gender, metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM campaign WHERE segments.date BETWEEN '${DATE_START}' AND '${DATE_END}' AND campaign.status = 'ENABLED' AND segments.gender IS NOT NULL"

echo "Query: ${GENDER_QUERY}"
echo ""

GENDER_RESPONSE=$(curl -s -X POST "${BASE_URL}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "developer-token: ${DEVELOPER_TOKEN}" \
  -H "login-customer-id: ${MANAGER_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${GENDER_QUERY}\"}")

if echo "$GENDER_RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Error:${NC}"
  echo "$GENDER_RESPONSE" | jq '.' 2>/dev/null || echo "$GENDER_RESPONSE"
else
  echo -e "${GREEN}✅ Success${NC}"
  echo "$GENDER_RESPONSE" | jq '.' 2>/dev/null | head -50 || echo "$GENDER_RESPONSE" | head -50
fi

echo ""
echo "---"
echo ""

# Test 2: Age Demographics Query
echo -e "${GREEN}2️⃣ Testing Age Demographics (segments.age_range)${NC}"
AGE_QUERY="SELECT segments.age_range, metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM campaign WHERE segments.date BETWEEN '${DATE_START}' AND '${DATE_END}' AND campaign.status = 'ENABLED' AND segments.age_range IS NOT NULL"

echo "Query: ${AGE_QUERY}"
echo ""

AGE_RESPONSE=$(curl -s -X POST "${BASE_URL}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "developer-token: ${DEVELOPER_TOKEN}" \
  -H "login-customer-id: ${MANAGER_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${AGE_QUERY}\"}")

if echo "$AGE_RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Error:${NC}"
  echo "$AGE_RESPONSE" | jq '.' 2>/dev/null || echo "$AGE_RESPONSE"
else
  echo -e "${GREEN}✅ Success${NC}"
  echo "$AGE_RESPONSE" | jq '.' 2>/dev/null | head -50 || echo "$AGE_RESPONSE" | head -50
fi

echo ""
echo "---"
echo ""

# Test 3: Campaign Breakdown Query
echo -e "${GREEN}3️⃣ Testing Campaign Breakdown${NC}"
CAMPAIGN_QUERY="SELECT campaign.advertising_channel_type, campaign.name, metrics.conversions, metrics.cost_micros FROM campaign WHERE segments.date BETWEEN '${DATE_START}' AND '${DATE_END}' AND campaign.status = 'ENABLED'"

echo "Query: ${CAMPAIGN_QUERY}"
echo ""

CAMPAIGN_RESPONSE=$(curl -s -X POST "${BASE_URL}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "developer-token: ${DEVELOPER_TOKEN}" \
  -H "login-customer-id: ${MANAGER_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${CAMPAIGN_QUERY}\"}")

if echo "$CAMPAIGN_RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Error:${NC}"
  echo "$CAMPAIGN_RESPONSE" | jq '.' 2>/dev/null || echo "$CAMPAIGN_RESPONSE"
else
  echo -e "${GREEN}✅ Success${NC}"
  echo "$CAMPAIGN_RESPONSE" | jq '.' 2>/dev/null | head -50 || echo "$CAMPAIGN_RESPONSE" | head -50
fi

echo ""
echo -e "${GREEN}🏁 Test Complete!${NC}"


