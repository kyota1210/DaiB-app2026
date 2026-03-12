const db = require('../db');

async function createPasswordResetTokensTable() {
    try {
        console.log('Creating password_reset_tokens table...');

        const [rows] = await db.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'password_reset_tokens'
        `);

        if (rows.length > 0) {
            console.log('password_reset_tokens table already exists. Skipping creation.');
        } else {
            await db.query(`
                CREATE TABLE password_reset_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    token_hash VARCHAR(64) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_token_hash (token_hash),
                    INDEX idx_user_id (user_id),
                    INDEX idx_expires_at (expires_at),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('Successfully created password_reset_tokens table.');
        }
    } catch (error) {
        console.error('Failed:', error);
    } finally {
        process.exit();
    }
}

createPasswordResetTokensTable();
