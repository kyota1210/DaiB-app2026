const logger = require('../utils/logger').createLogger('requestLogger');

/**
 * APIリクエストとレスポンスをログに記録するミドルウェア
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    const { method, url, ip } = req;
    
    // ユーザーID（認証済みの場合）
    const userId = req.user ? req.user.id : null;
    
    // リクエスト情報をログに記録
    logger.info(`${method} ${url}`, {
        ip,
        userId,
        userAgent: req.get('user-agent')
    });

    // レスポンスが完了したときにログを記録
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // エラーレスポンスの場合は警告ログとして記録
        if (statusCode >= 400) {
            logger.warn(`${method} ${url} - ${statusCode}`, {
                ip,
                userId,
                statusCode,
                duration: `${duration}ms`
            });
        } else {
            // 成功レスポンスは情報ログとして記録
            logger.info(`${method} ${url} - ${statusCode}`, {
                ip,
                userId,
                statusCode,
                duration: `${duration}ms`
            });
        }
        
        return originalSend.call(this, data);
    };

    next();
}

module.exports = requestLogger;
