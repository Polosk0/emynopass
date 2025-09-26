import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, XCircle, Trash2, Loader2, Clock, Share2, Eye, HardDrive } from 'lucide-react';
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

interface StorageInfo {
  used: number;
  usedFormatted: string;
  max: number;
  maxFormatted: string;
  remaining: number;
  remainingFormatted: string;
  percentage: number;
  maxFileSize: number;
  maxFileSizeFormatted: string;
  isDemo: boolean;
  isAdmin: boolean;
  maxFileCount: number;
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
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [uploadStats, setUploadStats] = useState<{
    currentFile: string;
    fileSize: string;
    speed: string;
    remainingTime: string;
    progress: number;
    filesInQueue: number;
  } | null>(null);

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

  const fetchStorageInfo = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/storage-info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStorageInfo(data);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des infos de stockage:', err);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchUploadedFiles();
    fetchStorageInfo();
  }, [fetchUploadedFiles, fetchStorageInfo]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Debug: afficher les informations de stockage
    console.log('=== DEBUG UPLOAD ===');
    console.log('Storage info:', storageInfo);
    console.log('Is admin:', storageInfo?.isAdmin);
    console.log('Is admin type:', typeof storageInfo?.isAdmin);
    console.log('Max file size:', storageInfo?.maxFileSize);
    console.log('Max file size type:', typeof storageInfo?.maxFileSize);
    console.log('Max file size formatted:', storageInfo?.maxFileSizeFormatted);
    console.log('Accepted files:', acceptedFiles.map(f => ({ name: f.name, size: f.size, sizeFormatted: (f.size / 1024 / 1024 / 1024).toFixed(2) + ' GB' })));
    
    // Les admins n'ont aucune limite côté client
    if (storageInfo?.isAdmin === true) {
      console.log('✅ Admin detected, bypassing file size validation');
      setFilesToUpload(prev => [...prev, ...acceptedFiles]);
      setError(null);
      return;
    }
    
    // Vérification supplémentaire : si maxFileSize est -1, c'est illimité
    if (storageInfo?.maxFileSize === -1) {
      console.log('✅ Unlimited file size detected, bypassing validation');
      setFilesToUpload(prev => [...prev, ...acceptedFiles]);
      setError(null);
      return;
    }
    
    console.log('❌ Validation will be applied');
    
    // Validation côté client pour utilisateurs normaux et démo
    const maxFileSize = storageInfo?.maxFileSize === -1 ? Number.MAX_SAFE_INTEGER : (storageInfo?.maxFileSize || 10 * 1024 * 1024 * 1024);
    const maxFiles = storageInfo?.maxFileCount === -1 ? Number.MAX_SAFE_INTEGER : (storageInfo?.maxFileCount || 10);
    const maxFileSizeFormatted = storageInfo?.maxFileSizeFormatted || '10 GB';
    
    console.log('Validation values:', { maxFileSize, maxFiles, maxFileSizeFormatted });
    console.log('Max file size in GB:', (maxFileSize / 1024 / 1024 / 1024).toFixed(2));
    
    // Vérifier le nombre de fichiers
    if (acceptedFiles.length > maxFiles) {
      setError(`❌ Trop de fichiers sélectionnés. Maximum ${maxFiles} fichier(s) par upload.`);
      return;
    }
    
    const oversizedFiles = acceptedFiles.filter(file => file.size > maxFileSize);
    const validFiles = acceptedFiles.filter(file => file.size <= maxFileSize);
    
    console.log('File validation results:', {
      totalFiles: acceptedFiles.length,
      oversizedFiles: oversizedFiles.length,
      validFiles: validFiles.length,
      maxFileSize,
      maxFileSizeGB: (maxFileSize / 1024 / 1024 / 1024).toFixed(2)
    });
    
    if (oversizedFiles.length > 0) {
      console.log('❌ Oversized files detected:', oversizedFiles.map(f => ({ 
        name: f.name, 
        size: f.size, 
        sizeGB: (f.size / 1024 / 1024 / 1024).toFixed(2),
        maxAllowed: maxFileSize,
        maxAllowedGB: (maxFileSize / 1024 / 1024 / 1024).toFixed(2)
      })));
      
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      setError(`❌ Fichier(s) trop volumineux : ${fileNames}\n\n🔍 Détails :\n${oversizedFiles.map(f => `• ${f.name}: ${formatFileSize(f.size)} (max: ${maxFileSizeFormatted})`).join('\n')}\n\n💡 Conseils :\n• Compressez vos fichiers\n• Utilisez un format plus compact\n• Divisez en plusieurs parties si nécessaire`);
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

    // Debug: afficher les informations des fichiers
    console.log('=== DEBUG UPLOAD START ===');
    console.log('Files to upload:', filesToUpload.map(f => ({
      name: f.name,
      size: f.size,
      sizeMB: (f.size / 1024 / 1024).toFixed(2) + ' MB',
      type: f.type
    })));
    console.log('API Base URL:', API_BASE_URL);
    console.log('Token available:', !!token);

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    const formData = new FormData();
    filesToUpload.forEach(file => {
      formData.append('files', file);
    });

    // Initialiser les statistiques d'upload
    const totalFiles = filesToUpload.length;
    const currentFile = filesToUpload[0];
    const totalSize = filesToUpload.reduce((sum, file) => sum + file.size, 0);
    
    setUploadStats({
      currentFile: currentFile.name,
      fileSize: formatFileSize(currentFile.size),
      speed: '0 MB/s',
      remainingTime: 'Calcul...',
      progress: 0,
      filesInQueue: totalFiles - 1
    });

    try {
      const xhr = new XMLHttpRequest();
      const uploadUrl = `${API_BASE_URL}/api/upload/files`;
      console.log('Upload URL:', uploadUrl);
      
      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      // Optimisations pour gros fichiers
      xhr.timeout = 0; // Pas de timeout
      xhr.withCredentials = false; // Éviter les cookies
      
      console.log('XHR configured, starting upload...');

      let startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
          
          // Debug: afficher le progrès
          if (percent % 10 === 0) { // Log tous les 10%
            console.log(`Upload progress: ${percent}% (${(event.loaded / 1024 / 1024).toFixed(2)} MB / ${(event.total / 1024 / 1024).toFixed(2)} MB)`);
          }
          
          // Calculer la vitesse et le temps restant
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000; // en secondes
          const loadedDiff = event.loaded - lastLoaded;
          
          if (timeDiff > 0.1) { // Mettre à jour toutes les 100ms pour plus de réactivité
            const speed = loadedDiff / timeDiff; // bytes par seconde
            const speedMBps = (speed / (1024 * 1024)).toFixed(1);
            
            const remainingBytes = event.total - event.loaded;
            const remainingTimeSeconds = remainingBytes / speed;
            const remainingMinutes = Math.floor(remainingTimeSeconds / 60);
            const remainingSeconds = Math.floor(remainingTimeSeconds % 60);
            const remainingTimeFormatted = `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            setUploadStats(prev => prev ? {
              ...prev,
              speed: `${speedMBps} MB/s`,
              remainingTime: remainingTimeFormatted,
              progress: percent
            } : null);
            
            lastLoaded = event.loaded;
            lastTime = currentTime;
          }
        }
      };

      xhr.onload = async () => {
        console.log('Upload completed. Status:', xhr.status);
        console.log('Response:', xhr.responseText);
        
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          console.log('Upload success:', result);
          setSuccessMessage(result.message || 'Fichiers uploadés avec succès !');
          setFilesToUpload([]);
          setUploadStats(null);
          onUploadComplete(result.files);
          await fetchUploadedFiles(); // Recharger la liste des fichiers
          await fetchStorageInfo(); // Recharger les infos de stockage
        } else {
          try {
            const errorResult = JSON.parse(xhr.responseText);
            let errorMessage = errorResult.error || errorResult.message || `Erreur lors de l'upload: ${xhr.statusText}`;
            
            // Ajouter des détails spécifiques selon le code d'erreur
            if (xhr.status === 413 || errorResult.code === 'LIMIT_FILE_SIZE') {
              errorMessage = `❌ Fichier trop volumineux !\n\n${errorResult.error || 'La taille du fichier dépasse la limite autorisée de 10 GB.'}\n\n💡 Conseils :\n• Compressez votre fichier\n• Divisez les gros fichiers en plusieurs parties\n• Utilisez un format plus compact`;
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
        setUploadStats(null);
      };

      xhr.onerror = () => {
        console.error('Upload error - network or server issue');
        console.error('XHR status:', xhr.status);
        console.error('XHR statusText:', xhr.statusText);
        console.error('XHR response:', xhr.responseText);
        setError('Erreur réseau ou serveur inaccessible.');
        setUploading(false);
        setUploadProgress(0);
        setUploadStats(null);
      };

      console.log('Sending FormData...');
      xhr.send(formData);
      console.log('FormData sent, waiting for response...');

    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError('Une erreur inattendue est survenue.');
      setUploading(false);
      setUploadProgress(0);
      setUploadStats(null);
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
      await fetchStorageInfo();
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

        {/* Informations de stockage */}
        {storageInfo && (
          <div className="mb-6 glass-card p-4 rounded-lg border border-indigo-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-indigo-400" />
                <span className="text-sm font-semibold text-indigo-300">
                  {storageInfo.isAdmin ? 'Stockage Admin' : storageInfo.isDemo ? 'Stockage Démo' : 'Votre stockage'}
                </span>
                {storageInfo.isAdmin && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                    ADMIN
                  </span>
                )}
                {storageInfo.isDemo && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                    COMPTE DÉMO
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                Limite par fichier: {storageInfo.maxFileSizeFormatted}
              </div>
            </div>
            <div className="space-y-2">
              {!storageInfo.isAdmin && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Utilisé</span>
                    <span className="text-sm font-medium text-white">
                      {storageInfo.usedFormatted} / {storageInfo.maxFormatted}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        storageInfo.percentage > 80
                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                          : storageInfo.percentage > 60
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">
                      {storageInfo.percentage.toFixed(1)}% utilisé
                    </span>
                    <span className="text-green-400">
                      {storageInfo.remainingFormatted} restant
                    </span>
                  </div>
                </>
              )}
              {storageInfo.isAdmin && (
                <div className="text-center py-2">
                  <span className="text-sm text-purple-400 font-medium">
                    🚀 Stockage illimité - Aucune restriction
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      
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
        <p className="text-sm text-gray-400 mt-2">
          {storageInfo?.isAdmin ? (
            <>
              Taille maximale par fichier: Illimité | 
              Nombre de fichiers: Illimité | 
              Expiration: 7 jours
            </>
          ) : (
            <>
              Taille maximale par fichier: {storageInfo?.maxFileSizeFormatted || '10GB'} | 
              Max {storageInfo?.maxFileCount || 10} fichiers | 
              Expiration: 7 jours
            </>
          )}
        </p>
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
        </div>
      )}

      {/* Interface d'upload détaillée */}
      {uploading && uploadStats && (
        <div className="mt-8 glass-card p-6 rounded-xl border border-indigo-500/30 fade-in">
          {/* En-tête avec statut */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white glow-effect">Upload en cours</h3>
                <div className="text-sm text-gray-400">{uploadStats.currentFile}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400 font-medium">Actif</span>
            </div>
          </div>

          {/* Informations principales en une ligne */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4 rounded-lg border border-yellow-500/20 text-center">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </div>
              <div className="text-sm text-yellow-300 mb-1">Destination</div>
              <div className="text-lg font-bold text-white">Emynopass</div>
            </div>

            <div className="glass-card p-4 rounded-lg border border-blue-500/20 text-center">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-sm text-blue-300 mb-1">Queue</div>
              <div className="text-lg font-bold text-white">{uploadStats.filesInQueue + 1} fichier{uploadStats.filesInQueue > 0 ? 's' : ''}</div>
            </div>

            <div className="glass-card p-4 rounded-lg border border-green-500/20 text-center">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-sm text-green-300 mb-1">Vitesse</div>
              <div className="text-lg font-bold text-white">{uploadStats.speed}</div>
            </div>

            <div className="glass-card p-4 rounded-lg border border-red-500/20 text-center">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-sm text-red-300 mb-1">Temps restant</div>
              <div className="text-lg font-bold text-white">{uploadStats.remainingTime}</div>
            </div>
          </div>

          {/* Barre de progression principale */}
          <div className="glass-card p-4 rounded-lg border border-indigo-500/20 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-400">Progression</div>
              <div className="text-2xl font-bold text-white">{uploadStats.progress}%</div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${uploadStats.progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
              <span>{uploadStats.fileSize}</span>
              <span>{uploadStats.filesInQueue > 0 ? `${uploadStats.filesInQueue} fichier${uploadStats.filesInQueue > 1 ? 's' : ''} en attente` : 'Dernier fichier'}</span>
            </div>
          </div>

          {/* Bouton d'annulation */}
          <div className="text-center">
            <button
              onClick={() => {
                setUploading(false);
                setUploadStats(null);
                setUploadProgress(0);
              }}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
            >
              Annuler
            </button>
          </div>
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
