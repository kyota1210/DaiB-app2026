import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext();

const colors = {
    background: '#E8E6E1',
    secondaryBackground: '#D4D2CD',
    text: '#1c1c1e',
    secondaryText: '#6b6b6e',
    border: '#b8b6b1',
    primary: '#0a84ff',
    card: '#F5F3EE',
    icon: '#1c1c1e',
    inactive: '#8e8e93',
};

const theme = {
    mode: 'light',
    activeTheme: 'light',
    colors,
    isDark: false,
};

const contextValue = { theme, isLoading: false };

export const ThemeProvider = ({ children }) => {
    return (
        <ThemeContext.Provider value={contextValue}>
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
