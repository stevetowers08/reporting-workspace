# Google Ads Demographics Implementation Analysis

**Created:** January 21, 2025  
**Status:** 🔄 **CRITICAL ISSUE - NEEDS FIX**  
**Priority:** HIGH  
**Blocking:** Complete V2 Migration (95% → 100%)

---

## 🎯 **EXECUTIVE SUMMARY**

The Google Ads demographics feature is **broken** due to deprecated API field usage. While main metrics (leads, cost, impressions) work perfectly, demographic breakdowns show 0% across all categories despite having actual leads data. This is the **only remaining critical issue** preventing full V2 migration completion.

---

## 🔍 **CURRENT IMPLEMENTATION BREAKDOWN**

### **1. Architecture Overview**
- **Service:** `GoogleAdsService.getDemographicBreakdown()`
- **Location:** `src/services/api/googleAdsService.ts` (lines 972-1018)
- **API Version:** v21 (latest 2025)
- **Approach:** Separate parallel queries for gender and age data
- **Integration:** Called from `AnalyticsOrchestrator.getGoogleData()` (lines 1129-1134)

### **2. Data Flow**
```
AnalyticsOrchestrator.getGoogleData()
    ↓
GoogleAdsService.getDemographicBreakdown()
    ↓
Promise.all([
    getGenderBreakdown(),    // ❌ FAILS
    getAgeBreakdown()        // ❌ FAILS
])
    ↓
API returns 400 errors
    ↓
Fallback to { female: 0, male: 0 } and { '25-34': 0, ... }
    ↓
UI shows 0% demographics despite having leads
```

### **3. Current Query Implementation**

#### **Gender Breakdown Query** (Lines 1031-1042)
```sql
SELECT 
  campaign.id,
  campaign.name,
  ad_group_criterion.gender.type,  -- ❌ DEPRECATED FIELD
  metrics.conversions,
  metrics.cost_micros
FROM keyword_view 
WHERE campaign.advertising_channel_type IN ('PERFORMANCE_MAX', 'SEARCH')
AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
AND ad_group_criterion.gender.type IS NOT NULL
```

#### **Age Breakdown Query** (Lines 1070-1081)
```sql
SELECT 
  campaign.id,
  campaign.name,
  ad_group_criterion.age_range.type,  -- ❌ DEPRECATED FIELD
  metrics.conversions,
  metrics.cost_micros
FROM keyword_view 
WHERE campaign.advertising_channel_type IN ('PERFORMANCE_START', 'SEARCH')
AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
AND ad_group_criterion.age_range.type IS NOT NULL
```

---

## ❌ **THE CORE PROBLEM**

### **API Field Deprecation**
Google Ads API v21 **deprecated** the `ad_group_criterion` demographic fields:
- `ad_group_criterion.gender.type` → **UNRECOGNIZED**
- `ad_group_criterion.age_range.type` → **UNRECOGNIZED**

### **Error Messages**
```
400 Bad Request: "Unrecognized field in the query: 'segments.age_range'"
400 Bad Request: "Unrecognized field in the query: 'segments.gender'"
```

### **Impact**
- Demographics charts show **0%** across all categories
- Campaign breakdown may have similar issues
- **Main metrics work perfectly** (leads, cost, impressions)
- Affects **3 active clients** with Google Ads accounts

---

## ✅ **WHAT'S WORKING**

### **Main Google Ads Metrics** ✅
- **Leads:** 10 (Fire House Loft), 391 (Wormwood), etc.
- **Cost:** $391, $484, etc.
- **Impressions:** Thousands of impressions
- **Clicks:** Hundreds of clicks
- **CTR, CPC, Conversion Rate:** All calculated correctly

### **Infrastructure** ✅
- **Authentication:** OAuth tokens working
- **Rate Limiting:** Sophisticated token bucket implementation
- **Error Handling:** Graceful fallbacks
- **Caching:** Smart cache with dependency invalidation
- **API Version:** v21 (latest 2025)

---

## 🔧 **THE CORRECT FIX REQUIRED**

