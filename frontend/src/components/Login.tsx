import React, { useState, useEffect } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Users, Database, Zap } from 'lucide-react';
import DenseSpiderWebBackground from './DenseSpiderWebBackground';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

interface PublicStats {
  userCount: number;
  totalFiles: number;
  totalSize: number;
  formattedSize: string;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur de connexion');
      }

      // Stocker le token et les infos utilisateur
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      onLogin(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@emynopass.dev');
    setPassword('demo2024');
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <DenseSpiderWebBackground />
      
      <div className="max-w-md w-full relative z-10">
        <div className="glass-card rounded-2xl shadow-2xl p-8 fade-in">
          <div className="text-center mb-8">
            <div className="glass-card p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center glow-border">
              <Zap className="h-8 w-8 text-indigo-400 glow-effect" />
            </div>
            <h1 className="text-2xl font-bold text-white glow-effect">Emynopass</h1>
            <p className="text-gray-400 mt-2">Connectez-vous à votre compte</p>
            
            {/* Statistiques publiques */}
            {stats && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="glass-card p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-300">
                      {stats.userCount} utilisateurs
                    </span>
                  </div>
                </div>
                <div className="glass-card p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-300">
                      {stats.formattedSize} stockés
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 glass-card border-red-500 rounded-lg p-4 flex items-center space-x-2 fade-in">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <div className="relative flex items-center">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input pr-12"
                  placeholder="votre@email.com"
                />
                <Mail className="absolute right-4 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Mot de passe
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input pr-12"
                  placeholder="••••••••"
                />
                <Lock className="absolute right-4 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 action-button ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="space-y-4">
              <button
                onClick={fillDemoCredentials}
                className="w-full px-4 py-3 text-sm glass-card text-indigo-300 rounded-lg hover:bg-indigo-900/20 transition-all duration-200 action-button border border-indigo-500 flex items-center justify-center space-x-2"
              >
                <span>🎯</span>
                <span>Essayer la démonstration</span>
              </button>
              
              <div className="glass-card p-4 rounded-lg border border-purple-500">
                <div className="flex items-center space-x-2 mb-2">
                  <span>👤</span>
                  <p className="text-sm font-medium text-purple-300">
                    Créer un compte Emynopass
                  </p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Pour obtenir un compte utilisateur sur cette plateforme de partage de fichiers, 
                  contactez-moi sur Discord :
                </p>
                <div className="glass-card px-3 py-2 rounded-md border border-gray-600 text-center">
                  <code className="text-sm font-mono text-indigo-400 font-semibold">
                    .polosko
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
