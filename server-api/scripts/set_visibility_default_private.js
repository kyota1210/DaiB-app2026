const db = require('../db');

async function setVisibilityDefaultPrivate() {
    try {
        await db.query(`
            ALTER TABLE users
            MODIFY COLUMN visibility ENUM('public','private') NOT NULL DEFAULT 'private'
        `);
        console.log('✅ users.visibility のデフォルトを private に変更しました');
    } catch (error) {
        console.error('❌ 変更に失敗しました:', error);
        throw error;
    } finally {
        process.exit();
    }
}

setVisibilityDefaultPrivate();
