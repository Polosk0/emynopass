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
import DenseSpiderWebBackground from './DenseSpiderWebBackground';

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
  const [activeTab, setActiveTab] = useState<'stats' | 'files' | 'users' | 'manage-users' | 'storage'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
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

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
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
    } else if (activeTab === 'users' || activeTab === 'manage-users') {
      fetchUsers();
    } else if (activeTab === 'storage') {
      fetchStorageData();
    }
  }, [activeTab, token]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      <DenseSpiderWebBackground />
      <div className="glass-card rounded-lg shadow p-6 relative z-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Panel d'Administration</h2>
        <div className="flex space-x-2">
          <button
            onClick={cleanupExpiredFiles}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Nettoyer</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        {[
          { key: 'stats', label: 'Statistiques', icon: BarChart3 },
          { key: 'files', label: 'Fichiers', icon: Files },
          { key: 'users', label: 'Utilisateurs', icon: Users },
          { key: 'manage-users', label: 'Gestion Utilisateurs', icon: UserCog },
          { key: 'storage', label: 'Stockage', icon: HardDrive },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === key
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-300 hover:text-gray-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Cartes statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Utilisateurs</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.users.total}</p>
                  <p className="text-blue-700 text-sm">{stats.users.active} actifs, {stats.users.admins} admins</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Fichiers</p>
                  <p className="text-2xl font-bold text-green-900">{stats.files.total}</p>
                  <p className="text-green-700 text-sm">{formatFileSize(stats.files.totalSize)}</p>
                </div>
                <Files className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Fichiers expirés</p>
                  <p className="text-2xl font-bold text-red-900">{stats.files.expired}</p>
                  <p className="text-red-700 text-sm">À nettoyer</p>
                </div>
                <Clock className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Graphique des uploads */}
          <div className="bg-gray-800/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Uploads des 7 derniers jours</h3>
            <div className="space-y-2">
              {stats.uploads.map((day, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-200 font-medium">{formatDate(day.date)}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-white">{day.count} fichiers</span>
                    <span className="text-sm text-gray-300">{formatFileSize(day.size)}</span>
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((day.count / Math.max(...stats.uploads.map(u => u.count))) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Tous les fichiers ({files.length})</h3>
            <button
              onClick={fetchFiles}
              className="px-3 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fichier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Taille</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Uploadé</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Expire</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                {files.map((file) => (
                  <tr key={file.id} className={file.isExpired ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{file.originalName}</div>
                        <div className="text-sm text-gray-300">{file.mimetype}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-white">{file.userName || 'N/A'}</div>
                        <div className="text-sm text-gray-300">{file.userEmail || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatDate(file.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {file.expiresAt ? (
                        <span className={`text-sm ${file.isExpired ? 'text-red-600 font-medium' : 'text-white'}`}>
                          {formatDate(file.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">Jamais</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <a
                        href={`${API_BASE_URL}${file.url}`}
                        className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => deleteFile(file.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Tous les utilisateurs ({users.length})</h3>
            <button
              onClick={fetchUsers}
              className="px-3 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rôle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Créé le</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{user.name || 'N/A'}</div>
                        <div className="text-sm text-gray-300">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'ADMIN' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'manage-users' && (
        <UserManagement
          users={users}
          onUserCreated={fetchUsers}
          onUserUpdated={fetchUsers}
          onUserDeleted={fetchUsers}
        />
      )}

      {activeTab === 'storage' && (
        <div className="space-y-6">
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
    </div>
  );
};

export default AdminPanel;
