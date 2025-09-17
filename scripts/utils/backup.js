const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const archiver = require('archiver');

class SystemBackup {
  constructor() {
    this.rootDir = process.cwd();
    this.backupDir = path.join(this.rootDir, 'backups');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    this.colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m'
    };
  }

  log(message, color = 'reset') {
    const colorCode = this.colors[color] || this.colors.reset;
    console.log(`${colorCode}${message}${this.colors.reset}`);
  }

  async backup() {
    this.log('💾 SAUVEGARDE SYSTÈME FILESHARE', 'cyan');
    this.log('===============================', 'cyan');
    
    // Créer le dossier de sauvegarde
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    await this.backupDatabase();
    await this.backupFiles();
    await this.backupConfig();
    await this.backupCode();
    await this.cleanOldBackups();
    
    this.log('✅ Sauvegarde terminée!', 'green');
    this.showBackupInfo();
  }

  async backupDatabase() {
    this.log('🗄️  Sauvegarde de la base de données...', 'blue');
    
    try {
      // Vérifier si Docker est en cours d'exécution
      await this.runCommand('docker', ['ps']);
      
      // Sauvegarder PostgreSQL
      const dbBackupFile = path.join(this.backupDir, `database_${this.timestamp}.sql`);
      
      await this.runCommand('docker-compose', [
        'exec', '-T', 'database',
        'pg_dump', '-U', 'fileshare_user', 'fileshare'
      ], null, dbBackupFile);
      
      const stats = fs.statSync(dbBackupFile);
      this.log(`  ✅ Base de données sauvée (${Math.round(stats.size / 1024)}KB)`, 'green');
      
    } catch (error) {
      this.log('  ⚠️  Impossible de sauvegarder la base de données (Docker non disponible)', 'yellow');
    }
  }

  async backupFiles() {
    this.log('📁 Sauvegarde des fichiers utilisateur...', 'blue');
    
    const uploadsDir = path.join(this.rootDir, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      if (files.length > 0) {
        const filesBackup = path.join(this.backupDir, `files_${this.timestamp}.zip`);
        await this.createZipArchive(uploadsDir, filesBackup);
        
        const stats = fs.statSync(filesBackup);
        this.log(`  ✅ ${files.length} fichier(s) sauvé(s) (${Math.round(stats.size / 1024)}KB)`, 'green');
      } else {
        this.log('  ℹ️  Aucun fichier utilisateur à sauvegarder', 'blue');
      }
    } else {
      this.log('  ℹ️  Dossier uploads non trouvé', 'blue');
    }
  }

  async backupConfig() {
    this.log('⚙️  Sauvegarde de la configuration...', 'blue');
    
    const configFiles = [
      '.env',
      'package.json',
      'docker-compose.yml',
      'backend/package.json',
      'frontend/package.json',
      'backend/prisma/schema.prisma'
    ];
    
    const configBackupDir = path.join(this.backupDir, `config_${this.timestamp}`);
    if (!fs.existsSync(configBackupDir)) {
      fs.mkdirSync(configBackupDir, { recursive: true });
    }
    
    let savedCount = 0;
    for (const configFile of configFiles) {
      const sourcePath = path.join(this.rootDir, configFile);
      if (fs.existsSync(sourcePath)) {
        const destPath = path.join(configBackupDir, configFile.replace(/[/\\]/g, '_'));
        fs.copyFileSync(sourcePath, destPath);
        savedCount++;
      }
    }
    
    // Créer un zip de la configuration
    const configZip = path.join(this.backupDir, `config_${this.timestamp}.zip`);
    await this.createZipArchive(configBackupDir, configZip);
    
    // Supprimer le dossier temporaire
    fs.rmSync(configBackupDir, { recursive: true, force: true });
    
    this.log(`  ✅ ${savedCount} fichier(s) de configuration sauvé(s)`, 'green');
  }

  async backupCode() {
    const includeCode = process.argv.includes('--code');
    if (!includeCode) {
      this.log('⏭️  Code source non inclus (utilisez --code pour l\'inclure)', 'yellow');
      return;
    }

    this.log('💻 Sauvegarde du code source...', 'blue');
    
    const codeBackup = path.join(this.backupDir, `code_${this.timestamp}.zip`);
    
    // Créer une archive du code source (sans node_modules, logs, etc.)
    const output = fs.createWriteStream(codeBackup);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      const stats = fs.statSync(codeBackup);
      this.log(`  ✅ Code source sauvé (${Math.round(stats.size / 1024 / 1024)}MB)`, 'green');
    });
    
    archive.pipe(output);
    
    // Ajouter les fichiers en excluant certains dossiers
    archive.glob('**/*', {
      cwd: this.rootDir,
      ignore: [
        'node_modules/**',
        'backend/node_modules/**',
        'frontend/node_modules/**',
        'backend/dist/**',
        'frontend/dist/**',
        'uploads/**',
        'logs/**',
        'backups/**',
        '.git/**',
        '**/.cache/**',
        '**/coverage/**'
      ]
    });
    
    await archive.finalize();
  }

  async createZipArchive(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  async cleanOldBackups() {
    this.log('🧹 Nettoyage des anciennes sauvegardes...', 'blue');
    
    if (!fs.existsSync(this.backupDir)) return;
    
    const files = fs.readdirSync(this.backupDir);
    const backupFiles = files.filter(file => 
      file.match(/\d{4}-\d{2}-\d{2}/) && 
      (file.endsWith('.sql') || file.endsWith('.zip'))
    );
    
    // Garder seulement les 7 dernières sauvegardes de chaque type
    const types = ['database', 'files', 'config', 'code'];
    let deletedCount = 0;
    
    for (const type of types) {
      const typeFiles = backupFiles
        .filter(file => file.startsWith(type))
        .sort()
        .reverse();
      
      // Supprimer les anciens (garder les 7 derniers)
      const filesToDelete = typeFiles.slice(7);
      for (const file of filesToDelete) {
        fs.unlinkSync(path.join(this.backupDir, file));
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.log(`  ✅ ${deletedCount} ancienne(s) sauvegarde(s) supprimée(s)`, 'green');
    } else {
      this.log('  ℹ️  Aucune ancienne sauvegarde à supprimer', 'blue');
    }
  }

  showBackupInfo() {
    this.log('📊 RÉSUMÉ DE LA SAUVEGARDE', 'cyan');
    this.log('=========================', 'cyan');
    
    if (!fs.existsSync(this.backupDir)) return;
    
    const files = fs.readdirSync(this.backupDir);
    const todayBackups = files.filter(file => file.includes(this.timestamp));
    
    let totalSize = 0;
    this.log('📁 Fichiers créés aujourd\'hui:', 'blue');
    
    for (const file of todayBackups) {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      
      const sizeStr = stats.size > 1024 * 1024 
        ? `${Math.round(stats.size / 1024 / 1024)}MB`
        : `${Math.round(stats.size / 1024)}KB`;
        
      this.log(`  📄 ${file} (${sizeStr})`, 'green');
    }
    
    const totalSizeStr = totalSize > 1024 * 1024 
      ? `${Math.round(totalSize / 1024 / 1024)}MB`
      : `${Math.round(totalSize / 1024)}KB`;
      
    this.log(`💾 Taille totale: ${totalSizeStr}`, 'cyan');
    this.log(`📍 Emplacement: ${this.backupDir}`, 'cyan');
  }

  async runCommand(command, args, cwd = null, outputFile = null) {
    return new Promise((resolve, reject) => {
      const options = { 
        stdio: outputFile ? ['ignore', 'pipe', 'pipe'] : 'ignore',
        shell: true 
      };
      
      if (cwd) {
        options.cwd = cwd;
      }
      
      const child = spawn(command, args, options);
      
      if (outputFile && child.stdout) {
        const writeStream = fs.createWriteStream(outputFile);
        child.stdout.pipe(writeStream);
      }
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
  }
}

// Exécuter la sauvegarde si appelé directement
if (require.main === module) {
  const backup = new SystemBackup();
  
  console.log('Options disponibles:');
  console.log('  --code    : Inclure le code source dans la sauvegarde');
  console.log('');
  
  backup.backup().catch(error => {
    console.error('Erreur lors de la sauvegarde:', error);
    process.exit(1);
  });
}

module.exports = SystemBackup;
