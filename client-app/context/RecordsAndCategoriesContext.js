import React, { createContext, useState, useCallback, useMemo, useContext, useRef } from 'react';
import { AuthContext } from './AuthContext';
import { useRecordsApi } from '../api/records';
import { fetchCategories } from '../api/categories';

export const RecordsAndCategoriesContext = createContext(null);

const ALL_CATEGORY = { id: 'all', name: 'All', icon: 'apps' };

export function RecordsAndCategoriesProvider({ children }) {
    const { userToken } = useContext(AuthContext);
    const { fetchRecords } = useRecordsApi();

    const [categories, setCategories] = useState([]);
    const [records, setRecords] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingRecords, setLoadingRecords] = useState(false);

    const hasCategoriesCache = useRef(false);
    const hasRecordsCache = useRef(false);

    const recordsByCategory = useMemo(() => {
        if (!Array.isArray(records)) return {};
        const cats = categories.length > 0 ? categories : [ALL_CATEGORY];
        const next = { all: records };
        cats.filter(cat => cat.id !== 'all').forEach(cat => {
            next[cat.id] = records.filter(r => {
                if (Array.isArray(r.category_ids)) {
                    return r.category_ids.includes(cat.id);
                }
                return r.category_id === cat.id;
            });
        });
        return next;
    }, [records, categories]);

    const loadCategories = useCallback(async () => {
        if (!userToken) return;
        if (!hasCategoriesCache.current) setLoadingCategories(true);
        try {
            const data = await fetchCategories(userToken);
            setCategories([ALL_CATEGORY, ...(data || [])]);
            hasCategoriesCache.current = true;
        } catch (error) {
            console.error('カテゴリー取得エラー:', error);
        } finally {
            setLoadingCategories(false);
        }
    }, [userToken]);

    const loadRecords = useCallback(async () => {
        if (!userToken) return;
        if (!hasRecordsCache.current) setLoadingRecords(true);
        try {
            const data = await fetchRecords(null);
            const normalized = (Array.isArray(data) ? data : []).map(r => ({
                ...r,
                // サーバーのGROUP_CONCATはカンマ区切り文字列で返るため配列に変換
                category_ids: r.category_ids
                    ? String(r.category_ids).split(',').map(Number).filter(n => !isNaN(n) && n > 0)
                    : (r.category_id ? [r.category_id] : []),
            }));
            setRecords(normalized);
            hasRecordsCache.current = true;
        } catch (error) {
            console.error('記録取得エラー:', error);
        } finally {
            setLoadingRecords(false);
        }
    }, [userToken, fetchRecords]);

    const value = useMemo(() => ({
        categories,
        records,
        recordsByCategory,
        loadCategories,
        loadRecords,
        loadingCategories,
        loadingRecords,
    }), [categories, records, recordsByCategory, loadCategories, loadRecords, loadingCategories, loadingRecords]);

    return (
        <RecordsAndCategoriesContext.Provider value={value}>
            {children}
        </RecordsAndCategoriesContext.Provider>
    );
}

export function useRecordsAndCategories() {
    const ctx = useContext(RecordsAndCategoriesContext);
    if (!ctx) {
        throw new Error('useRecordsAndCategories must be used within RecordsAndCategoriesProvider');
    }
    return ctx;
}
