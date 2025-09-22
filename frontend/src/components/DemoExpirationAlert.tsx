import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';

interface DemoExpirationAlertProps {
  demoExpiresAt: string;
  onDismiss?: () => void;
}

const DemoExpirationAlert: React.FC<DemoExpirationAlertProps> = ({ demoExpiresAt, onDismiss }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiration = new Date(demoExpiresAt).getTime();
      const difference = expiration - now;
      
      if (difference > 0) {
        setTimeLeft(difference);
      } else {
        setTimeLeft(0);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [demoExpiresAt]);

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || timeLeft <= 0) {
    return null;
  }

  const isWarning = timeLeft < 5 * 60 * 1000; // 5 minutes
  const isCritical = timeLeft < 2 * 60 * 1000; // 2 minutes

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg transition-all duration-300 ${
      isCritical 
        ? 'bg-red-500/20 border-red-500/50 text-red-300' 
        : isWarning 
        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
        : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
    }`}>
      <div className="flex items-center space-x-3">
        <Clock className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {isCritical ? '⚠️ Compte démo expire bientôt !' : 
             isWarning ? '⏰ Compte démo expire dans' : 
             '🎯 Compte démo temporaire'}
          </p>
          <p className="text-xs opacity-90">
            {isCritical ? 'Votre session va se terminer dans' : 
             isWarning ? 'Temps restant :' : 
             'Temps restant :'} {formatTime(timeLeft)}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DemoExpirationAlert;
