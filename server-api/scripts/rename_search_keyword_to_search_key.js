/**
 * search_keyword を search_key にリネームし、UNIQUE 制約を追加する。
 * 既存値は「ユーザーID_ランダム文字列」形式に更新する。
 */
const db = require('../db');
const UserModel = require('../models/UserModel');

async function run() {
    try {
        // 1) カラム名変更（VARCHAR 長を 80 に拡張: id_ + 20文字）
        await db.query(`
            ALTER TABLE users
            CHANGE COLUMN search_keyword search_key VARCHAR(80) NULL
        `);
        console.log('✅ カラムを search_keyword → search_key に変更しました');

        // 2) 既存の search_key を新形式（userId_ランダム）に更新
        const [rows] = await db.query('SELECT id FROM users WHERE search_key IS NOT NULL');
        for (const row of rows) {
            const newKey = UserModel.generateSearchKey(row.id);
            await db.query('UPDATE users SET search_key = ? WHERE id = ?', [newKey, row.id]);
        }
        console.log(`✅ ${rows.length} 件の検索キーを新形式に更新しました`);

        // 3) UNIQUE 制約を追加
        await db.query(`
            ALTER TABLE users
            ADD UNIQUE KEY unique_search_key (search_key)
        `);
        console.log('✅ search_key に UNIQUE 制約を追加しました');
    } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
            console.log('ℹ️  unique_search_key は既に存在します');
        } else if (error.code === 'ER_DUP_ENTRY') {
            console.error('❌ 重複する search_key があります。上記の更新を確認してください。', error.message);
        } else {
            console.error('❌ マイグレーションに失敗しました:', error);
        }
        throw error;
    } finally {
        process.exit();
    }
}

run();
