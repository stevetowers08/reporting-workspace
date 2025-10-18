import React from 'react';

interface TabErrorBoundaryProps {
  children: React.ReactNode;
  tabName: string;
}

export const TabErrorBoundary: React.FC<TabErrorBoundaryProps> = ({ children, tabName }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error(`Error in ${tabName} tab:`, event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [tabName]);

  if (hasError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-2">Error loading {tabName} tab</div>
        <button 
          onClick={() => setHasError(false)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
