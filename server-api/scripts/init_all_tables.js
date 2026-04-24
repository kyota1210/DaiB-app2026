/**
 * データベースを再構築した際に、全テーブルを一括作成するスクリプト。
 * 実行: node server-api/scripts/init_all_tables.js
 * （server-api から: node scripts/init_all_tables.js）
 */
const db = require('../db');

async function tableExists(tableName) {
    const [rows] = await db.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
    );
    return rows.length > 0;
}

async function run() {
    try {
        // 1. users
        if (await tableExists('users')) {
            console.log('users は既に存在します。スキップします。');
        } else {
            await db.query(`
                CREATE TABLE users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    user_name VARCHAR(25) NOT NULL,
                    supabase_user_id VARCHAR(36) NULL UNIQUE COMMENT 'auth.users の UUID',
                    password_hash VARCHAR(255) NULL COMMENT 'レガシー自前ログイン用',
                    bio VARCHAR(100) NULL,
                    default_view_mode VARCHAR(20) NOT NULL DEFAULT 'grid',
                    default_sort_order VARCHAR(20) NOT NULL DEFAULT 'date_logged',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ users テーブルを作成しました。');
        }

        // 2. user_avatars
        if (await tableExists('user_avatars')) {
            console.log('user_avatars は既に存在します。スキップします。');
        } else {
            await db.query(`
                CREATE TABLE user_avatars (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL UNIQUE,
                    image_url VARCHAR(500) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ user_avatars テーブルを作成しました。');
        }

        // 3. categories
        if (await tableExists('categories')) {
            console.log('categories は既に存在します。スキップします。');
        } else {
            await db.query(`
                CREATE TABLE categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(50) NOT NULL,
                    sort_order INT NOT NULL DEFAULT 0,
                    invalidation_flag TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0:有効 1:無効(削除)',
                    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '論理削除日時',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id),
                    INDEX idx_user_active (user_id, invalidation_flag)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ categories テーブルを作成しました。');
        }

        // 4. posts（旧 records）
        if (await tableExists('posts')) {
            console.log('posts は既に存在します。スキップします。');
        } else {
            await db.query(`
                CREATE TABLE posts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    title VARCHAR(255) NOT NULL DEFAULT '',
                    description TEXT NULL,
                    date_logged DATE NULL,
                    invalidation_flag TINYINT(1) NOT NULL DEFAULT 0,
                    image_url VARCHAR(255) NULL,
                    category_id INT NULL,
                    show_in_timeline TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    delete_at TIMESTAMP NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                    INDEX idx_user_id (user_id),
                    INDEX idx_category_id (category_id),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ posts テーブルを作成しました。');
        }

        // 4b. post_categories（posts / categories の次）
        if (await tableExists('post_categories')) {
            console.log('post_categories は既に存在します。スキップします。');
        } else {
            await db.query(`
                CREATE TABLE post_categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    post_id INT NOT NULL,
                    category_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    invalidation_flag TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0:有効 1:無効(削除)',
                    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '論理削除日時',
                    UNIQUE KEY unique_post_category (post_id, category_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                    INDEX idx_pc_post (post_id),
                    INDEX idx_pc_active (post_id, invalidation_flag)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ post_categories テーブルを作成しました。');
        }

        // 5. follows
        if (await tableExists('follows')) {
            console.log('follows は既に存在します。スキップします。');
        } else {
            await db.query(`
                CREATE TABLE follows (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    follower_id INT NOT NULL,
                    following_id INT NOT NULL,
                    invalidation_flag TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0:有効 1:無効(削除)',
                    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '論理削除日時',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_follow (follower_id, following_id),
                    CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id),
                    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_follower (follower_id),
                    INDEX idx_following (following_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ follows テーブルを作成しました。');
        }

        // 6. reactions
        if (await tableExists('reactions')) {
            console.log('reactions は既に存在します。スキップします。');
        } else {
            await db.query(`
                CREATE TABLE reactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    post_id INT NOT NULL,
                    user_id INT NOT NULL,
                    emoji VARCHAR(10) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_reaction (post_id, user_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_post_id (post_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ reactions テーブルを作成しました。');
        }

        console.log('\n全テーブルの作成が完了しました。');
    } catch (error) {
        console.error('❌ テーブル作成に失敗しました:', error);
        throw error;
    } finally {
        await db.end();
    }
}

run();
