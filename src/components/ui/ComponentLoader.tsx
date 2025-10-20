// Shared Component Loader
import React from "react";

export const ComponentLoader: React.FC = () => (
  <div className="h-32 bg-slate-50 rounded-lg">
    <div className="h-full flex items-center justify-center">
      <div className="h-4 w-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  </div>
);
