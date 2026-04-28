// ESLint flat config for the Expo / React Native client app.
// MVP: 既存コードがクラッシュしない最低ラインのみチェックする。
// 大量のスタイル指摘を出さないため、no-unused-vars は warn、未使用 import のみ厳しく扱う。

const expoConfig = require('eslint-config-expo/flat');

module.exports = [
    ...expoConfig,
    {
        ignores: [
            'node_modules/**',
            'ios/**',
            'android/**',
            '.expo/**',
            'dist/**',
            'build/**',
            'web-build/**',
            'babel.config.js',
        ],
    },
    {
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
        },
    },
];
