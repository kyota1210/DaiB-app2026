const logger = require('../utils/logger').createLogger('errorHandler');

/**
 * 未処理エラーをキャッチしてログに記録するミドルウェア
 * Expressのエラーハンドリングミドルウェアは4つの引数を持つ必要がある
 */
function errorHandler(err, req, res, next) {
    // エラー情報をログに記録
    const userId = req.user ? req.user.id : null;
    const { method, url, ip } = req;
    
    logger.error('未処理エラーが発生しました', {
        error: err.message,
        stack: err.stack,
        method,
        url,
        ip,
        userId
    });

    // ユーザーには安全なエラーメッセージを返す
    // 本番環境では詳細なエラー情報を隠す
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(err.status || 500).json({
        message: err.message || 'サーバーエラーが発生しました。',
        ...(isDevelopment && { stack: err.stack })
    });
}

module.exports = errorHandler;
