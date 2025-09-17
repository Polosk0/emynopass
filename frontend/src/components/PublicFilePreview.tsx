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
import DenseSpiderWebBackground from './DenseSpiderWebBackground';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canPreview, setCanPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    checkPreviewability();
    
    // Cleanup function pour libérer les URLs blob
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [mimetype, previewUrl]);

  const fetchPreviewBlob = async (url: string): Promise<string> => {
    try {
      const headers: HeadersInit = {};
      
      // Ajouter le mot de passe si nécessaire
      if (hasPassword && password) {
        headers['X-Share-Password'] = password;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erreur inconnue');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (err) {
      throw new Error(`Erreur de chargement: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const checkPreviewability = async () => {
    const previewableTypes = [
      'image/', 'text/', 'application/pdf', 'video/', 'audio/',
      'application/json', 'application/xml', 'application/javascript'
    ];
    
    const isPreviewable = previewableTypes.some(type => mimetype.startsWith(type));
    setCanPreview(isPreviewable);
    setLoading(false);

    if (isPreviewable) {
      try {
        // Pour les fichiers texte, récupérer le contenu
        if (mimetype.startsWith('text/') || 
            mimetype === 'application/json' ||
            mimetype === 'application/xml' ||
            mimetype === 'application/javascript') {
          await fetchTextContent();
        } else {
          // Pour les autres types, charger le blob
          const previewUrl = `http://localhost:3001/api/share/preview/${shareToken}`;
          const blobUrl = await fetchPreviewBlob(previewUrl);
          setPreviewUrl(blobUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      }
    }
  };

  const fetchTextContent = async () => {
    try {
      const headers: HeadersInit = {};
      
      // Ajouter le mot de passe si nécessaire
      if (hasPassword && password) {
        headers['X-Share-Password'] = password;
      }

      const response = await fetch(`http://localhost:3001/api/share/preview/${shareToken}`, { headers });
      
      if (response.ok) {
        const content = await response.text();
        setTextContent(content);
      } else {
        setError('Impossible de charger le contenu du fichier');
      }
    } catch (err) {
      setError('Erreur lors du chargement du contenu');
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

  const getPreviewType = (mimetype: string): string => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype === 'application/pdf') return 'pdf';
    if (mimetype.startsWith('text/') || 
        mimetype === 'application/json' ||
        mimetype === 'application/xml' ||
        mimetype === 'application/javascript') return 'text';
    return 'none';
  };

  const renderPreview = () => {
    if (!canPreview) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <AlertCircle className="h-16 w-16 mb-4" />
          <p className="text-lg font-medium">Prévisualisation non disponible</p>
          <p className="text-sm">Ce type de fichier ne peut pas être prévisualisé</p>
          <p className="text-xs mt-2 text-gray-400">{mimetype}</p>
        </div>
      );
    }

    const previewType = getPreviewType(mimetype);

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
      <div className="fixed inset-0 bg-gray-950 bg-opacity-90 flex items-center justify-center z-50 relative overflow-hidden">
        <DenseSpiderWebBackground />
        <div className="glass-card rounded-lg p-8 max-w-4xl max-h-screen overflow-auto relative z-10">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-gray-950 bg-opacity-90 flex items-center justify-center z-50 p-4 relative overflow-hidden ${isFullscreen ? 'p-0' : ''}`}>
      <DenseSpiderWebBackground />
      <div className={`glass-card rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-auto relative z-10 ${isFullscreen ? 'rounded-none max-w-none h-full' : ''}`}>
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
            {canPreview && (
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
          <div className="flex justify-end p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-lg">
            <div className="flex space-x-3">
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
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
