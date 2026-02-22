const fs = require('fs').promises;
const path = require('path');

// ログレベル
const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

// ログディレクトリのパス
const LOG_DIR = path.join(__dirname, '..', 'logs');

// ログディレクトリが存在するか確認し、なければ作成
async function ensureLogDirectory() {
    try {
        await fs.access(LOG_DIR);
    } catch (error) {
        // ディレクトリが存在しない場合は作成
        await fs.mkdir(LOG_DIR, { recursive: true });
    }
}

// 日付ベースのログファイル名を取得
function getLogFileName() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `app-${year}-${month}-${day}.log`;
}

// タイムスタンプをフォーマット
function formatTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// ログメッセージをフォーマット
function formatLogMessage(level, module, message, context = null) {
    const timestamp = formatTimestamp();
    let logLine = `[${timestamp}] [${level}] [${module}] ${message}`;
    
    if (context) {
        // コンテキスト情報をJSON形式で追加
        try {
            const contextStr = JSON.stringify(context);
            logLine += ` ${contextStr}`;
        } catch (error) {
            // JSON化に失敗した場合は文字列として追加
            logLine += ` ${String(context)}`;
        }
    }
    
    return logLine;
}

// ログをファイルに書き込む（非同期）
async function writeToFile(logLine) {
    try {
        await ensureLogDirectory();
        const logFile = path.join(LOG_DIR, getLogFileName());
        await fs.appendFile(logFile, logLine + '\n', 'utf8');
    } catch (error) {
        // ログ書き込みに失敗してもアプリケーションを停止させない
        console.error('ログファイルへの書き込みに失敗しました:', error.message);
    }
}

// ロガークラス
class Logger {
    constructor(module) {
        this.module = module || 'app';
    }

    // エラーログ
    error(message, context = null) {
        const logLine = formatLogMessage(LOG_LEVELS.ERROR, this.module, message, context);
        console.error(logLine);
        writeToFile(logLine);
    }

    // 警告ログ
    warn(message, context = null) {
        const logLine = formatLogMessage(LOG_LEVELS.WARN, this.module, message, context);
        console.warn(logLine);
        writeToFile(logLine);
    }

    // 情報ログ
    info(message, context = null) {
        const logLine = formatLogMessage(LOG_LEVELS.INFO, this.module, message, context);
        console.log(logLine);
        writeToFile(logLine);
    }

    // デバッグログ
    debug(message, context = null) {
        // 本番環境ではDEBUGログを無効化する場合がある
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG === 'true') {
            const logLine = formatLogMessage(LOG_LEVELS.DEBUG, this.module, message, context);
            console.log(logLine);
            writeToFile(logLine);
        }
    }
}

// モジュール用のロガーを作成するファクトリー関数
function createLogger(module) {
    return new Logger(module);
}

// デフォルトロガー（モジュール名が指定されない場合）
const defaultLogger = new Logger('app');

module.exports = defaultLogger;
module.exports.createLogger = createLogger;
module.exports.Logger = Logger;
module.exports.LOG_LEVELS = LOG_LEVELS;
