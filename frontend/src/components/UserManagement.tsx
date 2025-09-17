import React, { useState } from 'react';
import { UserPlus, Edit, Trash2, Crown, Shield, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import DenseSpiderWebBackground from './DenseSpiderWebBackground';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
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

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'USER' as 'USER' | 'ADMIN'
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      <DenseSpiderWebBackground />
      <div className="space-y-6 relative z-10">
      {/* Header avec bouton d'ajout */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Gestion des Utilisateurs ({users.length})
        </h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nouvel utilisateur</span>
        </button>
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
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h4 className="text-lg font-medium text-white mb-4">
            {editingUser ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}
          </h4>

          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Jean Dupont"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="jean@exemple.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {editingUser ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Rôle
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'USER' | 'ADMIN' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="USER">👤 Utilisateur</option>
                  <option value="ADMIN">👑 Administrateur</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium text-white ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Traitement...' : (editingUser ? 'Modifier' : 'Créer')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des utilisateurs */}
      <div className="bg-gray-800/50 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Créé le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/50 divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className={isLeader(user) ? 'bg-yellow-900/20 border border-yellow-700/50' : ''}>
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
