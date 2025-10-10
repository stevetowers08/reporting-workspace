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
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setDate(endDate.getDate() - 365);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

/**
 * Calculate previous period date range based on current period
 */
export function getPreviousDateRange(period: string): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  
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
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Format percentage change with appropriate styling
 */
export function formatPercentageChange(percentage: number): {
  value: string;
  isPositive: boolean;
  isNegative: boolean;
} {
  const rounded = Math.round(percentage * 10) / 10; // Round to 1 decimal place
  const isPositive = rounded > 0;
  const isNegative = rounded < 0;
  
  return {
    value: `${isPositive ? '+' : ''}${rounded}%`,
    isPositive,
    isNegative
  };
}
