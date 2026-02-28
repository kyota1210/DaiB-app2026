const db = require('../db');

async function addVisibilityColumns() {
    try {
        const columns = [
            { name: 'visibility', sql: "ADD COLUMN visibility ENUM('public','private') NOT NULL DEFAULT 'public' AFTER bio" },
            { name: 'search_keyword', sql: 'ADD COLUMN search_keyword VARCHAR(64) NULL AFTER visibility' },
        ];
        for (const col of columns) {
            try {
                await db.query(`ALTER TABLE users ${col.sql}`);
                console.log(`✅ users に ${col.name} を追加しました`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️  ${col.name} は既に存在します`);
                } else throw err;
            }
        }
    } catch (error) {
        console.error('❌ カラム追加に失敗しました:', error);
        throw error;
    } finally {
        process.exit();
    }
}

addVisibilityColumns();
