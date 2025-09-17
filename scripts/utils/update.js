const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class SystemUpdater {
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

  async update() {
    this.log('🔄 MISE À JOUR SYSTÈME FILESHARE', 'cyan');
    this.log('=================================', 'cyan');
    
    await this.checkGit();
    await this.updateDependencies();
    await this.updateDatabase();
    await this.cleanupOldFiles();
    
    this.log('✅ Mise à jour terminée!', 'green');
  }

  async checkGit() {
    this.log('📡 Vérification des mises à jour...', 'blue');
    
    try {
      // Vérifier si c'est un repo git
      if (!fs.existsSync(path.join(this.rootDir, '.git'))) {
        this.log('  ℹ️  Pas un repository Git, passage à la suite', 'yellow');
        return;
      }

      // Fetch les dernières modifications
      await this.runCommand('git', ['fetch', 'origin']);
      
      // Vérifier s'il y a des mises à jour
      const result = await this.runCommandWithOutput('git', ['rev-list', 'HEAD...origin/main', '--count']);
      const updatesCount = parseInt(result.stdout.trim()) || 0;
      
      if (updatesCount > 0) {
        this.log(`  📥 ${updatesCount} mise(s) à jour disponible(s)`, 'green');
        
        const pullUpdates = process.argv.includes('--pull');
        if (pullUpdates) {
          this.log('  🔄 Application des mises à jour...', 'blue');
          await this.runCommand('git', ['pull', 'origin', 'main']);
          this.log('  ✅ Mises à jour appliquées', 'green');
        } else {
          this.log('  ℹ️  Utilisez --pull pour appliquer les mises à jour', 'yellow');
        }
      } else {
        this.log('  ✅ Aucune mise à jour disponible', 'green');
      }
      
    } catch (error) {
      this.log('  ⚠️  Impossible de vérifier les mises à jour Git', 'yellow');
    }
  }

  async updateDependencies() {
    this.log('📦 Mise à jour des dépendances...', 'blue');
    
    const packages = [
      { name: 'racine', path: this.rootDir },
      { name: 'backend', path: path.join(this.rootDir, 'backend') },
      { name: 'frontend', path: path.join(this.rootDir, 'frontend') }
    ];

    for (const pkg of packages) {
      const packageJsonPath = path.join(pkg.path, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        this.log(`  🔄 Mise à jour ${pkg.name}...`, 'blue');
        
        try {
          // Vérifier les packages obsolètes
          const outdated = await this.runCommandWithOutput('npm', ['outdated', '--json'], pkg.path);
          const outdatedPackages = JSON.parse(outdated.stdout || '{}');
          const outdatedCount = Object.keys(outdatedPackages).length;
          
          if (outdatedCount > 0) {
            this.log(`    📊 ${outdatedCount} package(s) obsolète(s) détecté(s)`, 'yellow');
            
            // Mise à jour automatique des packages mineurs
            if (process.argv.includes('--update-deps')) {
              await this.runCommand('npm', ['update'], pkg.path);
              this.log(`    ✅ Packages mis à jour`, 'green');
            } else {
              this.log(`    ℹ️  Utilisez --update-deps pour mettre à jour`, 'yellow');
            }
          } else {
            this.log(`    ✅ Toutes les dépendances sont à jour`, 'green');
          }
          
        } catch (error) {
          // Si npm outdated échoue, vérifier juste l'installation
          if (!fs.existsSync(path.join(pkg.path, 'node_modules'))) {
            this.log(`    📦 Installation des dépendances manquantes...`, 'yellow');
            await this.runCommand('npm', ['install'], pkg.path);
            this.log(`    ✅ Dépendances installées`, 'green');
          } else {
            this.log(`    ✅ Dépendances présentes`, 'green');
          }
        }
      }
    }
  }

  async updateDatabase() {
    this.log('🗄️  Vérification de la base de données...', 'blue');
    
    const backendPath = path.join(this.rootDir, 'backend');
    const prismaPath = path.join(backendPath, 'prisma');
    
    if (fs.existsSync(prismaPath)) {
      try {
        // Vérifier l'état des migrations
        const migrationsPath = path.join(prismaPath, 'migrations');
        if (fs.existsSync(migrationsPath)) {
          const migrations = fs.readdirSync(migrationsPath);
          this.log(`  📊 ${migrations.length} migration(s) disponible(s)`, 'blue');
        }

        // Générer le client Prisma
        this.log('  🔄 Génération du client Prisma...', 'blue');
        await this.runCommand('npx', ['prisma', 'generate'], backendPath);
        this.log('  ✅ Client Prisma généré', 'green');

        // Appliquer les migrations en mode production
        if (process.argv.includes('--migrate')) {
          this.log('  🔄 Application des migrations...', 'blue');
          await this.runCommand('npx', ['prisma', 'migrate', 'deploy'], backendPath);
          this.log('  ✅ Migrations appliquées', 'green');
        } else {
          this.log('  ℹ️  Utilisez --migrate pour appliquer les migrations', 'yellow');
        }
        
      } catch (error) {
        this.log('  ⚠️  Erreur lors de la mise à jour de la DB', 'yellow');
      }
    } else {
      this.log('  ℹ️  Pas de configuration Prisma trouvée', 'yellow');
    }
  }

  async cleanupOldFiles() {
    this.log('🧹 Nettoyage des anciens fichiers...', 'blue');
    
    const oldFiles = [
      // Anciens fichiers de cache
      path.join(this.rootDir, '.cache'),
      path.join(this.rootDir, 'frontend/.vite'),
      // Anciens builds
      path.join(this.rootDir, 'backend/dist'),
      path.join(this.rootDir, 'frontend/dist'),
      // Logs anciens (plus de 7 jours)
      path.join(this.rootDir, 'logs')
    ];

    let cleaned = 0;
    
    for (const filePath of oldFiles) {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        
        // Pour le dossier logs, nettoyer seulement les anciens fichiers
        if (path.basename(filePath) === 'logs' && stats.isDirectory()) {
          const logFiles = fs.readdirSync(filePath);
          for (const logFile of logFiles) {
            const logPath = path.join(filePath, logFile);
            const logStats = fs.statSync(logPath);
            const ageHours = (Date.now() - logStats.mtime.getTime()) / (1000 * 60 * 60);
            
            if (ageHours > 168) { // 7 jours
              fs.unlinkSync(logPath);
              cleaned++;
            }
          }
        } else if (stats.isDirectory()) {
          await this.removeDirectory(filePath);
          this.log(`  🗑️  Supprimé: ${path.relative(this.rootDir, filePath)}`, 'green');
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      this.log(`  ✅ ${cleaned} élément(s) nettoyé(s)`, 'green');
    } else {
      this.log('  ℹ️  Aucun fichier ancien à nettoyer', 'blue');
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

  async runCommand(command, args, cwd = null) {
    return new Promise((resolve, reject) => {
      const options = { 
        stdio: 'ignore',
        shell: true 
      };
      
      if (cwd) {
        options.cwd = cwd;
      }
      
      const child = spawn(command, args, options);
      
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

  async runCommandWithOutput(command, args, cwd = null) {
    return new Promise((resolve, reject) => {
      const options = { 
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true 
      };
      
      if (cwd) {
        options.cwd = cwd;
      }
      
      const child = spawn(command, args, options);
      
      let stdout = '';
      let stderr = '';
      
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      child.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
      
      child.on('error', reject);
    });
  }
}

// Exécuter la mise à jour si appelé directement
if (require.main === module) {
  const updater = new SystemUpdater();
  
  console.log('Options disponibles:');
  console.log('  --pull         : Appliquer les mises à jour Git');
  console.log('  --update-deps  : Mettre à jour les dépendances npm');
  console.log('  --migrate      : Appliquer les migrations de base de données');
  console.log('');
  
  updater.update().catch(error => {
    console.error('Erreur lors de la mise à jour:', error);
    process.exit(1);
  });
}

module.exports = SystemUpdater;
