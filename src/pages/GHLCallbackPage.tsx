import React from 'react';

export const GHLCallbackPage: React.FC = () => {
  console.log('GHL Callback Page - Component loaded!');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            GHL Callback Page
          </h1>
          <p className="text-gray-600">
            This page should process the OAuth callback.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Check console for logs.
          </p>
        </div>
      </div>
    </div>
  );
};