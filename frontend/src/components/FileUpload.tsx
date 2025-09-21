import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, XCircle, Trash2, Loader2, Clock, Share2, Eye } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import ShareManager from './ShareManager';
import FilePreview from './FilePreview';

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
  expiresAt?: string;
  url: string;
  isExpired: boolean;
}

interface FileUploadProps {
  onUploadComplete: (files: UploadedFile[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const { token } = useAuthStore();
  const [currentTab, setCurrentTab] = useState<'upload' | 'shares'>('upload');
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ id: string; name: string } | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const fetchUploadedFiles = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUploadedFiles(data.files || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des fichiers:', err);
      setError('Impossible de charger vos fichiers. Veuillez vérifier votre connexion.');
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchUploadedFiles();
  }, [fetchUploadedFiles]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validation côté client
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const oversizedFiles = acceptedFiles.filter(file => file.size > maxFileSize);
    const validFiles = acceptedFiles.filter(file => file.size <= maxFileSize);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      setError(`❌ Fichier(s) trop volumineux : ${fileNames}\n\n🔍 Détails :\n${oversizedFiles.map(f => `• ${f.name}: ${formatFileSize(f.size)} (max: 100 MB)`).join('\n')}\n\n💡 Conseils :\n• Compressez vos fichiers\n• Utilisez un format plus compact\n• Divisez en plusieurs parties si nécessaire`);
    }
    
    if (validFiles.length > 0) {
      setFilesToUpload(prev => [...prev, ...validFiles]);
      if (oversizedFiles.length === 0) {
        setError(null);
      }
    }
    
