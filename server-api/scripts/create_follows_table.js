const db = require('../db');

async function createFollowsTable() {
    try {
        const [rows] = await db.query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follows'
        `);
        if (rows.length > 0) {
            console.log('follows テーブルは既に存在します');
            process.exit();
            return;
        }
        await db.query(`
            CREATE TABLE follows (
                id INT AUTO_INCREMENT PRIMARY KEY,
                follower_id INT NOT NULL,
                following_id INT NOT NULL,
                invalidation_flag TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0:有効 1:無効(削除)',
                deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '論理削除日時',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_follow (follower_id, following_id),
                CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id),
                FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_follower (follower_id),
                INDEX idx_following (following_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ follows テーブルを作成しました');
    } catch (error) {
        console.error('❌ follows テーブル作成に失敗しました:', error);
        throw error;
    } finally {
        process.exit();
    }
}

createFollowsTable();
