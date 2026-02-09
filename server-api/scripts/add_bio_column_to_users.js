const db = require('../db');

async function addBioColumn() {
    try {
        // bioカラムを追加（VARCHAR(100)）
        const sql = `
            ALTER TABLE users 
            ADD COLUMN bio VARCHAR(100) NULL AFTER user_name
        `;
        
        await db.query(sql);
        console.log('✅ bioカラムをusersテーブルに追加しました');
    } catch (error) {
        // カラムが既に存在する場合はエラーを無視
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️  bioカラムは既に存在します');
        } else {
            console.error('❌ bioカラムの追加に失敗しました:', error);
            throw error;
        }
    } finally {
        await db.end();
    }
}

addBioColumn();
