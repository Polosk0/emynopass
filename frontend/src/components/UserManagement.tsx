import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Crown, Shield, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import CanvasParticleNetwork from './CanvasParticleNetwork';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  isDemo?: boolean;
  isTemporaryDemo?: boolean;
  demoExpiresAt?: string;
  createdAt: string;
}

interface UserManagementProps {
  users: User[];
  onUserCreated: () => void;
  onUserUpdated: () => void;
  onUserDeleted: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onUserCreated, onUserUpdated, onUserDeleted }) => {
  const { token } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cleaningExpired, setCleaningExpired] = useState(false);

  // Mise à jour du temps toutes les minutes pour rafraîchir l'affichage
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Mise à jour toutes les minutes

    return () => clearInterval(interval);
  }, []);

  // Fonction pour calculer le temps restant avant expiration
  const getTimeUntilExpiration = (demoExpiresAt: string): string => {
    const expirationDate = new Date(demoExpiresAt).getTime();
    const now = new Date().getTime();
    const difference = expirationDate - now;
    
    if (difference <= 0) {
      return 'Expiré';
    }

    const minutes = Math.floor(difference / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}min`;
    } else {
      return `${minutes}min`;
    }
  };

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'USER' as 'USER' | 'ADMIN'
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Fonction pour supprimer les comptes démo expirés
  const cleanExpiredDemoAccounts = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer tous les comptes démo expirés ? Cette action est irréversible.')) {
      return;
    }

    setCleaningExpired(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/cleanup/expired-demo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression des comptes expirés');
      }

      const result = await response.json();
      setSuccess(`✅ ${result.deletedCount} compte(s) démo expiré(s) supprimé(s) avec succès.`);
      onUserDeleted(); // Rafraîchir la liste des utilisateurs
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression des comptes expirés');
    } finally {
      setCleaningExpired(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'USER'
    });
    setShowCreateForm(false);
    setEditingUser(null);
    setError(null);
    setSuccess(null);
    setShowPassword(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      setSuccess(`Utilisateur "${data.user.name}" créé avec succès !`);
      resetForm();
      onUserCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    setError(null);

    try {
      const updateData: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la modification');
      }

      setSuccess(`Utilisateur "${formData.name}" modifié avec succès !`);
      resetForm();
      onUserUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.name}" ?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      setSuccess(`Utilisateur "${user.name}" supprimé avec succès !`);
      onUserDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role as 'USER' | 'ADMIN'
    });
    setShowCreateForm(true);
  };

  const isLeader = (user: User) => user.email === 'polosko@emynopass.dev';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      <CanvasParticleNetwork />
      <div className="space-y-6 relative z-10">
      {/* Header avec bouton d'ajout */}
      <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <UserPlus className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Gestion des Utilisateurs
              </h3>
              <p className="text-sm text-gray-400">
                {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={cleanExpiredDemoAccounts}
              disabled={cleaningExpired}
              className="group relative px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 flex items-center space-x-3 transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <div className="p-1 bg-white/20 rounded-lg">
                  {cleaningExpired ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </div>
                <span className="font-semibold">
                  {cleaningExpired ? 'Suppression...' : 'Nettoyer comptes expirés'}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="group relative px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 flex items-center space-x-3 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <div className="p-1 bg-white/20 rounded-lg">
                  <UserPlus className="h-4 w-4" />
                </div>
                <span className="font-semibold">Nouvel utilisateur</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-700 rounded-lg p-4">
          <p className="text-green-300">{success}</p>
        </div>
      )}

      {/* Formulaire de création/modification */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl animate-fade-in-up">
            {/* En-tête du formulaire */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <UserPlus className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">
                    {editingUser ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Ajoutez un nouvel utilisateur à votre plateforme'}
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nom complet */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-300">
                    Nom complet
                  </label>
                  <div className="relative">
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder-gray-400"
                      placeholder="Ex: Jean Dupont"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-300">
                    Adresse email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder-gray-400"
                      placeholder="jean@exemple.com"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-300">
                    {editingUser ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600/50 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 placeholder-gray-400"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Rôle */}
                <div className="space-y-2">
                  <label htmlFor="role" className="block text-sm font-semibold text-gray-300">
                    Rôle utilisateur
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'USER' | 'ADMIN' })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="USER">👤 Utilisateur standard</option>
                      <option value="ADMIN">👑 Administrateur</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations sur les rôles */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-blue-500/20 rounded-lg">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-sm">
                    <p className="text-blue-300 font-medium mb-1">À propos des rôles :</p>
                    <ul className="text-blue-200/80 space-y-1">
                      <li>• <strong>Utilisateur :</strong> Accès standard aux fonctionnalités</li>
                      <li>• <strong>Administrateur :</strong> Accès complet au panel d'administration</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700/50">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-600/50 text-gray-300 rounded-xl hover:bg-gray-600/70 hover:text-white transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 flex items-center space-x-2 ${
                    loading
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-indigo-500/25'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Traitement...</span>
                    </>
                  ) : (
                    <>
                      {editingUser ? (
                        <>
                          <Edit className="h-4 w-4" />
                          <span>Modifier l'utilisateur</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span>Créer l'utilisateur</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste des utilisateurs */}
      <div className="glass-card rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-800/30 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-700/50">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-700/50">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-700/50">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-700/50">
                  Créé le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-700/50">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-700/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/30 backdrop-blur-sm divide-y divide-gray-700/30">
              {users.map((user, index) => (
                <tr key={user.id} className={`${isLeader(user) ? 'bg-yellow-900/20 border-l-4 border-yellow-700/50' : ''} hover:bg-gray-700/30 transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      {isLeader(user) ? (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      ) : user.role === 'ADMIN' ? (
                        <Shield className="h-5 w-5 text-red-500" />
                      ) : (
                        <User className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-white flex items-center space-x-2">
                          <span>{user.name}</span>
                          {isLeader(user) && (
                            <span className="px-2 py-1 text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-600 rounded-full font-bold">
                              👑 LEADER
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-300">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN' 
                        ? 'bg-red-900/50 text-red-300 border border-red-700' 
                        : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                    }`}>
                      {user.role === 'ADMIN' ? '👑 Admin' : '👤 User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-900/50 text-green-300 border border-green-700' 
                        : 'bg-gray-700 text-gray-300 border border-gray-600'
                    }`}>
                      {user.isActive ? '✅ Actif' : '❌ Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.isTemporaryDemo && user.demoExpiresAt ? (
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-600 rounded-full font-medium">
                            🎯 Démo temporaire
                          </span>
                        </div>
                        <div className={`text-xs font-medium ${
                          getTimeUntilExpiration(user.demoExpiresAt) === 'Expiré' 
                            ? 'text-red-400' 
                            : 'text-yellow-400'
                        }`}>
                          {getTimeUntilExpiration(user.demoExpiresAt)}
                        </div>
                      </div>
                    ) : user.isDemo ? (
                      <span className="px-2 py-1 text-xs bg-blue-900/50 text-blue-300 border border-blue-600 rounded-full font-medium">
                        🔑 Démo permanent
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {!isLeader(user) && (
                        <>
                          <button
                            onClick={() => startEdit(user)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {isLeader(user) && (
                        <span className="text-xs text-gray-300 italic">
                          Compte protégé
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};

export default UserManagement;
