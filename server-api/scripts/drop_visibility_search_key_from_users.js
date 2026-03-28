const db = require('../db');

async function dropVisibilityAndSearchKey() {
    try {
        const columns = ['visibility', 'search_key'];
        for (const col of columns) {
            try {
                await db.query(`ALTER TABLE users DROP COLUMN ${col}`);
                console.log(`users から ${col} を削除しました`);
            } catch (err) {
                if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log(`${col} は既に存在しません`);
                } else throw err;
            }
        }
    } catch (error) {
        console.error('カラム削除に失敗しました:', error);
        throw error;
    } finally {
        process.exit();
    }
}

dropVisibilityAndSearchKey();
