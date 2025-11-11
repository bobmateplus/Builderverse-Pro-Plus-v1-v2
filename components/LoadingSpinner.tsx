import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-400"></div>
      <p className="text-slate-300 text-lg">Bob Mate AI is calculating...</p>
    </div>
  );
};

export default LoadingSpinner;
