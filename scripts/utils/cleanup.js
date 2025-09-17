const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class SystemCleanup {
  constructor() {
    this.rootDir = process.cwd();
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

  async cleanup() {
    this.log('🧹 NETTOYAGE SYSTÈME FILESHARE', 'cyan');
    this.log('================================', 'cyan');
    
    await this.stopProcesses();
    await this.cleanDocker();
    await this.cleanNodeModules();
    await this.cleanLogs();
    await this.cleanTemp();
    
    this.log('✅ Nettoyage terminé!', 'green');
  }

  async stopProcesses() {
    this.log('🛑 Arrêt des processus...', 'blue');
    
    try {
      if (process.platform === 'win32') {
        await this.runCommand('taskkill', ['/f', '/im', 'node.exe', '/t']);
        await this.runCommand('taskkill', ['/f', '/im', 'npm.cmd', '/t']);
      } else {
        await this.runCommand('pkill', ['-f', 'npm run dev']);
        await this.runCommand('pkill', ['-f', 'node.*backend']);
        await this.runCommand('pkill', ['-f', 'node.*frontend']);
      }
      this.log('  ✅ Processus arrêtés', 'green');
    } catch (error) {
      this.log('  ⚠️  Aucun processus à arrêter', 'yellow');
    }
  }

  async cleanDocker() {
    this.log('🐳 Nettoyage Docker...', 'blue');
    
    try {
      // Arrêter les conteneurs
      await this.runCommand('docker-compose', ['down']);
      this.log('  ✅ Conteneurs arrêtés', 'green');
      
      // Nettoyer les volumes (optionnel)
      const cleanVolumes = process.argv.includes('--volumes');
      if (cleanVolumes) {
        await this.runCommand('docker-compose', ['down', '-v']);
        this.log('  ✅ Volumes supprimés', 'green');
      }
      
      // Nettoyer les images orphelines
      await this.runCommand('docker', ['system', 'prune', '-f']);
      this.log('  ✅ Images orphelines supprimées', 'green');
      
    } catch (error) {
      this.log('  ⚠️  Docker non disponible', 'yellow');
    }
  }

  async cleanNodeModules() {
    const cleanDeps = process.argv.includes('--deps');
    if (!cleanDeps) {
      this.log('⏭️  Dépendances conservées (utilisez --deps pour nettoyer)', 'yellow');
      return;
    }

    this.log('📦 Nettoyage des dépendances...', 'blue');
    
    const nodeModulesPaths = [
      path.join(this.rootDir, 'node_modules'),
      path.join(this.rootDir, 'backend/node_modules'),
      path.join(this.rootDir, 'frontend/node_modules')
    ];

    const lockFiles = [
      path.join(this.rootDir, 'package-lock.json'),
      path.join(this.rootDir, 'backend/package-lock.json'),
      path.join(this.rootDir, 'frontend/package-lock.json')
    ];

    // Supprimer node_modules
    for (const modulePath of nodeModulesPaths) {
      if (fs.existsSync(modulePath)) {
        await this.removeDirectory(modulePath);
        this.log(`  ✅ Supprimé: ${path.relative(this.rootDir, modulePath)}`, 'green');
      }
    }

    // Supprimer les lock files
    for (const lockFile of lockFiles) {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        this.log(`  ✅ Supprimé: ${path.relative(this.rootDir, lockFile)}`, 'green');
      }
    }
  }

  async cleanLogs() {
    this.log('📄 Nettoyage des logs...', 'blue');
    
    const logsDir = path.join(this.rootDir, 'logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir);
      let cleaned = 0;
      
      for (const file of logFiles) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        // Garder les logs de moins de 24h
        const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
      
      this.log(`  ✅ ${cleaned} anciens logs supprimés`, 'green');
    }
  }

  async cleanTemp() {
    this.log('🗑️  Nettoyage des fichiers temporaires...', 'blue');
    
    const tempPaths = [
      path.join(this.rootDir, 'backend/dist'),
      path.join(this.rootDir, 'frontend/dist'),
      path.join(this.rootDir, 'frontend/.vite'),
      path.join(this.rootDir, '.cache'),
      path.join(this.rootDir, 'coverage')
    ];

    let cleaned = 0;
    for (const tempPath of tempPaths) {
      if (fs.existsSync(tempPath)) {
        await this.removeDirectory(tempPath);
        this.log(`  ✅ Supprimé: ${path.relative(this.rootDir, tempPath)}`, 'green');
        cleaned++;
      }
    }

    if (cleaned === 0) {
      this.log('  ℹ️  Aucun fichier temporaire à nettoyer', 'blue');
    }
  }

  async removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      if (process.platform === 'win32') {
        await this.runCommand('rmdir', ['/s', '/q', dirPath]);
      } else {
        await this.runCommand('rm', ['-rf', dirPath]);
      }
    }
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { 
        stdio: 'ignore',
        shell: true 
      });
      
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

// Exécuter le nettoyage si appelé directement
if (require.main === module) {
  const cleanup = new SystemCleanup();
  
  console.log('Options disponibles:');
  console.log('  --deps     : Nettoyer les node_modules');
  console.log('  --volumes  : Supprimer les volumes Docker');
  console.log('');
  
  cleanup.cleanup().catch(error => {
    console.error('Erreur lors du nettoyage:', error);
    process.exit(1);
  });
}

module.exports = SystemCleanup;
