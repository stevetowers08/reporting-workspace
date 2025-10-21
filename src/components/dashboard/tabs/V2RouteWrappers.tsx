/**
 * V2 Route Wrappers
 * Extract clientId and dateRange from URL params for V2 components
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { GoogleTabContent } from './GoogleTabContent';
import { LeadsTabContent } from './LeadsTabContent';
import { MetaTabContent } from './MetaTabContent';
import { SummaryTabContent } from './SummaryTabContent';

// Default date range (last 30 days)
const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

export const SummaryTabContentV2Wrapper: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const dateRange = getDefaultDateRange();

  if (!clientId) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p>No client ID provided in URL</p>
        </div>
      </div>
    );
  }

  return <SummaryTabContent clientId={clientId} dateRange={dateRange} />;
};

export const MetaTabContentV2Wrapper: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const dateRange = getDefaultDateRange();

  if (!clientId) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p>No client ID provided in URL</p>
        </div>
      </div>
    );
  }

  return <MetaTabContent clientId={clientId} dateRange={dateRange} />;
};

export const GoogleTabContentV2Wrapper: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const dateRange = getDefaultDateRange();

  if (!clientId) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p>No client ID provided in URL</p>
        </div>
      </div>
    );
  }

  return <GoogleTabContent clientId={clientId} dateRange={dateRange} />;
};

export const LeadsTabContentV2Wrapper: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const dateRange = getDefaultDateRange();

  if (!clientId) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p>No client ID provided in URL</p>
        </div>
      </div>
    );
  }

  return <LeadsTabContent clientId={clientId} dateRange={dateRange} />;
};

