/**
 * Date utility functions for calculating date ranges and periods
 */

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Calculate date range based on period
 */
export function getDateRange(period: string): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '14d':
      startDate.setDate(endDate.getDate() - 14);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'lastMonth': {
      // Last month: e.g., if today is Oct 10th, show Sep 1st to Sep 30th
      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      startDate.setTime(lastMonth.getTime());
      endDate.setTime(lastMonthEnd.getTime());
      break;
    }
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setDate(endDate.getDate() - 365);
      break;
    default: {
      // Default to last month instead of last 30 days
      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      startDate.setTime(lastMonth.getTime());
      endDate.setTime(lastMonthEnd.getTime());
      break;
    }
  }
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

/**
 * Calculate previous period date range based on current period
 */
export function getPreviousDateRange(period: string, currentDateRange?: DateRange): DateRange {
  // If currentDateRange is provided, use it as the base for calculation
  // Otherwise, use today's date as the base
  const baseDate = currentDateRange ? new Date(currentDateRange.end) : new Date();
  const endDate = new Date(baseDate);
  const startDate = new Date(baseDate);
  
  switch (period) {
    case '7d':
      // Previous 7 days before current 7 days
      endDate.setDate(endDate.getDate() - 7);
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '14d':
      // Previous 14 days before current 14 days
      endDate.setDate(endDate.getDate() - 14);
      startDate.setDate(endDate.getDate() - 14);
      break;
    case '30d':
      // Previous 30 days before current 30 days
      endDate.setDate(endDate.getDate() - 30);
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'lastMonth': {
      // Previous month: e.g., if current is Sep 1-30, show Aug 1-31
      const previousMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      startDate.setTime(previousMonth.getTime());
      endDate.setTime(previousMonthEnd.getTime());
      break;
    }
    case '90d':
      // Previous 90 days before current 90 days
      endDate.setDate(endDate.getDate() - 90);
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      // Previous year before current year
      endDate.setDate(endDate.getDate() - 365);
      startDate.setDate(endDate.getDate() - 365);
      break;
    default:
      // Default to previous 30 days
      endDate.setDate(endDate.getDate() - 30);
      startDate.setDate(endDate.getDate() - 30);
  }
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null; // Return null when previous is 0 to show dash
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Format percentage change with appropriate styling
 */
export function formatPercentageChange(percentage: number | null): {
  value: string;
  isPositive: boolean;
  isNegative: boolean;
} | null {
  if (percentage === null) {
    return null;
  }
  
  const rounded = Math.round(percentage * 10) / 10; // Round to 1 decimal place
  const isPositive = rounded > 0;
  const isNegative = rounded < 0;
  
  return {
    value: `${isPositive ? '+' : ''}${rounded}%`,
    isPositive,
    isNegative
  };
}
