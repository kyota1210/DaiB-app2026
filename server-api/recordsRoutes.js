const express = require('express');
const router = express.Router();
const RecordModel = require('./models/RecordModel');
const auth = require('./middleware/auth');
const multer = require('multer');
const path = require('path');
const logger = require('./utils/logger').createLogger('recordsRoutes');

// Multerの設定
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // 保存先
    },
    filename: function (req, file, cb) {
        // ファイル名重複防止のためタイムスタンプを付与
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// すべてのルートで認証ミドルウェアを適用
router.use(auth);

// ------------------------------------------------
// 1. 記録の作成 (Create)
// POST /api/records
// ------------------------------------------------
// Multerのエラーハンドリングを追加するためにラッパー関数を使用
router.post('/', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            logger.error('Multer Error', { 
                error: err.message, 
                stack: err.stack,
                userId: req.user ? req.user.id : null 
            });
            return res.status(400).json({ message: '画像のアップロードに失敗しました。', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    // req.body が undefined または null の場合のガード
    if (!req.body) {
        return res.status(400).json({ message: 'リクエストデータが読み取れませんでした。' });
    }

    const { title, description, date_logged, category_id } = req.body;
    const user_id = req.user.id;

    // 要件: 日付のみ必須
    if (!date_logged) {
        return res.status(400).json({ message: '日付は必須です。' });
    }

    // タイトル未入力時はデフォルト値を設定
    const recordTitle = typeof title === 'string' && title.trim() ? title : '';
    const recordDescription = typeof description === 'string' ? description : '';

    // 画像パスの生成（相対パス）
    let imageUrl = null;
    if (req.file) {
        imageUrl = `uploads/${req.file.filename}`;
    }

    try {
        const recordId = await RecordModel.create({
            userId: user_id,
            title: recordTitle,
            description: recordDescription,
            dateLogged: date_logged,
            imageUrl,
            categoryId: category_id || null
        });

        logger.info('記録作成成功', { 
            recordId, 
            userId: user_id,
            categoryId: category_id || null 
        });
        
        res.status(201).json({ 
            message: '記録が作成されました。',
            recordId,
            imageUrl // クライアントには保存した相対パスを返す
        });
    } catch (error) {
        logger.error('記録作成エラー', { 
            error: error.message, 
            stack: error.stack,
            userId: user_id 
        });
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ------------------------------------------------
// 2. 記録の取得 (Read) - 自分の記録を全て取得
// GET /api/records
// クエリパラメータ: category_id (オプション)
// ------------------------------------------------
router.get('/', async (req, res) => {
    const user_id = req.user.id; // 自分のIDのみを使用
    const category_id = req.query.category_id; // カテゴリーフィルター

    // ホームで画像一覧を開いた操作を最小限でログ（同一ユーザーは60秒に1回まで）
    // logger.info('record list viewed', { userId: user_id });

    try {
        const records = await RecordModel.findAllByUserId(user_id, category_id || null);
        res.status(200).json(records);
    } catch (error) {
        logger.error('記録取得エラー', { 
            error: error.message, 
            stack: error.stack,
            userId: user_id,
            categoryId: category_id || null 
        });
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ------------------------------------------------
// 2.5 特定の記録を取得
// GET /api/records/:id
// ------------------------------------------------
router.get('/:id', async (req, res) => {
    const user_id = req.user.id;
    const { id } = req.params;

    try {
        const record = await RecordModel.findById(id, user_id);
        if (!record) {
            return res.status(404).json({ message: '記録が見つかりません。' });
        }
        res.status(200).json(record);
    } catch (error) {
        logger.error('記録取得エラー', { 
            error: error.message, 
            stack: error.stack,
            recordId: id,
            userId: user_id 
        });
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ------------------------------------------------
// 3. 記録の更新 (Update)
// PUT /api/records/:id
// ------------------------------------------------
router.put('/:id', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            logger.error('Multer Error', { 
                error: err.message, 
                stack: err.stack,
                recordId: req.params.id,
                userId: req.user ? req.user.id : null 
            });
            return res.status(400).json({ message: '画像のアップロードに失敗しました。', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    const { id } = req.params;
    const { title, description, category_id, date_logged } = req.body;
    const user_id = req.user.id;

    let imageUrl = null;
    if (req.file) {
        imageUrl = `uploads/${req.file.filename}`;
    }

    try {
        const success = await RecordModel.update(id, user_id, { 
            title, 
            description,
            categoryId: category_id || null,
            dateLogged: date_logged,
            imageUrl
        });

        if (!success) {
            return res.status(404).json({ message: '記録が見つからないか、更新権限がありません。' });
        }

        logger.info('記録更新成功', { 
            recordId: id, 
            userId: user_id 
        });
        
        res.status(200).json({ message: '記録が更新されました。', imageUrl });
    } catch (error) {
        logger.error('記録更新エラー', { 
            error: error.message, 
            stack: error.stack,
            recordId: id,
            userId: user_id 
        });
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ------------------------------------------------
// 4. 記録の削除 (Delete)
// DELETE /api/records/:id
// ------------------------------------------------
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const success = await RecordModel.softDelete(id, user_id);
        if (!success) {
            return res.status(404).json({ message: '記録が見つからないか、削除権限がありません。' });
        }

        logger.info('記録削除成功', { 
            recordId: id, 
            userId: user_id 
        });
        
        res.status(200).json({ message: '記録が削除されました。' });
    } catch (error) {
        logger.error('記録削除エラー', { 
            error: error.message, 
            stack: error.stack,
            recordId: id,
            userId: user_id 
        });
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

module.exports = router;
