-- スレッド「過去の自分」再浮上: 月1回・表示窓はクライアントTZのカレンダー1日
CREATE TABLE IF NOT EXISTS user_memory_resurface (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    `year_month` CHAR(7) NOT NULL COMMENT 'YYYY-MM (クライアントTZ)',
    post_id INT NOT NULL,
    kind ENUM('anniversary', 'serendipity') NOT NULL,
    years_ago INT NULL,
    client_timezone VARCHAR(64) NOT NULL,
    display_local_date DATE NOT NULL,
    window_end_utc DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_user_year_month (user_id, `year_month`),
    KEY idx_user_window (user_id, `year_month`, window_end_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
