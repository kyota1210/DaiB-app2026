const db = require('../db');

async function updateImageAdjustmentDefaults() {
    try {
        console.log('Updating default values for image adjustment columns...');
        
        // デフォルト値を変更
        const alterSql = `
            ALTER TABLE records
            MODIFY COLUMN aspect_ratio VARCHAR(10) DEFAULT '1:1',
            MODIFY COLUMN zoom_level DECIMAL(3, 2) DEFAULT 1.00;
        `;
        
        await db.query(alterSql);
        console.log('Successfully updated default values.');
        console.log('- aspect_ratio: 4:3 → 1:1');
        console.log('- zoom_level: 1.20 → 1.00');
        
    } catch (error) {
        console.error('Failed to update default values:', error);
    } finally {
        process.exit();
    }
}

updateImageAdjustmentDefaults();

