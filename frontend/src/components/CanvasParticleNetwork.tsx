import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface CanvasParticleNetworkProps {
  className?: string;
}

const CanvasParticleNetwork: React.FC<CanvasParticleNetworkProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, isActive: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration optimisée pour de meilleures performances
    const config = {
      particleColor: '#818cf8', // Indigo-400 pour s'adapter au thème
      background: '#030712', // Fond très sombre (gray-950)
      interactive: true,
      speed: 3, // Vitesse réduite pour plus de fluidité
      maxDistance: 120, // Distance réduite
      particleSize: 1.5, // Taille légèrement augmentée
      lineWidth: 0.8, // Épaisseur réduite
      particleCount: 150, // Nombre considérablement réduit pour les performances
      lineOpacity: 0.3, // Opacité réduite pour plus de subtilité
      particleOpacity: 0.6 // Opacité augmentée pour plus de visibilité
    };

    // Initialiser les particules
    const initParticles = () => {
      particlesRef.current = [];
      
      for (let i = 0; i < config.particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * config.speed,
          vy: (Math.random() - 0.5) * config.speed,
          size: config.particleSize,
          opacity: Math.random() * config.particleOpacity
        });
      }
    };

    // Redimensionner le canvas
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initParticles();
    };

    // Dessiner un cercle (forme des particules - plus performant)
    const drawCircle = (x: number, y: number, size: number, opacity: number) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = config.particleColor;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // Dessiner une ligne entre deux particules
    const drawLine = (p1: Particle, p2: Particle, opacity: number) => {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(129, 140, 248, ${opacity})`;
      ctx.lineWidth = config.lineWidth;
      ctx.stroke();
    };

    // Calculer la distance entre deux particules
    const getDistance = (p1: Particle, p2: Particle) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Mettre à jour une particule
    const updateParticle = (particle: Particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Sortir par les bords et réapparaître de l'autre côté
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;
    };

    // Animation principale
    const animate = () => {
      // Fond bleu
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mettre à jour et dessiner les particules
      particlesRef.current.forEach((particle, index) => {
        updateParticle(particle);
        drawCircle(particle.x, particle.y, particle.size, particle.opacity);

        // Dessiner les connexions avec les autres particules
        for (let i = index + 1; i < particlesRef.current.length; i++) {
          const otherParticle = particlesRef.current[i];
          const distance = getDistance(particle, otherParticle);

          if (distance < config.maxDistance) {
            const opacity = (1 - (distance / config.maxDistance)) * config.lineOpacity;
            drawLine(particle, otherParticle, opacity);
          }
        }

        // Connexion avec la souris si active (mode grab)
        if (mouseRef.current.isActive) {
          const mouseDistance = getDistance(particle, { x: mouseRef.current.x, y: mouseRef.current.y, vx: 0, vy: 0, size: 0, opacity: 0 });
          if (mouseDistance < config.maxDistance * 1.5) {
            const opacity = (1 - (mouseDistance / (config.maxDistance * 1.5))) * config.lineOpacity * 2;
            drawLine(particle, { x: mouseRef.current.x, y: mouseRef.current.y, vx: 0, vy: 0, size: 0, opacity: 0 }, opacity);
          }
        }
      });

      // Dessiner un point sur la souris si active
      if (mouseRef.current.isActive) {
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = config.particleColor;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Gestionnaires d'événements
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.isActive = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isActive = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (!config.interactive) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Mode push : ajouter une nouvelle particule au point de clic
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed,
        size: config.particleSize,
        opacity: Math.random() * config.particleOpacity
      });

      // Limiter le nombre de particules
      if (particlesRef.current.length > config.particleCount * 2) {
        particlesRef.current.shift();
      }
    };

    // Initialisation
    resizeCanvas();
    animate();

    // Ajouter les écouteurs d'événements
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('resize', resizeCanvas);

    // Nettoyage
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-auto z-0 ${className}`}
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minWidth: '100vw',
        minHeight: '100vh'
      }}
    />
  );
};

export default CanvasParticleNetwork;
