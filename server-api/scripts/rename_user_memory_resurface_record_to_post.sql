-- 既存の user_memory_resurface.record_id を post_id にリネーム（MySQL）
ALTER TABLE user_memory_resurface
  CHANGE COLUMN record_id post_id INT NOT NULL;
