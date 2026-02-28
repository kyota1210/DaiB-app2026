const db = require('../db');

async function addDefaultSortOrderColumn() {
    try {
        const sql = `
            ALTER TABLE users 
            ADD COLUMN default_sort_order VARCHAR(20) NOT NULL DEFAULT 'date_logged' AFTER default_view_mode
        `;

        await db.query(sql);
        console.log('✅ default_sort_orderカラムをusersテーブルに追加しました');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️  default_sort_orderカラムは既に存在します');
        } else {
            console.error('❌ default_sort_orderカラムの追加に失敗しました:', error);
            throw error;
        }
    } finally {
        await db.end();
    }
}

addDefaultSortOrderColumn();
