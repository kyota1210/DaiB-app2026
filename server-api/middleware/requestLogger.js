const logger = require('../utils/logger').createLogger('requestLogger');

/**
 * APIリクエストとレスポンスをログに記録するミドルウェア
 * アップロード画像（/uploads）の読み込みはログ対象外（件数が多くノイズになるため）
 */
function requestLogger(req, res, next) {
    // 静的ファイル（画像）の配信はログしない
    if (req.path.startsWith('/uploads')) {
        return next();
    }

    // 記録一覧取得はルート側で1行のみログするため、ここではログしない
    if (req.method === 'GET' && req.path === '/api/records') {
        return next();
    }

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
