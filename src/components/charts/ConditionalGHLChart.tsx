/**
 * Conditional GHL Chart Wrapper
 * Simple pattern: Only loads GHL data when the component is actually rendered
 * This prevents unnecessary API calls when GHL charts aren't being used
 */

import React from 'react';

interface ConditionalGHLChartProps {
  children: React.ReactNode;
  locationId?: string;
  hasGHLAccount?: boolean;
}

export const ConditionalGHLChart: React.FC<ConditionalGHLChartProps> = ({ 
  children, 
  locationId, 
  hasGHLAccount 
}) => {
  // Simple condition: only render if we have a GHL account configured
  const shouldRender = hasGHLAccount && locationId && locationId !== 'none';
  
  if (!shouldRender) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>GoHighLevel integration not configured</p>
        <p className="text-sm">Connect your GHL account to see this data</p>
      </div>
    );
  }
  
  return <>{children}</>;
};
