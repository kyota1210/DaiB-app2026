const db = require('../db');

async function addShowInTimelineColumn() {
    try {
        console.log('Adding show_in_timeline column to records table...');

        const checkSql = `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'records'
            AND COLUMN_NAME = 'show_in_timeline';
        `;
        const [rows] = await db.query(checkSql);

        if (rows.length > 0) {
            console.log('show_in_timeline column already exists. Skipping.');
            return;
        }

        const alterSql = `
            ALTER TABLE records
            ADD COLUMN show_in_timeline TINYINT(1) NOT NULL DEFAULT 1;
        `;
        await db.query(alterSql);
        console.log('Successfully added show_in_timeline column.');
    } catch (error) {
        console.error('Failed to add show_in_timeline column:', error);
    } finally {
        process.exit();
    }
}

addShowInTimelineColumn();
