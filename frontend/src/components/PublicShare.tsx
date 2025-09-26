import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Download, 
  Lock, 
  FileText, 
  Calendar, 
  Users, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import PublicFilePreview from './PublicFilePreview';
import CanvasParticleNetwork from './CanvasParticleNetwork';

interface ShareData {
  token: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimetype: string;
  hasPassword: boolean;
  downloads: number;
  maxDownloads?: number;
  expiresAt?: string;
  createdAt: string;
}

const PublicShare: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://emynona.cloud';

  useEffect(() => {
    if (token) {
      fetchShareData();
    }
  }, [token]);

  const fetchShareData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/share/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement du partage');
      }

      setShareData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareData) return;

    try {
      setDownloading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/share/${token}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: shareData.hasPassword ? password : undefined
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du téléchargement');
      }

      // Créer un lien de téléchargement
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = shareData.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Téléchargement commencé !');
      
      // Recharger les données pour mettre à jour le compteur
      setTimeout(fetchShareData, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setDownloading(false);
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
      month: 'long',
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
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.startsWith('video/')) return '🎥';
    if (mimetype.startsWith('audio/')) return '🎵';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📽️';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) return '📦';
    return '📁';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden">
        <CanvasParticleNetwork />
        <div className="glass-card p-8 rounded-2xl shadow-2xl text-center fade-in">
          <div className="text-center">
            <Zap className="h-16 w-16 text-indigo-400 mx-auto mb-4 main-icon glow-effect" />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
            <p className="text-gray-300 text-lg">Chargement du partage...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !shareData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        <CanvasParticleNetwork />
        <div className="max-w-md w-full glass-card rounded-2xl shadow-2xl p-8 text-center fade-in">
          <div className="glass-card p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center glow-border">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4 glow-effect">Partage non trouvé</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 btn-primary action-button"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  if (!shareData) return null;

  const isExpired = shareData.expiresAt && new Date(shareData.expiresAt) < new Date();
  const isDownloadLimitReached = shareData.maxDownloads && shareData.downloads >= shareData.maxDownloads;
  const canDownload = !isExpired && !isDownloadLimitReached;

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4 relative overflow-hidden">
      <CanvasParticleNetwork />
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <div className="glass-card p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center glow-border">
            <Download className="h-8 w-8 text-indigo-400 glow-effect" />
          </div>
          <h1 className="text-3xl font-bold text-white glow-effect">Emynopass</h1>
          <p className="text-gray-400 mt-2">Partage de fichier sécurisé</p>
        </div>

        {/* Main Content */}
        <div className="glass-card rounded-2xl shadow-2xl overflow-hidden fade-in">
          {/* File Info Header */}
          <div className="glass-card px-6 py-4 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">
                {getFileIcon(shareData.mimetype)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">
                  {shareData.title}
                </h2>
                {shareData.description && (
                  <p className="text-gray-300 text-sm mt-1">
                    {shareData.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File Details */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-2 text-gray-300">
                <FileText className="h-4 w-4" />
                <span className="text-sm">
                  {shareData.fileName}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Eye className="h-4 w-4" />
                <span className="text-sm">
                  {formatFileSize(shareData.fileSize)}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  {shareData.downloads} téléchargement{shareData.downloads !== 1 ? 's' : ''}
                  {shareData.maxDownloads && ` / ${shareData.maxDownloads}`}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {formatDate(shareData.createdAt)}
                </span>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-3 mb-6">
              {shareData.hasPassword && (
                <div className="flex items-center space-x-2 text-yellow-300 glass-card px-3 py-2 rounded-lg border-yellow-500">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Ce fichier est protégé par mot de passe</span>
                </div>
              )}

              {shareData.expiresAt && (
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg glass-card ${
                  isExpired 
                    ? 'text-red-300 border-red-500' 
                    : 'text-orange-300 border-orange-500'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    {isExpired 
                      ? 'Ce partage a expiré' 
                      : `Expire dans ${getRemainingTime(shareData.expiresAt)}`
                    }
                  </span>
                </div>
              )}

              {isDownloadLimitReached && (
                <div className="flex items-center space-x-2 text-red-300 glass-card px-3 py-2 rounded-lg border-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Limite de téléchargements atteinte</span>
                </div>
              )}
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-4 glass-card border-red-500 rounded-lg p-4 fade-in">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <p className="text-red-300">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 glass-card border-green-500 rounded-lg p-4 fade-in">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <p className="text-green-300">{success}</p>
                </div>
              </div>
            )}

            {/* Download Form */}
            {canDownload ? (
              <form onSubmit={handleDownload} className="space-y-4">
                {shareData.hasPassword && (
                  <div>
                    <label htmlFor="password" className="form-label">
                      Mot de passe requis
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="form-input"
                      placeholder="Entrez le mot de passe..."
                    />
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="flex-1 btn-primary action-button"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Prévisualiser</span>
                    </div>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={downloading || (shareData.hasPassword && !password)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 action-button ${
                      downloading || (shareData.hasPassword && !password)
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'btn-primary'
                    }`}
                  >
                    {downloading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Téléchargement...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Download className="h-5 w-5" />
                        <span>Télécharger</span>
                      </div>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Téléchargement non disponible
                </h3>
                <p className="text-gray-300">
                  {isExpired && 'Ce partage a expiré.'}
                  {isDownloadLimitReached && 'La limite de téléchargements a été atteinte.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 fade-in">
          <p className="text-gray-400 text-sm">
            Propulsé par <span className="font-semibold text-indigo-400 glow-effect">Emynopass</span>
          </p>
        </div>
      </div>

      {/* Modal de prévisualisation */}
      {showPreview && shareData && token && (
        <PublicFilePreview
          shareToken={token}
          filename={shareData.fileName}
          mimetype={shareData.mimetype}
          fileSize={shareData.fileSize}
          onClose={() => setShowPreview(false)}
          onDownload={() => {
            setShowPreview(false);
            // Déclencher le téléchargement
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          }}
          password={password}
          hasPassword={shareData.hasPassword}
        />
      )}
    </div>
  );
};

export default PublicShare;
