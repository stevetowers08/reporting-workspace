/**
 * V2 Navigation Component
 * Provides easy access to V2 tabs for testing
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';
import { Link, useParams } from 'react-router-dom';

export const V2Navigation: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No client ID found in URL
          </div>
        </CardContent>
      </Card>
    );
  }

  const v2Tabs = [
    {
      name: 'Summary V2',
      path: `/dashboard/v2/summary/${clientId}`,
      description: 'Comprehensive metrics using AnalyticsOrchestrator',
      color: 'bg-blue-50 border-blue-200',
      icon: '📊'
    },
    {
      name: 'Meta V2',
      path: `/dashboard/v2/meta/${clientId}`,
      description: 'Facebook Ads data using new architecture',
      color: 'bg-blue-50 border-blue-200',
      icon: '📘'
    },
    {
      name: 'Google V2',
      path: `/dashboard/v2/google/${clientId}`,
      description: 'Google Ads data using new architecture',
      color: 'bg-green-50 border-green-200',
      icon: '🔍'
    },
    {
      name: 'Leads V2',
      path: `/dashboard/v2/leads/${clientId}`,
      description: 'Lead data using new architecture',
      color: 'bg-purple-50 border-purple-200',
      icon: '👥'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">V2 Architecture Testing</h1>
        <p className="text-gray-600">
          Test the new AnalyticsOrchestrator architecture alongside the existing system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {v2Tabs.map((tab) => (
          <Card key={tab.name} className={`${tab.color} ${tab.comingSoon ? 'opacity-60' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">{tab.icon}</span>
                <span>{tab.name}</span>
                {tab.comingSoon && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {tab.description}
              </p>
              {tab.comingSoon ? (
                <div className="text-sm text-gray-500 italic">
                  Under development
                </div>
              ) : (
                <Link
                  to={tab.path}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Test V2 Tab
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Architecture Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>V2 Architecture Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-600 mb-2">✅ Service Orchestration</h4>
              <p className="text-sm text-gray-600">
                Coordinates existing domain services instead of replacing them. 
                Delegates to FacebookAdsReportingService, GoogleAdsReportingService, etc.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-2">✅ Smart Caching</h4>
              <p className="text-sm text-gray-600">
                Intelligent cache invalidation based on data changes, not time intervals.
                Prevents duplicate API calls across components.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-2">✅ Request Deduplication</h4>
              <p className="text-sm text-gray-600">
                Prevents multiple components from making identical API requests simultaneously.
                Uses React Query's built-in deduplication plus custom caching.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-2">✅ Easy Extensibility</h4>
              <p className="text-sm text-gray-600">
                Simple to add new platforms or chart types. Just add to the orchestrator
                and create new chart hooks.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-2">✅ Zero Risk</h4>
              <p className="text-sm text-gray-600">
                Old system remains untouched. V2 runs alongside V1 for testing.
                Can instantly revert if issues arise.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-2">✅ Performance</h4>
              <p className="text-sm text-gray-600">
                Optimized loading states, error handling, and data fetching.
                Better user experience with faster load times.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Info */}
      <Card>
        <CardHeader>
          <CardTitle>V1 vs V2 Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Feature</th>
                  <th className="text-left p-2">V1 (Current)</th>
                  <th className="text-left p-2">V2 (New)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Data Fetching</td>
                  <td className="p-2">Multiple hooks per component</td>
                  <td className="p-2">Centralized orchestrator</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Caching</td>
                  <td className="p-2">Module-level caches</td>
                  <td className="p-2">Smart invalidation</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">API Calls</td>
                  <td className="p-2">Some duplicates</td>
                  <td className="p-2">Deduplicated</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Error Handling</td>
                  <td className="p-2">Basic</td>
                  <td className="p-2">Comprehensive</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Extensibility</td>
                  <td className="p-2">Manual</td>
                  <td className="p-2">Easy</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Testing</td>
                  <td className="p-2">Production only</td>
                  <td className="p-2">Side-by-side</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link
              to={`/dashboard/${clientId}`}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to V1 Dashboard
            </Link>
            <a
              href="/health"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Health Check
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

