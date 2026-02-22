const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRoutes = require('./authRoutes'); 
const recordsRoutes = require('./recordsRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger').createLogger('server');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// リクエストロガーミドルウェアを追加（ルート定義の前に配置）
app.use(requestLogger);

// 画像ファイルの公開設定
// http://localhost:3000/uploads/filename.jpg でアクセス可能になります
app.use('/uploads', express.static('uploads'));

// 接続テストルート
app.get('/api/test-db', async (req, res) => {
    try {
        // データベースにシンプルなクエリを実行
        const [rows] = await db.query('SELECT 1 + 1 AS solution');
        logger.info('データベース接続成功', { solution: rows[0].solution });
        res.status(200).json({ 
            message: 'データベース接続に成功しました！', 
            solution: rows[0].solution 
        });
    } catch (error) {
        logger.error('データベース接続エラー', { error: error.message, stack: error.stack });
        res.status(500).json({ 
            message: 'データベース接続エラーが発生しました。', 
            error: error.message 
        });
    }
});

// 認証ルート (認証不要)
app.use('/api/auth', authRoutes);

// 記録ルート (認証が必要)
app.use('/api/records', recordsRoutes);

// ユーザールート (認証が必要)
app.use('/api/users', userRoutes);

// カテゴリールート (認証が必要)
app.use('/api/categories', categoryRoutes);

// エラーハンドラーミドルウェアを最後に追加（すべてのルートの後）
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`サーバー起動`, { 
        port: PORT,
        url: `http://0.0.0.0:${PORT}`,
        networkUrl: `http://192.168.1.104:${PORT}`
    });
});