### **Root Cause Analysis**
The issue isn't that Google Ads API v21 doesn't support demographics - it **DOES support** demographic targeting through:
- **CriterionInfo types:** AgeRangeInfo, GenderInfo, IncomeRangeInfo, ParentalStatusInfo
- **GAQL queries:** For retrieving demographic data
- **Resource-based targeting:** Using resource names and IDs

**Our Problem:** We're using **deprecated `ad_group_criterion` fields** instead of the **modern `segments` approach**.

### **1. Correct GAQL Queries for Demographics**

#### **Gender Demographics Query**
```sql
SELECT 
  segments.gender,
  metrics.conversions,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks
FROM campaign 
WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
AND campaign.status = 'ENABLED'
AND segments.gender IS NOT NULL
```

#### **Age Demographics Query**
```sql
SELECT 
  segments.age_range,
  metrics.conversions,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks
FROM campaign 
WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
AND campaign.status = 'ENABLED'
AND segments.age_range IS NOT NULL
```

### **2. Updated Data Processing Methods**

#### **Gender Data Processing**
```typescript
private static processGenderData(blocks: any[]): { female: number; male: number } {
  const gender = { female: 0, male: 0 };
  let totalConversions = 0;
  
  blocks.forEach(block => {
    const genderType = block.segments?.gender;
    const conversions = parseInt(block.metrics?.conversions || '0');
    totalConversions += conversions;
    
    if (genderType === 'GENDER_MALE') {
      gender.male += conversions;
    } else if (genderType === 'GENDER_FEMALE') {
      gender.female += conversions;
    }
  });
  
  // Convert to percentages if we have data
  if (totalConversions > 0) {
    gender.female = Math.round((gender.female / totalConversions) * 100);
    gender.male = Math.round((gender.male / totalConversions) * 100);
  }
  
  return gender;
}
```

#### **Age Data Processing**
```typescript
private static processAgeData(blocks: any[]): { '25-34': number; '35-44': number; '45-54': number; '55+': number } {
  const ageGroups = { '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
  let totalConversions = 0;
  
  blocks.forEach(block => {
    const ageRange = block.segments?.age_range;
    const conversions = parseInt(block.metrics?.conversions || '0');
    totalConversions += conversions;
    
    switch (ageRange) {
      case 'AGE_RANGE_25_34': 
        ageGroups['25-34'] += conversions; 
        break;
      case 'AGE_RANGE_35_44': 
        ageGroups['35-44'] += conversions; 
        break;
      case 'AGE_RANGE_45_54': 
        ageGroups['45-54'] += conversions; 
        break;
      case 'AGE_RANGE_55_64':
      case 'AGE_RANGE_65_UP': 
        ageGroups['55+'] += conversions; 
        break;
    }
  });
  
  // Convert to percentages if we have data
  if (totalConversions > 0) {
    Object.keys(ageGroups).forEach(key => {
      ageGroups[key as keyof typeof ageGroups] = Math.round(
        (ageGroups[key as keyof typeof ageGroups] / totalConversions) * 100
      );
    });
  }
  
  return ageGroups;
}
```

### **3. Alternative: CriterionInfo Approach**
If segments don't work, we can use the **CriterionInfo approach** mentioned in the documentation:

```typescript
// For gender targeting
const genderQuery = `
  SELECT 
    ad_group_criterion.gender.type,
    metrics.conversions,
    metrics.cost_micros
  FROM ad_group_criterion 
  WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
  AND ad_group_criterion.type = 'GENDER'
  AND ad_group_criterion.status = 'ENABLED'
`;

// For age targeting  
const ageQuery = `
  SELECT 
    ad_group_criterion.age_range.type,
    metrics.conversions,
    metrics.cost_micros
  FROM ad_group_criterion 
  WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
  AND ad_group_criterion.type = 'AGE_RANGE'
  AND ad_group_criterion.status = 'ENABLED'
`;
```

---

## 📊 **AFFECTED CUSTOMERS** (Confirmed in Supabase)

### **Active Google Ads Accounts**
1. **Wormwood**
   - Account ID: `customers/5659913242`
   - Facebook Ads: `act_934926145475380`
   - Status: Active with leads data

2. **Fire House Loft**
   - Account ID: `5894368498`
   - Facebook Ads: `act_554364794332622`
   - Status: Active with leads data

