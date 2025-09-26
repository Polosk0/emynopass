import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileIcon,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import CanvasParticleNetwork from './CanvasParticleNetwork';

interface PreviewInfo {
  canPreview: boolean;
  previewType: 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none';
  mimetype: string;
  filename: string;
  fileSize: number;
}

interface PublicFilePreviewProps {
  shareToken: string;
  filename: string;
  mimetype: string;
  fileSize: number;
  onClose: () => void;
  onDownload?: () => void;
  password?: string;
  hasPassword?: boolean;
}

const PublicFilePreview: React.FC<PublicFilePreviewProps> = ({ 
  shareToken, 
  filename, 
  mimetype, 
  fileSize, 
  onClose, 
  onDownload,
  password,
  hasPassword
}) => {
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    fetchPreviewInfo();
    
    // Cleanup function pour libérer les URLs blob
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [shareToken, password, hasPassword]);

  const fetchPreviewInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Tentative de prévisualisation du partage:', shareToken);

      const headers: HeadersInit = {};
      
      // Ajouter le mot de passe si nécessaire
      if (hasPassword && password) {
        headers['X-Share-Password'] = password;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://emynona.cloud';
      const response = await fetch(`${API_BASE_URL}/api/share/preview-info/${shareToken}`, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}: Impossible de récupérer les informations de prévisualisation`);
      }

      const info = await response.json();
      console.log('Informations de prévisualisation:', info);
      setPreviewInfo(info);

      // Pour les fichiers texte, récupérer le contenu
      if (info.previewType === 'text' && info.canPreview) {
        await fetchTextContent();
      }

      // Pour les autres types, charger le blob
      if (info.canPreview && info.previewType !== 'text') {
        try {
          const blobUrl = await fetchPreviewBlob();
          setPreviewUrl(blobUrl);
        } catch (blobError) {
          console.error('Erreur chargement blob:', blobError);
          setError('Impossible de charger le fichier');
        }
      }
    } catch (err) {
      console.error('Erreur prévisualisation:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviewBlob = async (): Promise<string> => {
    try {
      const headers: HeadersInit = {};
      
      // Ajouter le mot de passe si nécessaire
      if (hasPassword && password) {
        headers['X-Share-Password'] = password;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://emynona.cloud';
      const response = await fetch(`${API_BASE_URL}/api/share/preview/${shareToken}`, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (err) {
      throw new Error(`Erreur de chargement: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const fetchTextContent = async (): Promise<void> => {
    try {
      const headers: HeadersInit = {};
      
      // Ajouter le mot de passe si nécessaire
      if (hasPassword && password) {
        headers['X-Share-Password'] = password;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://emynona.cloud';
      const response = await fetch(`${API_BASE_URL}/api/share/preview/${shareToken}`, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      setTextContent(text);
    } catch (err) {
      console.error('Erreur chargement texte:', err);
      setError('Impossible de charger le contenu texte');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <ImageIcon className="h-6 w-6" />;
    if (mimetype.startsWith('video/')) return <Video className="h-6 w-6" />;
    if (mimetype.startsWith('audio/')) return <Music className="h-6 w-6" />;
    if (mimetype === 'application/pdf') return <FileText className="h-6 w-6" />;
    if (mimetype.startsWith('text/')) return <FileText className="h-6 w-6" />;
    return <FileIcon className="h-6 w-6" />;
  };

  const renderPreview = () => {
    if (!previewInfo || !previewInfo.canPreview) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <AlertCircle className="h-16 w-16 mb-4" />
          <p className="text-lg font-medium">Prévisualisation non disponible</p>
          <p className="text-sm">Ce type de fichier ne peut pas être prévisualisé</p>
          <p className="text-xs mt-2 text-gray-400">{previewInfo?.mimetype || mimetype}</p>
        </div>
      );
    }

    const previewType = previewInfo.previewType;

    switch (previewType) {
      case 'image':
        return (
          <div className="flex justify-center">
            <img
              src={previewUrl}
              alt={filename}
              className={`max-w-full max-h-96 object-contain rounded-lg ${isFullscreen ? 'max-h-screen' : ''}`}
              onError={() => setError('Impossible de charger l\'image')}
            />
          </div>
        );

      case 'video':
        return (
          <div className="flex justify-center">
            <video
              controls
              className={`max-w-full max-h-96 rounded-lg ${isFullscreen ? 'max-h-screen' : ''}`}
              onError={() => setError('Impossible de charger la vidéo')}
            >
              <source src={previewUrl} type={mimetype} />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Music className="h-16 w-16 text-blue-500" />
            <audio
              controls
              className="w-full max-w-md"
              onError={() => setError('Impossible de charger l\'audio')}
            >
              <source src={previewUrl} type={mimetype} />
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full">
            <iframe
              src={previewUrl}
              className={`w-full border rounded-lg ${isFullscreen ? 'h-screen' : 'h-96'}`}
              title={`Prévisualisation de ${filename}`}
              onError={() => setError('Impossible de charger le PDF')}
            />
          </div>
        );

      case 'text':
        return (
          <div className={`w-full ${isFullscreen ? 'h-screen' : 'max-h-96'} overflow-auto`}>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-words">
              {textContent || 'Chargement du contenu...'}
            </pre>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileIcon className="h-16 w-16 mb-4" />
            <p>Type de fichier non supporté pour la prévisualisation</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-950 bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-card rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            <span className="ml-3 text-white">Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`glass-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto ${isFullscreen ? 'max-w-none max-h-none h-full w-full rounded-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            {getFileIcon(mimetype)}
            <div>
              <h3 className="text-lg font-semibold text-white truncate max-w-md">
                {filename}
              </h3>
              <p className="text-sm text-gray-300">
                {mimetype} • {formatFileSize(fileSize)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {previewInfo && previewInfo.canPreview && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            )}
            
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Télécharger"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-gray-900/30">
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-400">
              <AlertCircle className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Erreur de prévisualisation</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            renderPreview()
          )}
        </div>

        {/* Footer */}
        {!isFullscreen && (
          <div className="flex justify-end p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-lg">
            <div className="flex space-x-3">
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="action-button px-4 py-2 flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Télécharger</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicFilePreview;
