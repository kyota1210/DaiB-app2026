-- usersテーブルにbioカラムを追加（自己紹介、100文字まで）
ALTER TABLE users 
ADD COLUMN bio VARCHAR(100) NULL AFTER user_name;
