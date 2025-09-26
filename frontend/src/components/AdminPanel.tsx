import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Files, 
  Trash2,
  Download, 
  RefreshCw, 
  BarChart3, 
  Clock,
  HardDrive,
  AlertTriangle,
  UserCog
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import UserManagement from './UserManagement';
import CanvasParticleNetwork from './CanvasParticleNetwork';

interface AdminStats {
  users: {
    total: number;
    active: number;
    admins: number;
  };
  files: {
    total: number;
    expired: number;
    totalSize: number;
  };
  uploads: Array<{
    date: string;
    count: number;
    size: number;
  }>;
}

interface StorageData {
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
    breakdown: {
      files: number;
      filesFormatted: string;
      database: number;
      databaseFormatted: string;
      logs: number;
      logsFormatted: string;
    };
    fileCount: number;
    percentage: number;
  };
  available: {
    total: number;
    totalFormatted: string;
    percentage: number;
  };
}

interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
  expiresAt?: string;
  isExpired: boolean;
  userEmail?: string;
  userName?: string;
  url?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const AdminPanel: React.FC = () => {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'files' | 'manage-users' | 'storage'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState<{
    logs: boolean;
    expired: boolean;
    optimize: boolean;
  }>({
    logs: false,
    expired: false,
    optimize: false
  });
  const [cleanupResults, setCleanupResults] = useState<{
    logs?: any;
    expired?: any;
    optimize?: any;
  }>({});
  const [deleteAllFilesLoading, setDeleteAllFilesLoading] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://emynona.cloud';

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const fetchStorageData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/storage`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données de stockage');
      }

      const data = await response.json();
      setStorageData(data);
    } catch (error) {
      console.error('Erreur récupération stockage:', error);
      setError('Erreur lors de la récupération des données de stockage');
    }
  };

  const cleanupLogs = async () => {
    setCleanupLoading(prev => ({ ...prev, logs: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/cleanup/logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du nettoyage des logs');
      }

      const result = await response.json();
      setCleanupResults(prev => ({ ...prev, logs: result }));
      
      // Rafraîchir les données de stockage
      await fetchStorageData();
    } catch (error) {
      console.error('Erreur nettoyage logs:', error);
      setError('Erreur lors du nettoyage des logs');
    } finally {
      setCleanupLoading(prev => ({ ...prev, logs: false }));
    }
  };

  const cleanupExpiredFiles = async () => {
    setCleanupLoading(prev => ({ ...prev, expired: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/cleanup/expired`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du nettoyage des fichiers expirés');
      }

      const result = await response.json();
      setCleanupResults(prev => ({ ...prev, expired: result }));
      
      // Rafraîchir les données de stockage et les fichiers
      await Promise.all([fetchStorageData(), fetchFiles()]);
    } catch (error) {
      console.error('Erreur nettoyage fichiers expirés:', error);
      setError('Erreur lors du nettoyage des fichiers expirés');
    } finally {
      setCleanupLoading(prev => ({ ...prev, expired: false }));
    }
  };

  const optimizeDatabase = async () => {
    setCleanupLoading(prev => ({ ...prev, optimize: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/cleanup/optimize-db`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'optimisation de la base de données');
      }

      const result = await response.json();
      setCleanupResults(prev => ({ ...prev, optimize: result }));
      
      // Rafraîchir les données de stockage
      await fetchStorageData();
    } catch (error) {
      console.error('Erreur optimisation DB:', error);
      setError('Erreur lors de l\'optimisation de la base de données');
    } finally {
      setCleanupLoading(prev => ({ ...prev, optimize: false }));
    }
  };

  const fetchFiles = async () => {
    setFilesLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des fichiers');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const deleteAllFiles = async () => {
    if (deleteAllConfirmText !== 'CONFIRMER') {
      setError('Veuillez écrire "CONFIRMER" pour confirmer la suppression de tous les fichiers.');
      return;
    }

    setDeleteAllFilesLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/delete-all-files`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression des fichiers');
      }

      const data = await response.json();
      setFiles([]);
      setShowDeleteAllConfirm(false);
      setDeleteAllConfirmText('');
      
      // Recharger les statistiques
      await fetchStats();
      await fetchStorageData();
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setDeleteAllFilesLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des utilisateurs');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await fetchFiles();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'files') {
      fetchFiles();
    } else if (activeTab === 'manage-users') {
      fetchUsers();
    } else if (activeTab === 'storage') {
      fetchStorageData();
    }
  }, [activeTab, token]);

  if (error) {
    return (
      <div className="fade-in">
        <div className="glass-card p-6 rounded-xl border border-red-500/30 m-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Erreur</h3>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                setError(null);
                if (activeTab === 'files') fetchFiles();
                else if (activeTab === 'stats') fetchStats();
                else if (activeTab === 'manage-users') fetchUsers();
                else if (activeTab === 'storage') fetchStorageData();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Navigation interne du panel Admin */}
      <div className="flex items-center justify-center mb-8">
        <nav className="flex items-center space-x-4 bg-gray-800/30 backdrop-blur-sm rounded-lg p-2 border border-gray-700/50">
          {[
            { key: 'stats', label: 'Statistiques', icon: BarChart3 },
            { key: 'files', label: 'Fichiers', icon: Files },
            { key: 'manage-users', label: 'Gestion Utilisateurs', icon: UserCog },
            { key: 'storage', label: 'Stockage', icon: HardDrive },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 action-button flex items-center space-x-2 ${
                activeTab === key
                  ? 'bg-indigo-600 text-white glow-border'
                  : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/20'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="glass-card rounded-lg shadow p-6">


      {/* Contenu des onglets */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-8 bg-transparent">
          {/* En-tête avec titre et icône */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white glow-effect">Tableau de bord</h2>
              <p className="text-gray-400">Vue d'ensemble de votre plateforme Emynopass</p>
            </div>
          </div>

          {/* Cartes statistiques améliorées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Carte Utilisateurs */}
            <div className="group relative glass-card p-6 rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white glow-effect">{stats.users.total}</div>
                    <div className="text-sm text-blue-300">Total</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Actifs</span>
                    <span className="text-sm font-medium text-green-400">{stats.users.active}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Administrateurs</span>
                    <span className="text-sm font-medium text-purple-400">{stats.users.admins}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte Fichiers */}
            <div className="group relative glass-card p-6 rounded-xl border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Files className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white glow-effect">{stats.files.total}</div>
                    <div className="text-sm text-green-300">Fichiers</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Taille totale</span>
                    <span className="text-sm font-medium text-green-400">{formatFileSize(stats.files.totalSize)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Moyenne</span>
                    <span className="text-sm font-medium text-green-400">
                      {stats.files.total > 0 ? formatFileSize(stats.files.totalSize / stats.files.total) : '0 B'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte Fichiers expirés */}
            <div className="group relative glass-card p-6 rounded-xl border border-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white glow-effect">{stats.files.expired}</div>
                    <div className="text-sm text-red-300">Expirés</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Statut</span>
                    <span className="text-sm font-medium text-red-400">À nettoyer</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Pourcentage</span>
                    <span className="text-sm font-medium text-red-400">
                      {stats.files.total > 0 ? Math.round((stats.files.expired / stats.files.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Graphique des uploads amélioré */}
          <div className="glass-card p-8 rounded-xl border border-indigo-500/30">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white glow-effect">Activité des 7 derniers jours</h3>
                <p className="text-sm text-gray-400">Évolution des uploads et du volume de données</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {stats.uploads.map((day, index) => {
                const maxCount = Math.max(...stats.uploads.map(u => u.count));
                const maxSize = Math.max(...stats.uploads.map(u => u.size));
                const countPercentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                const sizePercentage = maxSize > 0 ? (day.size / maxSize) * 100 : 0;
                
                return (
                  <div key={index} className="group p-4 rounded-lg bg-gray-800/30 hover:bg-gray-700/30 transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-400">{index + 1}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-white">{formatDate(day.date)}</span>
                          <div className="text-xs text-gray-400">Jour {index + 1}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{day.count}</div>
                        <div className="text-xs text-gray-400">fichiers</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Barre de progression pour le nombre de fichiers */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-300">Fichiers uploadés</span>
                          <span className="text-xs font-medium text-indigo-400">{day.count} fichiers</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${countPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Barre de progression pour la taille */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-300">Volume de données</span>
                          <span className="text-xs font-medium text-green-400">{formatFileSize(day.size)}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${sizePercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-8 bg-transparent">
          {/* En-tête avec titre et actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Files className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white glow-effect">Gestion des fichiers</h2>
                <p className="text-gray-400">
                  {filesLoading ? 'Chargement...' : `${files.length} fichier${files.length > 1 ? 's' : ''} stocké${files.length > 1 ? 's' : ''} sur la plateforme`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={filesLoading || files.length === 0}
              className="group relative px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 flex items-center space-x-3 transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <div className="p-1 bg-white/20 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </div>
                <span className="font-semibold">Supprimer tout</span>
              </div>
            </button>
          </div>

          {/* État de chargement */}
          {filesLoading && (
            <div className="glass-card p-8 rounded-xl border border-indigo-500/30">
              <div className="flex items-center justify-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Chargement des fichiers...</h3>
                  <p className="text-gray-400">Récupération des données en cours</p>
                </div>
              </div>
            </div>
          )}

          {!filesLoading && (
            <div className="glass-card rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-800/30 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Fichier</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Utilisateur</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Taille</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Uploadé</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Expire</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/30 backdrop-blur-sm divide-y divide-gray-700/30">
                    {files.map((file) => (
                      <tr key={file.id} className={`hover:bg-gray-700/30 transition-colors ${file.isExpired ? 'bg-red-500/5' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                              <Files className="h-4 w-4 text-indigo-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{file.originalName}</div>
                              <div className="text-xs text-gray-400">{file.mimetype}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">{file.userName || 'N/A'}</div>
                          <div className="text-xs text-gray-400">{file.userEmail || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white">{formatFileSize(file.size)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white">{formatDate(file.uploadedAt)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {file.expiresAt ? (
                            <span className={`text-sm ${file.isExpired ? 'text-red-400' : 'text-white'}`}>
                              {formatDate(file.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Jamais</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <a
                              href={`${API_BASE_URL}${file.url}`}
                              className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => deleteFile(file.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {files.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Files className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Aucun fichier</h3>
                  <p className="text-gray-400">Aucun fichier n'a été uploadé sur la plateforme pour le moment.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {activeTab === 'manage-users' && (
        <div className="bg-transparent">
          <UserManagement
            users={users}
            onUserCreated={fetchUsers}
            onUserUpdated={fetchUsers}
            onUserDeleted={fetchUsers}
          />
        </div>
      )}

      {activeTab === 'storage' && (
        <div className="space-y-6 bg-transparent">
          <h3 className="text-lg font-semibold text-white">Gestion du Stockage</h3>
          
          {storageData ? (
            <>
              {/* Informations sur le stockage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stockage utilisé par Emynopass */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Stockage Emynopass</h4>
                    <HardDrive className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Fichiers utilisateurs</span>
                      <span className="text-white font-medium">{storageData.emynopass.breakdown.filesFormatted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Base de données</span>
                      <span className="text-white font-medium">{storageData.emynopass.breakdown.databaseFormatted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Logs système</span>
                      <span className="text-white font-medium">{storageData.emynopass.breakdown.logsFormatted}</span>
                    </div>
                    <div className="border-t border-gray-700 pt-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-white">Total utilisé</span>
                        <span className="text-indigo-400">{storageData.emynopass.totalFormatted}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stockage disponible pour Emynopass */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Espace Disponible</h4>
                    <HardDrive className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Espace total du disque</span>
                      <span className="text-white font-medium">{storageData.disk.totalFormatted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Utilisé par Emynopass</span>
                      <span className="text-white font-medium">{storageData.emynopass.totalFormatted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Espace libre</span>
                      <span className="text-white font-medium">{storageData.available.totalFormatted}</span>
                    </div>
                    <div className="border-t border-gray-700 pt-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-white">Pourcentage utilisé</span>
                        <span className="text-green-400">{storageData.emynopass.percentage.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barre de progression du stockage */}
              <div className="glass-card p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Utilisation du Stockage Emynopass</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">Espace utilisé par Emynopass</span>
                      <span className="text-white">{storageData.emynopass.totalFormatted} / {storageData.disk.totalFormatted} ({storageData.emynopass.percentage.toFixed(2)}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(storageData.emynopass.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0 GB</span>
                      <span>{storageData.available.totalFormatted} disponible</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-400">{storageData.emynopass.totalFormatted}</div>
                      <div className="text-sm text-gray-300">Utilisé</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{storageData.available.totalFormatted}</div>
                      <div className="text-sm text-gray-300">Libre</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{storageData.disk.totalFormatted}</div>
                      <div className="text-sm text-gray-300">Total</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions de nettoyage */}
              <div className="glass-card p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Actions de Nettoyage</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={cleanupLogs}
                    disabled={cleanupLoading.logs}
                    className="p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-center">
                      {cleanupLoading.logs ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto mb-2"></div>
                      ) : (
                        <Trash2 className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      )}
                      <h5 className="text-white font-medium">Nettoyer les logs</h5>
                      <p className="text-gray-300 text-sm">
                        {cleanupResults.logs 
                          ? `Libéré ${cleanupResults.logs.freedSpaceFormatted}` 
                          : `Libérer ~${storageData.emynopass.breakdown.logsFormatted}`
                        }
                      </p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={cleanupExpiredFiles}
                    disabled={cleanupLoading.expired}
                    className="p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-center">
                      {cleanupLoading.expired ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto mb-2"></div>
                      ) : (
                        <Clock className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                      )}
                      <h5 className="text-white font-medium">Fichiers expirés</h5>
                      <p className="text-gray-300 text-sm">
                        {cleanupResults.expired 
                          ? `${cleanupResults.expired.deletedFiles} fichiers supprimés` 
                          : '0 fichiers à supprimer'
                        }
                      </p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={optimizeDatabase}
                    disabled={cleanupLoading.optimize}
                    className="p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-center">
                      {cleanupLoading.optimize ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                      ) : (
                        <RefreshCw className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                      )}
                      <h5 className="text-white font-medium">Optimiser DB</h5>
                      <p className="text-gray-300 text-sm">
                        {cleanupResults.optimize 
                          ? `Libéré ${cleanupResults.optimize.spaceFreedFormatted}` 
                          : 'Compacter la base'
                        }
                      </p>
                    </div>
                  </button>
                </div>
                
                {/* Affichage des résultats */}
                {(cleanupResults.logs || cleanupResults.expired || cleanupResults.optimize) && (
                  <div className="mt-6 space-y-3">
                    {cleanupResults.logs && (
                      <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                          <div>
                            <p className="text-green-300 text-sm font-medium">Logs nettoyés</p>
                            <p className="text-gray-300 text-xs">
                              {cleanupResults.logs.deletedFiles} fichiers supprimés, {cleanupResults.logs.freedSpaceFormatted} libérés
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {cleanupResults.expired && (
                      <div className="p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                          <div>
                            <p className="text-orange-300 text-sm font-medium">Fichiers expirés nettoyés</p>
                            <p className="text-gray-300 text-xs">
                              {cleanupResults.expired.deletedFiles} fichiers supprimés, {cleanupResults.expired.freedSpaceFormatted} libérés
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {cleanupResults.optimize && (
                      <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                          <div>
                            <p className="text-blue-300 text-sm font-medium">Base de données optimisée</p>
                            <p className="text-gray-300 text-xs">
                              Taille réduite de {cleanupResults.optimize.spaceFreedFormatted} 
                              ({cleanupResults.optimize.sizeBeforeFormatted} → {cleanupResults.optimize.sizeAfterFormatted})
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-green-300 font-medium">Espace largement suffisant</h5>
                      <p className="text-gray-300 text-sm">
                        Emynopass utilise seulement {storageData.emynopass.percentage.toFixed(2)}% de l'espace disponible. 
                        Vous avez encore {storageData.available.totalFormatted} libres.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Chargement des données de stockage...</p>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Modal de confirmation pour supprimer tous les fichiers */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-card p-6 rounded-xl border border-red-500/30 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Supprimer tous les fichiers</h3>
                <p className="text-sm text-gray-400">Cette action est irréversible</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-300 text-sm mb-3">
                Vous êtes sur le point de supprimer <strong className="text-white">{files.length} fichier{files.length > 1 ? 's' : ''}</strong> de manière permanente.
              </p>
              <p className="text-red-400 text-sm mb-4">
                ⚠️ Cette action supprimera également tous les partages associés.
              </p>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Pour confirmer, tapez <span className="text-red-400 font-bold">CONFIRMER</span> :
                </label>
                <input
                  type="text"
                  value={deleteAllConfirmText}
                  onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="CONFIRMER"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteAllConfirm(false);
                  setDeleteAllConfirmText('');
                  setError(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                disabled={deleteAllFilesLoading}
              >
                Annuler
              </button>
              <button
                onClick={deleteAllFiles}
                disabled={deleteAllFilesLoading || deleteAllConfirmText !== 'CONFIRMER'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {deleteAllFilesLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Supprimer tout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
