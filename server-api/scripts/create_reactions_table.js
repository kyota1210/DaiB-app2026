/**
 * reactions テーブルを作成するマイグレーションスクリプト。
 * 実行: node server-api/scripts/create_reactions_table.js
 */
const db = require('../db');

async function run() {
    try {
        const [rows] = await db.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reactions'`
        );
        if (rows.length > 0) {
            console.log('reactions は既に存在します。スキップします。');
        } else {
            await db.query(`
                CREATE TABLE reactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    record_id INT NOT NULL,
                    user_id INT NOT NULL,
                    emoji VARCHAR(10) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_reaction (record_id, user_id),
                    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_record_id (record_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ reactions テーブルを作成しました。');
        }
    } catch (error) {
        console.error('❌ reactions テーブル作成に失敗しました:', error);
        throw error;
    } finally {
        await db.end();
    }
}

run();
