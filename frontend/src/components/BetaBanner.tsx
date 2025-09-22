import React from 'react';

const BetaBanner: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1.5 rounded-full shadow-lg border border-indigo-400/30 backdrop-blur-sm">
        <div className="flex items-center space-x-2 text-xs font-medium">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>V.1.0 Bêta</span>
        </div>
      </div>
    </div>
  );
};

export default BetaBanner;