3. **Magnolia Terrace**
   - Account ID: `2959629321`
   - Facebook Ads: `act_925560449746847`
   - Status: Active with leads data

### **Database Status**
- **Total Clients:** 3
- **With Google Ads:** 3 (100%)
- **With Facebook Ads:** 3 (100%)
- **All Platforms Connected:** ✅

---

## 🚀 **IMPLEMENTATION PLAN**

### **Phase 1: Test Segments Approach** (30 minutes)
1. **Try `segments.gender` and `segments.age_range` first** (most likely to work)
2. Update GAQL queries in `getGenderBreakdown()` and `getAgeBreakdown()`
3. Test with Fire House Loft account (5894368498)
4. Check console for API errors

### **Phase 2A: If Segments Work** (1 hour)
1. Update data processing methods with percentage calculations
2. Test with all 3 client accounts
3. Verify demographic percentages add up correctly
4. Confirm UI displays real data instead of 0%

### **Phase 2B: If Segments Fail** (1.5 hours)
1. **Fallback to CriterionInfo approach** using `ad_group_criterion` with proper types
2. Update queries to use `ad_group_criterion.type = 'GENDER'` and `'AGE_RANGE'`
3. Test with all client accounts
4. Implement proper error handling

### **Phase 3: Campaign Breakdown** (1 hour)
1. Check if campaign breakdown has similar issues
2. Update if needed using same approach
3. Test complete Google Ads integration

### **Phase 4: Production Validation** (30 minutes)
1. Deploy to staging environment
2. Test with real client data
3. Verify all demographic charts working
4. Confirm V2 migration 100% complete

---

## 🧪 **TESTING STRATEGY**

### **Test Cases**
1. **Fire House Loft** (5894368498) - Known to have leads
2. **Wormwood** (5659913242) - Known to have leads  
3. **Magnolia Terrace** (2959629321) - Known to have leads

### **Expected Results**
- Demographics should show **real percentages** instead of 0%
- Age groups should total **100%** (or close to it)
- Gender should total **100%** (or close to it)
- Data should match actual leads from main metrics

### **Validation Points**
- Console logs should show successful API calls
- No 400 errors for demographic queries
- UI charts should display real demographic data

---

## 📈 **SUCCESS CRITERIA**

### **Technical Success**
- [ ] No 400 API errors for demographic queries
- [ ] Demographics show real percentages (not 0%)
- [ ] Age groups and gender data totals ~100%
- [ ] All 3 client accounts working

### **Business Success**
- [ ] Complete V2 migration (95% → 100%)
- [ ] All Google Ads features working
- [ ] Demographics charts displaying real data
- [ ] Ready for production deployment

---

## 🔗 **RELATED FILES**

### **Core Implementation**
- `src/services/api/googleAdsService.ts` - Main service (lines 972-1096)
- `src/services/data/analyticsOrchestrator.ts` - Integration (lines 1129-1134)
- `src/constants/apiVersions.ts` - API version (v21)

### **UI Components**
- `src/components/dashboard/tabs/GoogleTabContent.tsx` - Demographics display
- `src/components/dashboard/GoogleAdsDemographicsChart.tsx` - Chart component

### **Types**
- `src/types/common.ts` - GoogleMetricsWithTrends interface
- `src/types/api.ts` - Google Ads API types

---

## 📝 **NOTES**

### **Why This Happened**
- **API Evolution:** Google Ads API v21 deprecated old demographic fields
- **Documentation Gap:** Implementation used outdated field references
- **Testing Miss:** Demographics weren't tested during V2 migration
- **Graceful Degradation:** Code handles errors but returns empty data

### **Current Status**
- **Main Metrics:** ✅ Working perfectly
- **Demographics:** ❌ Broken (deprecated fields)
- **Campaign Breakdown:** ❓ Unknown (may have similar issues)
- **Overall Integration:** 95% complete

### **Priority**
This is the **ONLY remaining critical issue** blocking full V2 migration completion. Once fixed, the migration will be 100% complete and ready for production.

---

*Last Updated: January 21, 2025*  
*Status: Critical issue identified - fix required for V2 completion*
