import React, { useEffect, useRef, useState } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

const DenseSpiderWebBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [isMouseActive, setIsMouseActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
        setIsMouseActive(true);
      }
    };

    const handleMouseLeave = () => {
      setIsMouseActive(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  // Points fixes pour créer une répartition équitable des toiles d'araignées
  const fixedPoints = [
    // Grille 4x4 - Répartition équitable sur tout l'écran
    
    // Ligne 1 (haut)
    { x: '12%', y: '8%' }, { x: '16%', y: '12%' }, { x: '8%', y: '15%' }, { x: '20%', y: '6%' },
    { x: '14%', y: '18%' }, { x: '22%', y: '10%' }, { x: '6%', y: '20%' }, { x: '24%', y: '4%' },
    
    { x: '37%', y: '8%' }, { x: '41%', y: '12%' }, { x: '33%', y: '15%' }, { x: '45%', y: '6%' },
    { x: '39%', y: '18%' }, { x: '47%', y: '10%' }, { x: '31%', y: '20%' }, { x: '49%', y: '4%' },
    
    { x: '62%', y: '8%' }, { x: '66%', y: '12%' }, { x: '58%', y: '15%' }, { x: '70%', y: '6%' },
    { x: '64%', y: '18%' }, { x: '72%', y: '10%' }, { x: '56%', y: '20%' }, { x: '74%', y: '4%' },
    
    { x: '87%', y: '8%' }, { x: '91%', y: '12%' }, { x: '83%', y: '15%' }, { x: '95%', y: '6%' },
    { x: '89%', y: '18%' }, { x: '97%', y: '10%' }, { x: '81%', y: '20%' }, { x: '99%', y: '4%' },
    
    // Ligne 2 (milieu haut)
    { x: '12%', y: '33%' }, { x: '16%', y: '37%' }, { x: '8%', y: '40%' }, { x: '20%', y: '31%' },
    { x: '14%', y: '43%' }, { x: '22%', y: '35%' }, { x: '6%', y: '45%' }, { x: '24%', y: '29%' },
    
    { x: '37%', y: '33%' }, { x: '41%', y: '37%' }, { x: '33%', y: '40%' }, { x: '45%', y: '31%' },
    { x: '39%', y: '43%' }, { x: '47%', y: '35%' }, { x: '31%', y: '45%' }, { x: '49%', y: '29%' },
    
    { x: '62%', y: '33%' }, { x: '66%', y: '37%' }, { x: '58%', y: '40%' }, { x: '70%', y: '31%' },
    { x: '64%', y: '43%' }, { x: '72%', y: '35%' }, { x: '56%', y: '45%' }, { x: '74%', y: '29%' },
    
    { x: '87%', y: '33%' }, { x: '91%', y: '37%' }, { x: '83%', y: '40%' }, { x: '95%', y: '31%' },
    { x: '89%', y: '43%' }, { x: '97%', y: '35%' }, { x: '81%', y: '45%' }, { x: '99%', y: '29%' },
    
    // Ligne 3 (milieu bas)
    { x: '12%', y: '58%' }, { x: '16%', y: '62%' }, { x: '8%', y: '65%' }, { x: '20%', y: '56%' },
    { x: '14%', y: '68%' }, { x: '22%', y: '60%' }, { x: '6%', y: '70%' }, { x: '24%', y: '54%' },
    
    { x: '37%', y: '58%' }, { x: '41%', y: '62%' }, { x: '33%', y: '65%' }, { x: '45%', y: '56%' },
    { x: '39%', y: '68%' }, { x: '47%', y: '60%' }, { x: '31%', y: '70%' }, { x: '49%', y: '54%' },
    
    { x: '62%', y: '58%' }, { x: '66%', y: '62%' }, { x: '58%', y: '65%' }, { x: '70%', y: '56%' },
    { x: '64%', y: '68%' }, { x: '72%', y: '60%' }, { x: '56%', y: '70%' }, { x: '74%', y: '54%' },
    
    { x: '87%', y: '58%' }, { x: '91%', y: '62%' }, { x: '83%', y: '65%' }, { x: '95%', y: '56%' },
    { x: '89%', y: '68%' }, { x: '97%', y: '60%' }, { x: '81%', y: '70%' }, { x: '99%', y: '54%' },
    
    // Ligne 4 (bas)
    { x: '12%', y: '83%' }, { x: '16%', y: '87%' }, { x: '8%', y: '90%' }, { x: '20%', y: '81%' },
    { x: '14%', y: '93%' }, { x: '22%', y: '85%' }, { x: '6%', y: '95%' }, { x: '24%', y: '79%' },
    
    { x: '37%', y: '83%' }, { x: '41%', y: '87%' }, { x: '33%', y: '90%' }, { x: '45%', y: '81%' },
    { x: '39%', y: '93%' }, { x: '47%', y: '85%' }, { x: '31%', y: '95%' }, { x: '49%', y: '79%' },
    
    { x: '62%', y: '83%' }, { x: '66%', y: '87%' }, { x: '58%', y: '90%' }, { x: '70%', y: '81%' },
    { x: '64%', y: '93%' }, { x: '72%', y: '85%' }, { x: '56%', y: '95%' }, { x: '74%', y: '79%' },
    
    { x: '87%', y: '83%' }, { x: '91%', y: '87%' }, { x: '83%', y: '90%' }, { x: '95%', y: '81%' },
    { x: '89%', y: '93%' }, { x: '97%', y: '85%' }, { x: '81%', y: '95%' }, { x: '99%', y: '79%' },
    
    // Points de liaison pour connecter les zones
    { x: '25%', y: '25%' }, { x: '50%', y: '25%' }, { x: '75%', y: '25%' },
    { x: '25%', y: '50%' }, { x: '50%', y: '50%' }, { x: '75%', y: '50%' },
    { x: '25%', y: '75%' }, { x: '50%', y: '75%' }, { x: '75%', y: '75%' }
  ];

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none"
    >
      {/* Points fixes du réseau */}
      {fixedPoints.map((point, index) => (
        <div
          key={index}
          className="absolute w-1 h-1 bg-indigo-400 rounded-full opacity-75 animate-pulse"
          style={{
            left: point.x,
            top: point.y,
            animationDelay: `${index * 0.01}s`, // Animation plus rapide
            boxShadow: '0 0 6px rgba(129, 140, 248, 0.8)'
          }}
        />
      ))}

      {/* Connexions entre points proches */}
      {fixedPoints.map((point, index) => {
        return fixedPoints.slice(index + 1).map((otherPoint, otherIndex) => {
          // Calculer la distance approximative
          const x1 = parseFloat(point.x);
          const y1 = parseFloat(point.y);
          const x2 = parseFloat(otherPoint.x);
          const y2 = parseFloat(otherPoint.y);
          const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          
          if (distance < 15) { // Distance équilibrée pour des toiles bien visibles
            const opacity = Math.max(0.25, 1 - (distance / 15));
            
            return (
              <div
                key={`connection-${index}-${otherIndex}`}
                className="absolute opacity-30"
                style={{
                  left: point.x,
                  top: point.y,
                  width: `${distance}%`,
                  height: '0.5px', // Lignes équilibrées
                  background: `linear-gradient(90deg, rgba(129, 140, 248, ${opacity}), rgba(99, 102, 241, ${opacity * 0.5}))`,
                  transformOrigin: 'left center',
                  transform: `rotate(${Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI}deg)`,
                  animation: `pulse 1.5s ease-in-out infinite ${(index + otherIndex) * 0.01}s`, // Animation plus rapide
                  boxShadow: `0 0 3px rgba(129, 140, 248, ${opacity * 0.6})`
                }}
              />
            );
          }
          return null;
        });
      })}

      {/* Effet avec la souris */}
      {isMouseActive && (
        <>
          {/* Point central (souris) */}
          <div
            className="absolute w-3 h-3 bg-indigo-400 rounded-full opacity-90 animate-ping"
            style={{
              left: mousePos.x - 6,
              top: mousePos.y - 6,
              boxShadow: '0 0 15px rgba(129, 140, 248, 1)'
            }}
          />

          {/* Connexions depuis la souris vers les points proches */}
          {fixedPoints.map((point, index) => {
            const x = parseFloat(point.x);
            const y = parseFloat(point.y);
            const distance = Math.sqrt(Math.pow(mousePos.x - x, 2) + Math.pow(mousePos.y - y, 2));
            
            if (distance < 100) { // Rayon d'influence équilibré
              const opacity = Math.max(0.4, 1 - (distance / 100));
              
              return (
                <div
                  key={`mouse-connection-${index}`}
                  className="absolute opacity-50"
                  style={{
                    left: mousePos.x,
                    top: mousePos.y,
                    width: distance,
                    height: '1px', // Lignes équilibrées
                    background: `linear-gradient(90deg, rgba(129, 140, 248, ${opacity}), rgba(99, 102, 241, ${opacity * 0.7}))`,
                    transformOrigin: 'left center',
                    transform: `rotate(${Math.atan2(y - mousePos.y, x - mousePos.x) * 180 / Math.PI}deg)`,
                    animation: `fadeIn 0.05s ease-out ${index * 0.002}s both`, // Animation ultra-rapide
                    boxShadow: `0 0 5px rgba(129, 140, 248, ${opacity})`
                  }}
                />
              );
            }
            return null;
          })}

          {/* Cercle de connexion autour de la souris */}
          <div
            className="absolute border border-indigo-400 rounded-full opacity-25 animate-ping"
            style={{
              left: mousePos.x - 70,
              top: mousePos.y - 70,
              width: 140,
              height: 140,
              animationDuration: '1s', // Animation plus rapide
              boxShadow: '0 0 15px rgba(129, 140, 248, 0.3)'
            }}
          />

          {/* Lignes radiales depuis la souris */}
          {Array.from({ length: 8 }, (_, i) => { // Nombre équilibré de lignes radiales
            const angle = (i * 45) * (Math.PI / 180); // 45° d'intervalle
            const length = 90; // Longueur équilibrée
            
            return (
              <div
                key={`radial-${i}`}
                className="absolute opacity-20"
                style={{
                  left: mousePos.x,
                  top: mousePos.y,
                  width: length,
                  height: '0.5px', // Lignes équilibrées
                  background: 'linear-gradient(90deg, rgba(129, 140, 248, 0.5), transparent)',
                  transform: `rotate(${i * 45}deg)`,
                  transformOrigin: 'left center',
                  animation: `fadeIn 0.03s ease-out ${i * 0.005}s both`, // Animation ultra-rapide
                  boxShadow: '0 0 2px rgba(129, 140, 248, 0.2)'
                }}
              />
            );
          })}
        </>
      )}

      {/* Gradient de fond */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/15 via-transparent to-purple-900/15"></div>
      
      {/* Effet de grille subtile */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(129, 140, 248, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129, 140, 248, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}></div>
      </div>
    </div>
  );
};

export default DenseSpiderWebBackground;
