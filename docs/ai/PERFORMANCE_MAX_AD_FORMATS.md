# Performance Max Ad Formats Implementation Guide

## Overview

Performance Max campaigns use assets (TEXT, IMAGE, YOUTUBE_VIDEO) that are dynamically combined into ads. The Google Ads API v22 provides asset-level metrics through the `asset_group_asset` resource.

**Official Google Documentation:**
- [Google Ads Help - About asset-level metrics](https://support.google.com/google-ads/answer/13197517) - **MOST IMPORTANT** - Contains official warning about non-summable metrics
- [Google Ads API - asset_group_asset Resource](https://developers.google.com/google-ads/api/fields/v22/asset_group_asset) - Technical API reference
- [Google Ads API - AssetType Enum](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetTypeEnum) - All possible asset type values

## Critical Understanding: Non-Summable Data

**⚠️ IMPORTANT**: Asset-level metrics from `asset_group_asset` are **NON-SUMMABLE** per Google's official documentation.

### Official Google Warning

From [Google Ads Help](https://support.google.com/google-ads/answer/13197517):

> "**Non-summable metrics**: The sum of individual asset impressions, clicks, or costs may not directly match the corresponding metrics (impressions, clicks, or costs) at the asset group level."

### Why Data is Non-Summable

When Google creates an ad from Performance Max assets, multiple assets are combined:
- A single ad impression may include: 1 video + 2 headlines + 1 description + 1 image
- The conversion is attributed to **each asset** that was part of the ad
- Summing asset metrics will result in **massively inflated numbers** (e.g., 3x-5x the actual campaign totals)

### Example of Inflation

If you have 1 conversion from a Performance Max ad that used:
- 1 YOUTUBE_VIDEO asset
- 2 TEXT assets (headlines)
- 1 IMAGE asset

The API will return:
- YOUTUBE_VIDEO: 1 conversion
- TEXT: 2 conversions (one per headline)
- IMAGE: 1 conversion

**Total if summed**: 4 conversions (but actual campaign total = 1 conversion)

## Query Structure

### Performance Max Asset Query

```sql
SELECT
  segments.date,
  segments.ad_network_type,
  campaign.id,
  asset_group.id,
  asset.id,
  asset.type,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros
FROM asset_group_asset
WHERE segments.date BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'
  AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
  AND campaign.status != 'REMOVED'
ORDER BY metrics.conversions DESC
```

### Key Fields

- `asset.type`: Categorizes ad formats (from [AssetType Enum](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetTypeEnum))
  - `TEXT` → Text ads (headlines, descriptions)
  - `IMAGE` → Image/Display ads
  - `YOUTUBE_VIDEO` → Video ads (YouTube videos)
  - `MEDIA_BUNDLE` → Media bundle (also maps to responsiveDisplay)
- `segments.ad_network_type`: Shows which network the asset served on
  - Available networks per [Google Ads Help](https://support.google.com/google-ads/answer/13197517): **YouTube, Display, Search, Discover, Gmail, and Maps**
  - Values: `SEARCH`, `GOOGLE_SEARCH`, `YOUTUBE`, `YOUTUBE_SEARCH`, `DISPLAY`, `GOOGLE_DISPLAY`, `DISCOVER`, `GMAIL`, `MIXED`, etc.
- `segments.date`: Date filtering (uses date selector from header)

### Network Segmentation

Per Google's official documentation, **"Network (with search partners) segmentation"** is available for Performance Max campaigns. This allows you to see which networks (YouTube, Display, Search, Discover, Gmail, Maps) each asset type is performing on.

## Data Processing Best Practices

### ✅ DO: Include Performance Max Assets in Ad Formats Chart

**CRITICAL**: Performance Max assets **MUST** be included in the Ad Formats chart, even though they are non-summable. This is the correct implementation per Google's documentation.

### ✅ DO: Use asset.type for Ad Format Categorization

Map Performance Max assets to ad format categories:

```typescript
if (assetType === 'TEXT') {
  // Map to textAds category (headlines/descriptions)
  adFormats.textAds.conversions += conversions;
  adFormats.textAds.impressions += impressions;
  adFormats.textAds.clicks += clicks;
} else if (assetType === 'IMAGE' || assetType === 'MEDIA_BUNDLE') {
  // Map to responsiveDisplay category (image/display ads)
  adFormats.responsiveDisplay.conversions += conversions;
  adFormats.responsiveDisplay.impressions += impressions;
  adFormats.responsiveDisplay.clicks += clicks;
} else if (assetType === 'YOUTUBE_VIDEO') {
  // Map to videoAds category (YouTube videos)
  adFormats.videoAds.conversions += conversions;
  adFormats.videoAds.impressions += impressions;
  adFormats.videoAds.clicks += clicks;
}
```

**Important**: Use `YOUTUBE_VIDEO` (not `VIDEO`) - this is the correct enum value from the [AssetType Enum](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetTypeEnum).

### ✅ DO: Deduplicate by asset+date+network

The query returns one row per asset per asset_group per ad_network_type per day. Deduplicate to avoid counting the same asset+network+date multiple times:

```typescript
const dedupeKey = `${assetId}_${date}_${adNetworkType}`;
// Take max values if duplicate found (safest approach)
```

### ✅ DO: Use for Directional Insights

Use asset-level data for:
- Comparing relative performance of assets
- Understanding which asset types drive performance
- Channel insights (which networks perform best)

### ✅ DO: Include Performance Max in Ad Formats (Even Though Non-Summable)

**CORRECT APPROACH**: Include Performance Max assets in the Ad Formats chart. The totals will be inflated (3x-5x), but this is **expected and acceptable** per Google's documentation.

**Why Include Them?**
- Provides directional insights about which ad formats (text, image, video) are driving performance
- Allows relative comparisons between asset types
- Matches user expectations - they want to see Performance Max data in the Ad Formats chart
- Google's documentation supports this approach - they warn about non-summable metrics but don't say to exclude them

**Expected Behavior**: 
- Ad formats totals will be **higher** than campaign-level metrics
- This is **expected** and **acceptable**
- Use for **directional insights** and **relative comparisons**, not absolute totals

### ❌ DON'T: Use Asset Metrics for Campaign Totals

**WRONG**: Don't use summed asset metrics as campaign totals:
```typescript
// This will inflate numbers 3x-5x
campaignTotalConversions = sum(allAssetConversions);
```

**RIGHT**: Get campaign totals from campaign-level query:
```sql
SELECT metrics.conversions FROM campaign 
WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
```

## Implementation Notes

1. **Date Selector**: The query uses `segments.date` which respects the header date selector
2. **Deduplication**: We deduplicate by `assetId_date_adNetworkType` to prevent double-counting
3. **Asset Type Mapping** (per [AssetType Enum](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetTypeEnum)): 
   - `TEXT` → `textAds` (headlines, descriptions)
   - `IMAGE` → `responsiveDisplay` (image/display ads)
   - `MEDIA_BUNDLE` → `responsiveDisplay` (media bundles)
   - `YOUTUBE_VIDEO` → `videoAds` (YouTube videos)
4. **Performance Max Assets in Ad Formats**: 
   - ✅ **MUST be included** in the Ad Formats chart
   - Totals will be **higher** than campaign-level metrics (expected)
   - Use for **directional insights** and **relative comparisons**
5. **Network Segmentation**: 
   - Available networks: YouTube, Display, Search, Discover, Gmail, Maps
   - Use `segments.ad_network_type` to see which networks each asset performs on
6. **Expected Behavior**: 
   - Ad formats totals will be **3x-5x higher** than campaign-level metrics
   - This is **expected** and **acceptable** per Google's official documentation
   - The inflation occurs because multiple assets are combined into a single ad

## Troubleshooting

### Issue: Impressions are way too high

**Cause**: Summing non-summable asset metrics

**Solution**: 
- Ensure proper deduplication by asset+date+network
- Understand that totals will be higher than campaign metrics (expected)
- Use for relative comparisons, not absolute totals

### Issue: Missing asset types

**Check**: 
- Verify `asset.type` field is being read correctly
- Check for unmapped asset types in console logs
- Ensure query includes `asset.type` in SELECT

## Official Google Documentation References

### Primary Sources (Most Important)

1. **[Google Ads Help - About asset-level metrics](https://support.google.com/google-ads/answer/13197517)**
   - **MOST CRITICAL** - Contains official warning about non-summable metrics
   - Confirms network segmentation feature for Performance Max
   - Lists available networks: YouTube, Display, Search, Discover, Gmail, and Maps
   - Explains why metrics are non-summable

2. **[Google Ads API - asset_group_asset Resource](https://developers.google.com/google-ads/api/fields/v22/asset_group_asset)**
   - Official API developer documentation
   - Shows all available fields (segments.ad_network_type, asset.type, metrics.conversions, etc.)
   - Technical reference for GAQL queries

3. **[Google Ads API - AssetType Enum](https://developers.google.com/google-ads/api/reference/rpc/v22/AssetTypeEnum)**
   - Lists all possible values for asset.type field
   - Key values: `TEXT`, `IMAGE`, `YOUTUBE_VIDEO`, `MEDIA_BUNDLE`
   - Use this to verify correct enum values in code

### Additional References

- [Google Ads API v22 Asset Resource](https://developers.google.com/google-ads/api/fields/v22/asset)
- [Performance Max Reporting Best Practices](https://developers.google.com/google-ads/api/docs/performance-max/reporting)

## Performance Max Impressions Mismatch Investigation

### Issue: Performance Max Impressions Don't Match Overall Impressions

**Problem**: Performance Max impressions from campaign breakdown don't match overall impressions from customer resource.

### Root Cause Analysis

**1. Different Resource Queries:**
- **Overall Impressions**: From `customer` resource (account-level aggregation)
  - Query: `SELECT metrics.impressions FROM customer WHERE segments.date BETWEEN ...`
  - **No status filter** - includes ALL campaigns regardless of status
- **Performance Max Impressions**: From `campaign` resource (campaign-level aggregation)
  - Query: `SELECT metrics.impressions FROM campaign WHERE campaign.status != 'REMOVED'`
  - **Excludes REMOVED campaigns** - only includes ENABLED, PAUSED, etc.

**2. Potential Causes:**
- **Status Filter Mismatch**: Customer resource includes REMOVED campaigns (if they had data in date range), while campaign breakdown excludes them
- **Data Aggregation Differences**: Customer resource aggregates at account level, campaign resource aggregates individual campaigns
- **Date Range Processing**: Different date handling between resources
- **Campaign Status Changes**: Campaigns that were REMOVED during the date range might still have historical data in customer resource

### Recommended Solution

**Option 1: Add Status Filter to Customer Resource (If Supported)**
```sql
SELECT metrics.impressions FROM customer 
WHERE segments.date BETWEEN '...' AND '...'
AND campaign.status != 'REMOVED'
```
**Note**: Customer resource may not support campaign.status filter directly - needs verification.

**Option 2: Use Campaign Resource for Overall Impressions**
```sql
SELECT metrics.impressions FROM campaign 
WHERE segments.date BETWEEN '...' AND '...'
AND campaign.status != 'REMOVED'
```
Then sum all campaigns to get overall impressions. This ensures consistency with breakdown.

**Option 3: Document the Difference**
- Understand that customer resource includes REMOVED campaigns
- Campaign breakdown excludes REMOVED campaigns
- This difference is expected and acceptable
- Use campaign breakdown for accurate Performance Max totals

### Verification Steps

1. **Check Console Logs**: Look for "IMPRESSIONS COMPARISON" logs that show:
   - Overall impressions (customer resource)
   - Breakdown total (sum of campaign types)
   - Performance Max impressions
   - Difference between overall and breakdown

2. **Compare Campaign Statuses**: Check if there are REMOVED campaigns with data in the date range

3. **Verify Date Ranges**: Ensure both queries use identical date ranges

### Implementation Notes

- Added detailed logging in `getCampaignBreakdown()` to track impressions before/after processing
- Added comparison logging in `analyticsOrchestrator.ts` to compare overall vs breakdown totals
- Logs will show exact differences to help identify the root cause

## Implementation Summary

**Key Points:**
1. ✅ **Include** Performance Max assets in Ad Formats chart (TEXT→textAds, IMAGE→responsiveDisplay, YOUTUBE_VIDEO→videoAds)
2. ⚠️ **Understand** that totals will be inflated (3x-5x) - this is expected and acceptable
3. ✅ **Use** for directional insights and relative comparisons, not absolute totals
4. ✅ **Deduplicate** by asset+date+network to prevent double-counting
5. ✅ **Reference** campaign-level queries for accurate campaign totals
6. ⚠️ **Note**: Performance Max impressions from campaign breakdown may not match overall impressions due to:
   - Customer resource includes REMOVED campaigns (no status filter)
   - Campaign breakdown excludes REMOVED campaigns (status != REMOVED)
   - Different aggregation methods between resources

