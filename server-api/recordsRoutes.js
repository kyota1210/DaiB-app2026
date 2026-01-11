const express = require('express');
const router = express.Router();
const RecordModel = require('./models/RecordModel');
const auth = require('./middleware/auth');
const multer = require('multer');
const path = require('path');

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
            console.error('Multer Error:', err);
            return res.status(400).json({ message: '画像のアップロードに失敗しました。', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    // req.body が undefined または null の場合のガード
    if (!req.body) {
        return res.status(400).json({ message: 'リクエストデータが読み取れませんでした。' });
    }

    const { title, description, date_logged, category_id, aspect_ratio, zoom_level, position_x, position_y } = req.body;
    const user_id = req.user.id;

    // 要件: 日付のみ必須
    if (!date_logged) {
        return res.status(400).json({ message: '日付は必須です。' });
    }

    // タイトル未入力時はデフォルト値を設定
    const recordTitle = typeof title === 'string' && title.trim() ? title : '無題の記録';
    const recordDescription = typeof description === 'string' ? description : '';

    // 画像パスの生成（相対パス）
    // DBには 'uploads/filename.jpg' の形式で保存する
    // クライアント側で表示する際に、ベースURLと結合する
    let imageUrl = null;
    if (req.file) {
        // req.file.path は 'uploads\filename.jpg' (Windows) のようになる場合があるため
        // スラッシュに統一して保存するのが望ましい
        imageUrl = `uploads/${req.file.filename}`;
    }

    try {
        const recordId = await RecordModel.create({
            userId: user_id,
            title: recordTitle,
            description: recordDescription,
            dateLogged: date_logged,
            imageUrl,
            categoryId: category_id || null,
            aspectRatio: aspect_ratio || '1:1',
            zoomLevel: zoom_level ? parseFloat(zoom_level) : 1.0,
            positionX: position_x ? parseInt(position_x) : 0,
            positionY: position_y ? parseInt(position_y) : 0
        });

        res.status(201).json({ 
            message: '記録が作成されました。',
            recordId,
            imageUrl // クライアントには保存した相対パスを返す
        });
    } catch (error) {
        console.error('記録作成エラー:', error);
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

    try {
        const records = await RecordModel.findAllByUserId(user_id, category_id || null);
        res.status(200).json(records);
    } catch (error) {
        console.error('記録取得エラー:', error);
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
        console.error('記録取得エラー:', error);
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
            console.error('Multer Error:', err);
            return res.status(400).json({ message: '画像のアップロードに失敗しました。', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    const { id } = req.params;
    const { title, description, category_id, date_logged, aspect_ratio, zoom_level, position_x, position_y } = req.body;
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
            imageUrl,
            aspectRatio: aspect_ratio,
            zoomLevel: zoom_level !== undefined ? parseFloat(zoom_level) : undefined,
            positionX: position_x !== undefined ? parseInt(position_x) : undefined,
            positionY: position_y !== undefined ? parseInt(position_y) : undefined
        });

        if (!success) {
            return res.status(404).json({ message: '記録が見つからないか、更新権限がありません。' });
        }

        res.status(200).json({ message: '記録が更新されました。', imageUrl });
    } catch (error) {
        console.error('記録更新エラー:', error);
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

        res.status(200).json({ message: '記録が削除されました。' });
    } catch (error) {
        console.error('記録削除エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

module.exports = router;
