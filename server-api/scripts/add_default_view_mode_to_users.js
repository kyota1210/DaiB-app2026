const db = require('../db');

async function addDefaultViewModeColumn() {
    try {
        const sql = `
            ALTER TABLE users 
            ADD COLUMN default_view_mode VARCHAR(20) NOT NULL DEFAULT 'grid' AFTER bio
        `;

        await db.query(sql);
        console.log('✅ default_view_modeカラムをusersテーブルに追加しました');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️  default_view_modeカラムは既に存在します');
        } else {
            console.error('❌ default_view_modeカラムの追加に失敗しました:', error);
            throw error;
        }
    } finally {
        await db.end();
    }
}

addDefaultViewModeColumn();