    setSuccessMessage(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleRemoveFile = (fileToRemove: File) => {
    setFilesToUpload(prev => prev.filter(file => file !== fileToRemove));
  };

  const handleUpload = async () => {
    if (filesToUpload.length === 0) {
      setError('Veuillez sélectionner au moins un fichier.');
      return;
    }

    if (!token) {
      setError('Vous devez être connecté pour uploader des fichiers.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    const formData = new FormData();
    filesToUpload.forEach(file => {
      formData.append('files', file);
    });

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/upload/files`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          setSuccessMessage(result.message || 'Fichiers uploadés avec succès !');
          setFilesToUpload([]);
          onUploadComplete(result.files);
          await fetchUploadedFiles(); // Recharger la liste des fichiers
        } else {
          try {
            const errorResult = JSON.parse(xhr.responseText);
            let errorMessage = errorResult.error || errorResult.message || `Erreur lors de l'upload: ${xhr.statusText}`;
            
            // Ajouter des détails spécifiques selon le code d'erreur
            if (xhr.status === 413 || errorResult.code === 'LIMIT_FILE_SIZE') {
              errorMessage = `❌ Fichier trop volumineux !\n\n${errorResult.error || 'La taille du fichier dépasse la limite autorisée de 100 MB.'}\n\n💡 Conseils :\n• Compressez votre fichier\n• Divisez les gros fichiers en plusieurs parties\n• Utilisez un format plus compact`;
            } else if (errorResult.code === 'LIMIT_FILE_COUNT') {
              errorMessage = `❌ Trop de fichiers !\n\n${errorResult.error}\n\n💡 Uploadez maximum 10 fichiers à la fois.`;
            } else if (errorResult.details) {
              errorMessage += `\n\n📋 Limites actuelles :\n• Taille max par fichier : ${errorResult.details.maxFileSize}\n• Nombre max de fichiers : ${errorResult.details.maxFiles}\n• Formats : ${errorResult.details.supportedFormats}`;
            }
            
            setError(errorMessage);
          } catch (parseError) {
            setError(`Erreur lors de l'upload: ${xhr.statusText} (Code: ${xhr.status})`);
          }
        }
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        setError('Erreur réseau ou serveur inaccessible.');
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.send(formData);

    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError('Une erreur inattendue est survenue.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${file?.originalName}" ?`)) {
      return;
    }

    if (!token) {
      setError('Vous devez être connecté pour supprimer des fichiers.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      setSuccessMessage(`Fichier "${file?.originalName}" supprimé avec succès.`);
      await fetchUploadedFiles();
    } catch (err) {
      console.error('Erreur lors de la suppression du fichier:', err);
      setError(`Impossible de supprimer le fichier "${file?.originalName}".`);
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

  return (
    <div className="glass-card rounded-2xl shadow-2xl p-8 fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white glow-effect">Gestion des Fichiers</h2>
        
        {/* Navigation des onglets */}
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentTab('upload')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 action-button ${
              currentTab === 'upload'
                ? 'bg-indigo-600 text-white glow-border'
                : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/20'
            }`}
          >
            <UploadCloud className="inline h-4 w-4 mr-2" />
            Upload
          </button>
          <button
            onClick={() => setCurrentTab('shares')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 action-button ${
              currentTab === 'shares'
                ? 'bg-indigo-600 text-white glow-border'
                : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-900/20'
            }`}
          >
            <Share2 className="inline h-4 w-4 mr-2" />
            Partages
          </button>
        </div>
      </div>
      
      {/* Contenu conditionnel selon l'onglet */}
      {currentTab === 'upload' && (
        <>
          <div className="mb-6 p-4 glass-card border-indigo-500 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              <span className="text-indigo-300 font-medium">Information importante:</span>
            </div>
            <p className="text-gray-300 text-sm mt-2">
              Tous les fichiers sont automatiquement supprimés après 7 jours pour des raisons de sécurité et d'espace de stockage.
            </p>
          </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`upload-box border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200
          ${isDragActive ? 'drag-active' : 'border-gray-600 hover:border-gray-500'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-16 w-16 text-gray-400 mb-4 glow-effect" />
        {isDragActive ? (
          <p className="text-lg text-indigo-300 font-medium">Déposez les fichiers ici...</p>
        ) : (
          <p className="text-lg text-gray-300">Glissez-déposez des fichiers ici, ou <span className="text-indigo-400 font-medium cursor-pointer">cliquez pour sélectionner</span></p>
        )}
        <p className="text-sm text-gray-400 mt-2">Taille maximale par fichier: 100MB | Expiration: 7 jours</p>
      </div>

      {/* Fichiers à uploader */}
      {filesToUpload.length > 0 && (
        <div className="mt-8 border-t border-gray-700 pt-6">
          <h3 className="text-xl font-semibold text-white mb-4">Fichiers en attente d'upload ({filesToUpload.length})</h3>
          <ul className="space-y-3">
            {filesToUpload.map((file, index) => (
              <li key={index} className="flex items-center justify-between glass-card p-4 rounded-md">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-indigo-400 mr-3" />
                  <span className="text-white font-medium">{file.name}</span>
                  <span className="ml-3 text-sm text-gray-400">({formatFileSize(file.size)})</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(file)}
                  className="text-red-400 hover:text-red-300 transition-colors action-button"
                  title="Retirer ce fichier"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`mt-6 w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white action-button
              ${uploading ? 'bg-indigo-400 cursor-not-allowed' : 'btn-primary'}`}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-3" />
                Uploading... ({uploadProgress}%)
              </>
            ) : (
              <>
                <UploadCloud className="h-5 w-5 mr-3" />
                Uploader les fichiers
              </>
            )}
          </button>
          {uploading && (
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="progress-bar progress-bar-shine bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full relative"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Messages de feedback */}
      {error && (
        <div className="mt-8 glass-card border-red-500 text-red-300 px-6 py-4 rounded-lg relative fade-in" role="alert">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-300 mb-2">Erreur d'upload</h3>
              <div className="text-sm whitespace-pre-line leading-relaxed">{error}</div>
            </div>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="mt-8 glass-card border-green-500 text-green-300 px-4 py-3 rounded relative fade-in" role="alert">
          <strong className="font-bold">Succès:</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>
      )}

      {/* Fichiers déjà uploadés */}
      <div className="mt-12 border-t border-gray-700 pt-6">
        <h3 className="text-xl font-semibold text-white mb-4">Vos fichiers uploadés ({uploadedFiles.length})</h3>
        {uploadedFiles.length === 0 ? (
          <p className="text-gray-400">Vous n'avez encore uploadé aucun fichier.</p>
        ) : (
          <ul className="space-y-4">
            {uploadedFiles.map((file) => (
              <li key={file.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-md glass-card ${
                file.isExpired ? 'border-red-500' : 'border-gray-600'
              }`}>
                <div className="flex items-center mb-2 sm:mb-0">
                  <FileText className={`h-5 w-5 mr-3 ${file.isExpired ? 'text-red-400' : 'text-green-400'}`} />
                  <div>
                    <span className="text-white font-medium block">{file.originalName}</span>
                    <div className="text-sm text-gray-400 space-x-4">
                      <span>{formatFileSize(file.size)}</span>
                      <span>Uploadé le {formatDate(file.uploadedAt)}</span>
                      {file.expiresAt && (
                        <span className={file.isExpired ? 'text-red-400 font-medium' : 'text-orange-400'}>
                          {file.isExpired ? '⚠️ Expiré' : `⏰ Expire dans ${getRemainingTime(file.expiresAt)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPreviewFile({ id: file.id, name: file.originalName })}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-300 glass-card hover:bg-green-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 action-button border-green-500"
                    title="Prévisualiser"
                  >
                    <Eye className="h-4 w-4 mr-1" /> Aperçu
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-300 glass-card hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 action-button border-red-500"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
        </>
      )}

      {/* Onglet Partages */}
      {currentTab === 'shares' && (
        <ShareManager 
          files={uploadedFiles} 
          onRefresh={fetchUploadedFiles}
        />
      )}

      {/* Modal de prévisualisation */}
      {previewFile && (
        <FilePreview
          fileId={previewFile.id}
          filename={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default FileUpload;
