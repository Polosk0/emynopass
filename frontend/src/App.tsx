import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Upload, Download, Share, Users, Database, Server, LogOut, Settings, Zap } from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import Login from './components/Login';
import FileUpload from './components/FileUpload';
import AdminPanel from './components/AdminPanel';
import PublicShare from './components/PublicShare';
import DenseSpiderWebBackground from './components/DenseSpiderWebBackground';

interface ApiStatus {
  status: string;
  database: string;
  timestamp: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

function App() {
  const { user, isAuthenticated, isLoading, login, logout, checkAuth } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'upload' | 'admin'>('dashboard');
  const location = useLocation();
  
  // Vérifier si c'est une URL de partage public
  const isPublicShare = location.pathname.startsWith('/share/');
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    // Ne pas vérifier l'auth pour les pages publiques
    if (!isPublicShare) {
      checkAuth();
    }
  }, [checkAuth, isPublicShare]);

  useEffect(() => {
    if (isAuthenticated) {
      checkAPI();
    }
  }, [isAuthenticated]);

  const checkAPI = async () => {
    try {
      // Test de l'API
      const healthResponse = await fetch(`${API_BASE_URL}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setApiStatus(healthData);
      }

      // Test des utilisateurs (seulement pour les admins)
      if (user?.role === 'ADMIN') {
        const usersResponse = await fetch(`${API_BASE_URL}/api/users`);
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion API');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token: string, userData: any) => {
    login(token, userData);
    // Rediriger selon le rôle
    if (userData.role === 'ADMIN') {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('upload');
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentPage('dashboard');
  };

  // Gérer les routes publiques
  if (isPublicShare) {
    return (
      <Routes>
        <Route path="/share/:token" element={<PublicShare />} />
      </Routes>
    );
  }

  // Affichage du loading pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden">
        <DenseSpiderWebBackground />
        <div className="glass-card p-8 rounded-2xl shadow-2xl text-center fade-in">
          <div className="text-center">
            <Zap className="h-16 w-16 text-indigo-400 mx-auto mb-4 main-icon glow-effect" />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
            <p className="text-gray-300 text-lg">Chargement d'Emynopass...</p>
          </div>
        </div>
      </div>
    );
  }

  // Affichage de la page de connexion si non authentifié
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
      <div className="min-h-screen bg-gray-950 relative overflow-hidden">
        <DenseSpiderWebBackground />
      
      {/* Header */}
      <header className="glass-card shadow-2xl border-b border-gray-700 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg glow-border">
                <Share className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white glow-effect">Emynopass</h1>
                <p className="text-sm text-gray-400">Connecté en tant que {user?.name || user?.email}</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              {/* Dashboard - Seulement pour les admins */}
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 action-button ${
                    currentPage === 'dashboard'
                      ? 'bg-indigo-600 text-white glow-border'
                      : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/20'
                  }`}
                >
                  <Database className="inline h-4 w-4 mr-2" />
                  Dashboard
                </button>
              )}

              {/* Upload - Pour tous les utilisateurs connectés */}
              <button
                onClick={() => setCurrentPage('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 action-button ${
                  currentPage === 'upload'
                    ? 'bg-indigo-600 text-white glow-border'
                    : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/20'
                }`}
              >
                <Upload className="inline h-4 w-4 mr-2" />
                Upload
              </button>

              {/* Admin - Seulement pour les admins */}
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setCurrentPage('admin')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 action-button ${
                    currentPage === 'admin'
                      ? 'bg-indigo-600 text-white glow-border'
                      : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/20'
                  }`}
                >
                  <Settings className="inline h-4 w-4 mr-2" />
                  Admin
                </button>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {/* Status API */}
              <div className="flex items-center space-x-2">
                {apiStatus ? (
                  <div className="flex items-center space-x-2 text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">API Connectée</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-400">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">API Déconnectée</span>
                  </div>
                )}
              </div>

              {/* Badge rôle */}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                user?.role === 'ADMIN' 
                  ? 'badge-error' 
                  : 'badge-info'
              }`}>
                {user?.role}
              </span>

              {/* Bouton de déconnexion */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200 action-button flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {error && (
          <div className="mb-6 glass-card border-red-500 rounded-lg p-4 fade-in">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-300 font-medium">Erreur: {error}</span>
            </div>
          </div>
        )}

        {/* Rendu conditionnel des pages */}
        {currentPage === 'upload' && (
          <FileUpload onUploadComplete={(files) => {
            console.log('Fichiers uploadés:', files);
          }} />
        )}

        {currentPage === 'admin' && user?.role === 'ADMIN' && (
          <AdminPanel />
        )}

        {currentPage === 'dashboard' && user?.role === 'ADMIN' && (
          <div className="fade-in">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* API Status */}
              <div className="glass-card rounded-lg shadow-2xl p-6 glass-card-hover">
                <div className="flex items-center space-x-3 mb-4">
                  <Server className="h-8 w-8 text-indigo-400 glow-effect" />
                  <h3 className="text-lg font-semibold text-white">API Status</h3>
                </div>
                {apiStatus ? (
                  <div className="space-y-2">
                    <p className="text-green-400 font-medium">✅ {apiStatus.status}</p>
                    <p className="text-sm text-gray-400">
                      Dernière vérification: {new Date(apiStatus.timestamp).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-red-400 font-medium">❌ Non connectée</p>
                )}
              </div>

              {/* Database Status */}
              <div className="glass-card rounded-lg shadow-2xl p-6 glass-card-hover">
                <div className="flex items-center space-x-3 mb-4">
                  <Database className="h-8 w-8 text-green-400 glow-effect" />
                  <h3 className="text-lg font-semibold text-white">Base de Données</h3>
                </div>
                {apiStatus ? (
                  <div className="space-y-2">
                    <p className="text-green-400 font-medium">✅ SQLite connectée</p>
                    <p className="text-sm text-gray-400">{users.length} utilisateur(s)</p>
                  </div>
                ) : (
                  <p className="text-red-400 font-medium">❌ Non connectée</p>
                )}
              </div>

              {/* Users */}
              <div className="glass-card rounded-lg shadow-2xl p-6 glass-card-hover">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="h-8 w-8 text-purple-400 glow-effect" />
                  <h3 className="text-lg font-semibold text-white">Utilisateurs</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                  <p className="text-sm text-gray-400">comptes créés</p>
                </div>
              </div>
            </div>

            {/* Welcome Section */}
            <div className="glass-card rounded-lg shadow-2xl p-8 mb-8 glass-card-hover">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-4 glow-effect">
                  🎉 Panel d'Administration Emynopass
                </h2>
                <p className="text-lg text-gray-300 mb-6">
                  Bienvenue {user?.name}, vous avez accès au panel d'administration.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center p-4 glass-card rounded-lg">
                    <Upload className="h-12 w-12 text-indigo-400 mx-auto mb-3 glow-effect" />
                    <h3 className="font-semibold text-white mb-2">Upload</h3>
                    <p className="text-sm text-gray-400">Gérez vos fichiers avec expiration automatique (7 jours)</p>
                  </div>
                  
                  <div className="text-center p-4 glass-card rounded-lg">
                    <Settings className="h-12 w-12 text-green-400 mx-auto mb-3 glow-effect" />
                    <h3 className="font-semibold text-white mb-2">Administration</h3>
                    <p className="text-sm text-gray-400">Surveillez et gérez tous les fichiers et utilisateurs</p>
                  </div>
                  
                  <div className="text-center p-4 glass-card rounded-lg">
                    <Database className="h-12 w-12 text-purple-400 mx-auto mb-3 glow-effect" />
                    <h3 className="font-semibold text-white mb-2">Base de données</h3>
                    <p className="text-sm text-gray-400">SQLite avec nettoyage automatique des fichiers expirés</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Users List */}
            {users.length > 0 && (
              <div className="glass-card rounded-lg shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white">Utilisateurs du système</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 glass-card rounded-lg">
                        <div>
                          <p className="font-medium text-white">{user.name || 'Sans nom'}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'ADMIN' 
                              ? 'badge-error' 
                              : 'badge-info'
                          }`}>
                            {user.role}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            Créé: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Redirection automatique pour les utilisateurs non-admin */}
        {currentPage === 'dashboard' && user?.role !== 'ADMIN' && (
          <div className="glass-card rounded-lg shadow-2xl p-8 text-center fade-in glass-card-hover">
            <div className="mb-6">
              <div className="glass-card p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center glow-border">
                <Upload className="h-10 w-10 text-indigo-400 glow-effect" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 glow-effect">Bienvenue {user?.name} !</h2>
              <p className="text-gray-300 mb-4">
                Vous êtes connecté en tant qu'utilisateur. Vous pouvez uploader et gérer vos fichiers.
              </p>
              <div className="glass-card p-4 rounded-lg border border-indigo-500 mb-6">
                <p className="text-sm text-indigo-300">
                  💡 <strong>Astuce :</strong> Tous vos fichiers sont automatiquement supprimés après 7 jours pour des raisons de sécurité.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentPage('upload')}
              className="px-8 py-3 btn-primary font-medium flex items-center space-x-2 mx-auto action-button"
            >
              <Upload className="h-5 w-5" />
              <span>Commencer l'Upload</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;