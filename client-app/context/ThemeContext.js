import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // 常にダークテーマ（ブラック背景）を使用
    const colors = {
        background: '#000',
        secondaryBackground: '#1c1c1e',
        text: '#fff',
        secondaryText: '#a0a0a0',
        border: '#38383a',
        primary: '#0a84ff',
        card: '#1c1c1e',
        icon: '#fff',
        inactive: '#666',
    };

    const theme = {
        mode: 'dark',
        activeTheme: 'dark',
        colors: colors,
        isDark: true,
    };

    return (
        <ThemeContext.Provider 
            value={{ 
                theme, 
                isLoading: false,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

