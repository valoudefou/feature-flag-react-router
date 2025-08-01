import { Flagship, LogLevel } from '@flagship.io/js-sdk';
import { logStore } from './logStore';

/**
 * Initializes Flagship and returns a visitor instance
 * @param {Object} options
 * @param {string} options.visitorId - Unique ID of the visitor
 * @param {Object} options.context - Context object (e.g., usage, device, etc.)
 * @param {boolean} options.authenticated - Whether the visitor is authenticated
 * @returns {Promise<import('@flagship.io/js-sdk').VisitorInstance>}
 */
const customLog = {
  emergency(message, tag) {
    this.log(LogLevel.EMERGENCY, message, tag);
  },

  alert(message, tag) {
    this.log(LogLevel.ALERT, message, tag);
  },

  critical(message, tag) {
    this.log(LogLevel.CRITICAL, message, tag);
  },

  error(message, tag) {
    this.log(LogLevel.ERROR, message, tag);
  },

  warning(message, tag) {
    this.log(LogLevel.WARNING, message, tag);
  },

  notice(message, tag) {
    this.log(LogLevel.NOTICE, message, tag);
  },

  info(message, tag) {
    this.log(LogLevel.INFO, message, tag);
  },

  debug(message, tag) {
    this.log(LogLevel.DEBUG, message, tag);
  },

  log(level, message, tag) {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      level: LogLevel[level],
      message,
      tag,
    };
    console.log(`[${logEntry.level}] [${tag}] : ${message}`);
    logStore.addLog(logEntry);
  }
};

export async function initializeFlagship({ visitorId, context = {}, authenticated = false }) {
  Flagship.start(
    process.env.REACT_APP_FS_ENV_ID,
    process.env.REACT_APP_FS_API_KEY,
    {
      fetchNow: false,
      logManager: customLog,
      logLevel: LogLevel.ALL
    }
  );

  const fsVisitor = Flagship.newVisitor({
    visitorId,
    hasConsented: true,
    context
  });

  await fsVisitor.fetchFlags();
  return fsVisitor;
}
