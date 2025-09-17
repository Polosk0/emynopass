import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileIcon,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface FilePreviewProps {
  fileId: string;
  filename: string;
  onClose: () => void;
}

interface PreviewInfo {
  fileId: string;
  filename: string;
  mimetype: string;
  size: number;
  previewType: 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none';
  canPreview: boolean;
  previewUrl: string | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ fileId, filename, onClose }) => {
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
  }, [fileId]);

  const fetchPreviewInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      console.log('Tentative de prévisualisation du fichier:', fileId);

      const response = await fetch(`http://localhost:3001/api/upload/preview-info/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/upload/preview/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/upload/preview/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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
          <p className="text-xs mt-2 text-gray-400">{previewInfo?.mimetype}</p>
        </div>
      );
    }

    switch (previewInfo.previewType) {
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
              <source src={previewUrl} type={previewInfo.mimetype} />
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
              <source src={previewUrl} type={previewInfo.mimetype} />
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl max-h-screen overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isFullscreen ? 'p-0' : ''}`}>
      <div className={`bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-auto ${isFullscreen ? 'rounded-none max-w-none h-full' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            {previewInfo && getFileIcon(previewInfo.mimetype)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {filename}
              </h3>
              {previewInfo && (
                <p className="text-sm text-gray-500">
                  {previewInfo.mimetype} • {formatFileSize(previewInfo.size)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {previewInfo && previewInfo.canPreview && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
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
          <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
