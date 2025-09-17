import fs from 'fs';
import path from 'path';

class Logger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private writeToFile(level: string, message: string): void {
    const logFile = path.join(this.logDir, `${level}.log`);
    const formattedMessage = this.formatMessage(level, message) + '\n';
    
    fs.appendFileSync(logFile, formattedMessage);
  }

  info(message: string): void {
    const formatted = this.formatMessage('info', message);
    console.log(`\x1b[36m${formatted}\x1b[0m`);
    this.writeToFile('info', message);
  }

  error(message: string, error?: Error): void {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    const formatted = this.formatMessage('error', errorMessage);
    console.error(`\x1b[31m${formatted}\x1b[0m`);
    this.writeToFile('error', errorMessage);
    
    if (error?.stack) {
      this.writeToFile('error', error.stack);
    }
  }

  warn(message: string): void {
    const formatted = this.formatMessage('warn', message);
    console.warn(`\x1b[33m${formatted}\x1b[0m`);
    this.writeToFile('warn', message);
  }

  debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message);
      console.log(`\x1b[35m${formatted}\x1b[0m`);
      this.writeToFile('debug', message);
    }
  }
}

export const logger = new Logger();
