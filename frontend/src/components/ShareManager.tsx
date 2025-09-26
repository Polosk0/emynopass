import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Copy, 
  Eye, 
  EyeOff, 
  Calendar, 
  Download, 
  Trash2, 
  Plus,
  ExternalLink,
  Lock,
  Users,
  Clock
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface ShareItem {
  id: string;
  token: string;
  url: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  maxDownloads?: number;
  downloads: number;
  expiresAt?: string;
  hasPassword: boolean;
  isActive: boolean;
  createdAt: string;
  isExpired: boolean;
}

interface FileItem {
  id: string;
  originalName: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
  expiresAt?: string;
  isExpired: boolean;
}

interface ShareManagerProps {
  files: FileItem[];
  onRefresh: () => void;
}

const ShareManager: React.FC<ShareManagerProps> = ({ files, onRefresh }) => {
  const { token } = useAuthStore();
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    password: '',
    maxDownloads: '',
    expiresInHours: '168' // 7 jours par défaut
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://emynona.cloud';

  const fetchShares = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/share/my-shares`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setShares(data.shares);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des partages:', error);
    }
  };

  useEffect(() => {
    fetchShares();
  }, [token]);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileId) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedFile = files.find(f => f.id === selectedFileId);
      const shareData = {
        fileId: selectedFileId,
        title: formData.title || selectedFile?.originalName,
        description: formData.description || undefined,
        password: formData.password || undefined,
        maxDownloads: formData.maxDownloads ? parseInt(formData.maxDownloads) : undefined,
        expiresInHours: formData.expiresInHours ? parseInt(formData.expiresInHours) : undefined
      };

      const response = await fetch(`${API_BASE_URL}/api/share/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du partage');
      }

      setSuccess(`Lien de partage créé avec succès ! URL: ${data.share.url}`);
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        password: '',
        maxDownloads: '',
        expiresInHours: '168'
      });
      setSelectedFileId('');
      await fetchShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setSuccess('Lien copié dans le presse-papiers !');
    } catch (error) {
      setError('Impossible de copier le lien');
    }
  };

  const handleDeleteShare = async (shareId: string, title: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le partage "${title}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/share/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuccess('Partage supprimé avec succès');
        await fetchShares();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      setError('Erreur lors de la suppression');
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

  const getRemainingTime = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expiré';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}j ${hours}h`;
    return `${hours}h`;
  };

  const availableFiles = files.filter(file => !file.isExpired);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white glow-effect">
          Mes Partages ({shares.length})
        </h3>
      </div>

      {/* Messages */}
      {error && (
        <div className="glass-card border-red-500 rounded-lg p-4 fade-in">
          <p className="text-red-300">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 underline text-sm mt-2 action-button"
          >
            Fermer
          </button>
        </div>
      )}

      {success && (
        <div className="glass-card border-green-500 rounded-lg p-4 fade-in">
          <p className="text-green-300">{success}</p>
          <button 
            onClick={() => setSuccess(null)}
            className="text-green-400 underline text-sm mt-2 action-button"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="glass-card rounded-lg p-6 fade-in">
          <h4 className="text-lg font-medium text-white mb-4 glow-effect">Créer un nouveau partage</h4>

          {availableFiles.length === 0 && (
            <div className="glass-card border-yellow-500 rounded-lg p-4 mb-4">
              <p className="text-yellow-300">
                Aucun fichier disponible pour le partage. Uploadez d'abord des fichiers.
              </p>
            </div>
          )}

          <form onSubmit={handleCreateShare} className="space-y-4">
            <div>
              <label htmlFor="fileSelect" className="form-label">
                Fichier à partager *
              </label>
              <select
                id="fileSelect"
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                required
                className="form-input"
              >
                <option value="">Sélectionner un fichier...</option>
                {availableFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.originalName} ({formatFileSize(file.size)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="form-label">
                  Titre du partage
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                  placeholder="Laisser vide pour utiliser le nom du fichier"
                />
              </div>

              <div>
                <label htmlFor="expiresInHours" className="form-label">
                  Expire dans (heures)
                </label>
                <select
                  id="expiresInHours"
                  value={formData.expiresInHours}
                  onChange={(e) => setFormData({ ...formData, expiresInHours: e.target.value })}
                  className="form-input"
                >
                  <option value="1">1 heure</option>
                  <option value="24">24 heures</option>
                  <option value="168">7 jours</option>
                  <option value="720">30 jours</option>
                  <option value="">Jamais</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Mot de passe (optionnel)
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="form-input"
                  placeholder="Laisser vide pour pas de mot de passe"
                />
              </div>

              <div>
                <label htmlFor="maxDownloads" className="form-label">
                  Limite de téléchargements
                </label>
                <input
                  id="maxDownloads"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.maxDownloads}
                  onChange={(e) => setFormData({ ...formData, maxDownloads: e.target.value })}
                  className="form-input"
                  placeholder="Laisser vide pour illimité"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="form-label">
                Description (optionnelle)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="form-input"
                placeholder="Description du partage..."
              />
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading || !selectedFileId}
                className={`px-6 py-2 rounded-lg font-medium text-white action-button ${
                  loading || !selectedFileId
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                {loading ? 'Création...' : 'Créer le partage'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 btn-secondary action-button"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des partages */}
      <div className="space-y-4">
        {shares.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-lg">
            <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucun partage</h3>
            <p className="text-gray-300 mb-4">
              Créez votre premier lien de partage pour commencer.
            </p>
            {availableFiles.length > 0 && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 btn-primary action-button"
              >
                Créer un partage
              </button>
            )}
          </div>
        ) : (
          shares.map((share) => (
            <div key={share.id} className={`glass-card rounded-lg p-6 fade-in ${
              share.isExpired ? 'border-red-500' : 'border-gray-600'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-white mb-2 glow-effect">
                    {share.title}
                  </h4>
                  {share.description && (
                    <p className="text-gray-300 text-sm mb-2">{share.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>📁 {share.fileName}</span>
                    <span>📊 {formatFileSize(share.fileSize)}</span>
                    <span>📅 {formatDate(share.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {share.hasPassword && <Lock className="h-4 w-4 text-yellow-400" />}
                  {share.maxDownloads && <Users className="h-4 w-4 text-indigo-400" />}
                  {share.expiresAt && <Clock className="h-4 w-4 text-orange-400" />}
                </div>
              </div>

              <div className="glass-card p-3 rounded-lg mb-4 border-gray-600">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-300 flex-1 mr-4 break-all">
                    {share.url}
                  </code>
                  <button
                    onClick={() => handleCopyLink(share.url)}
                    className="px-3 py-1 glass-card text-indigo-300 rounded text-sm hover:bg-indigo-900/20 flex items-center space-x-1 action-button border-indigo-500"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copier</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1 text-gray-300">
                    <Download className="h-4 w-4" />
                    <span>{share.downloads}</span>
                    {share.maxDownloads && <span>/ {share.maxDownloads}</span>}
                  </span>
                  
                  {share.expiresAt && (
                    <span className={`flex items-center space-x-1 ${
                      share.isExpired ? 'text-red-400' : 'text-orange-400'
                    }`}>
                      <Clock className="h-4 w-4" />
                      <span>
                        {share.isExpired ? 'Expiré' : `Expire dans ${getRemainingTime(share.expiresAt)}`}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={share.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-indigo-400 rounded action-button"
                    title="Ouvrir le lien"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteShare(share.id, share.title)}
                    className="p-2 text-gray-400 hover:text-red-400 rounded action-button"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShareManager;
