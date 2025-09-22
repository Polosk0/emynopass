import React, { useState, useEffect } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Users, Database, Zap, HardDrive, Copy, Check } from 'lucide-react';
import CanvasParticleNetwork from './CanvasParticleNetwork';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

interface PublicStats {
  userCount: number;
  totalFiles: number;
  totalSize: number;
  formattedSize: string;
}

interface StorageInfo {
  disk: {
    total: number;
    free: number;
    used: number;
    totalFormatted: string;
    freeFormatted: string;
    usedFormatted: string;
  };
  emynopass: {
    total: number;
    totalFormatted: string;
    fileCount: number;
    percentage: number;
  };
  available: {
    total: number;
    totalFormatted: string;
    percentage: number;
  };
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [copied, setCopied] = useState(false);

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


  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Stocker le token et les informations utilisateur
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('demoExpiresAt', data.demoExpiresAt);
        
        // Rediriger vers l'application
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la création du compte démo');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
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

  const fetchStorageInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/storage`);
      if (response.ok) {
        const data = await response.json();
        setStorageInfo(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infos de stockage:', error);
    }
  };

  const copyDiscordUsername = async () => {
    try {
      await navigator.clipboard.writeText('.polosko');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStorageInfo();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <CanvasParticleNetwork />
      
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

            {/* Barre de stockage serveur */}
            {storageInfo && (
              <div className="mt-6 glass-card p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-medium text-gray-300">Stockage serveur</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {storageInfo.available.totalFormatted} / {storageInfo.disk.totalFormatted}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${storageInfo.available.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-center text-gray-400 mt-2">
                  {storageInfo.available.percentage.toFixed(1)}% disponible
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
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full px-4 py-3 text-sm glass-card text-yellow-300 rounded-lg hover:bg-yellow-900/20 transition-all duration-200 action-button border border-yellow-500 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>🎯</span>
                <span>{loading ? 'Création...' : 'Essayer la démo (30 min)'}</span>
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
                <div className="flex items-center space-x-2">
                  <div className="flex-1 glass-card px-3 py-2 rounded-md border border-gray-600 text-center">
                    <code className="text-sm font-mono text-indigo-400 font-semibold">
                      .polosko
                    </code>
                  </div>
                  <button
                    onClick={copyDiscordUsername}
                    className={`group relative p-2 rounded-lg transition-all duration-200 ${
                      copied 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : 'bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30'
                    }`}
                    title={copied ? 'Copié !' : 'Copier le pseudo Discord'}
                  >
                    <div className={`transition-all duration-200 ${
                      copied ? 'text-green-400' : 'text-indigo-400 group-hover:text-indigo-300'
                    }`}>
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </div>
                    {copied && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                        Copié !
                      </div>
                    )}
                  </button>
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
