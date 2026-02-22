const jwt = require('jsonwebtoken');
const logger = require('../utils/logger').createLogger('auth');
const JWT_SECRET = process.env.JWT_SECRET;

const auth = (req, res, next) => {
    // 1. リクエストヘッダーからトークンを取得
    // 形式は "Bearer <token>" を想定
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: '認証トークンが提供されていません。' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        // 2. トークンの検証
        // トークンが秘密鍵で署名され、有効期限が切れていないかチェック
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 3. ユーザー情報をリクエストオブジェクトに格納
        // デコードされた情報には、ログイン時にJWTに含めた user id が含まれています
        req.user = decoded; 
        
        // 4. 次の処理（APIルートのロジック）へ進む
        next(); 
    } catch (error) {
        logger.warn('認証エラー', { 
            error: error.message,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        // トークンが無効または期限切れの場合
        res.status(401).json({ message: '無効なトークンです。再ログインが必要です。' });
    }
};

module.exports = auth;