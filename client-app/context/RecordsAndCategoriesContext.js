import React, { createContext, useState, useCallback, useMemo, useContext, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { AuthContext } from './AuthContext';
import { useRecordsApi } from '../api/records';
import { fetchCategories } from '../api/categories';
import { getReactionDetailsBatch } from '../api/reactions';
import { prefetchReactionAvatarUris } from '../utils/imageHelper';
import { RECORDS_PAGE_SIZE } from '../constants/pagination';

export const RecordsAndCategoriesContext = createContext(null);

const ALL_CATEGORY = { id: 'all', name: 'All', icon: 'apps' };

const categoryKey = (categoryId) => (categoryId === 'all' || categoryId == null ? 'all' : String(categoryId));

const normalizeRecordRow = (r) => ({
    ...r,
    category_ids: r.category_ids
        ? (Array.isArray(r.category_ids)
            ? r.category_ids
            : String(r.category_ids).split(',').map(Number).filter((n) => !isNaN(n) && n > 0))
        : (r.category_id ? [r.category_id] : []),
});

export function RecordsAndCategoriesProvider({ children }) {
    const { userToken } = useContext(AuthContext);
    const { fetchRecords, fetchUserPostCount } = useRecordsApi();

    const [categories, setCategories] = useState([]);
    const [recordsByCategoryId, setRecordsByCategoryId] = useState({});
    const [hasMoreByCategory, setHasMoreByCategory] = useState({});
    const [loadingMoreByCategory, setLoadingMoreByCategory] = useState({});
    const [totalPostCount, setTotalPostCount] = useState(0);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [reactionCacheByPostId, setReactionCacheByPostId] = useState({});

    const hasCategoriesCache = useRef(false);
    const hasRecordsCache = useRef(false);
    const recordsByCategoryRef = useRef(recordsByCategoryId);
    const hasMoreByCategoryRef = useRef(hasMoreByCategory);
    recordsByCategoryRef.current = recordsByCategoryId;
    hasMoreByCategoryRef.current = hasMoreByCategory;

    const records = useMemo(() => {
        const map = new Map();
        Object.values(recordsByCategoryId).forEach((list) => {
            (list || []).forEach((r) => map.set(r.id, r));
        });
        return [...map.values()].sort((a, b) => {
            const ta = a.date_logged ? new Date(a.date_logged).getTime() : 0;
            const tb = b.date_logged ? new Date(b.date_logged).getTime() : 0;
            return tb - ta;
        });
    }, [recordsByCategoryId]);

    const recordsByCategory = useMemo(() => {
        const cats = categories.length > 0 ? categories : [ALL_CATEGORY];
        const next = {};
        cats.forEach((cat) => {
            if (cat.id === 'all') {
                next.all = recordsByCategoryId.all ?? [];
            } else {
                next[cat.id] = recordsByCategoryId[String(cat.id)]
                    ?? records.filter((r) => {
                        if (Array.isArray(r.category_ids)) {
                            return r.category_ids.includes(cat.id);
                        }
                        return r.category_id === cat.id;
                    });
            }
        });
        return next;
    }, [records, recordsByCategoryId, categories]);

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

    const loadReactionsForPosts = useCallback(async (postIds, { prefetchAvatars = false } = {}) => {
        if (!userToken || !postIds?.length) return;
        const ids = [...new Set(postIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
        if (!ids.length) return;
        try {
            for (let i = 0; i < ids.length; i += RECORDS_PAGE_SIZE) {
                const chunk = ids.slice(i, i + RECORDS_PAGE_SIZE);
                const byPost = await getReactionDetailsBatch(userToken, chunk);
                setReactionCacheByPostId((prev) => ({ ...prev, ...byPost }));
                if (prefetchAvatars) {
                    InteractionManager.runAfterInteractions(() => {
                        setTimeout(() => {
                            void prefetchReactionAvatarUris(byPost, chunk);
                        }, 400);
                    });
                }
            }
        } catch (error) {
            console.warn('[Reactions] preload failed:', error?.message);
        }
    }, [userToken]);

    const loadRecords = useCallback(async (categoryId = 'all', { reset = true } = {}) => {
        if (!userToken) return;
        const key = categoryKey(categoryId);
        const isFirstLoad = !hasRecordsCache.current && key === 'all' && reset;
        if (isFirstLoad) setLoadingRecords(true);
        try {
            const offset = reset ? 0 : (recordsByCategoryRef.current[key]?.length ?? 0);
            const apiCategoryId = key === 'all' ? null : Number(key);
            const { records: page, hasMore } = await fetchRecords({
                categoryId: apiCategoryId,
                limit: RECORDS_PAGE_SIZE,
                offset,
            });
            const normalized = (page || []).map(normalizeRecordRow);
            setRecordsByCategoryId((prev) => ({
                ...prev,
                [key]: reset ? normalized : [...(prev[key] || []), ...normalized],
            }));
            setHasMoreByCategory((prev) => ({ ...prev, [key]: hasMore }));
            if (key === 'all' && reset) {
                hasRecordsCache.current = true;
                try {
                    const count = await fetchUserPostCount();
                    setTotalPostCount(count);
                } catch (_) { /* ignore */ }
            }
            if (normalized.length > 0) {
                void loadReactionsForPosts(normalized.map((r) => r.id));
            }
        } catch (error) {
            console.error('記録取得エラー:', error);
        } finally {
            if (isFirstLoad) setLoadingRecords(false);
        }
    }, [userToken, fetchRecords, fetchUserPostCount, loadReactionsForPosts]);

    const loadMoreRecords = useCallback(async (categoryId = 'all') => {
        const key = categoryKey(categoryId);
        if (loadingMoreByCategory[key] || !hasMoreByCategoryRef.current[key]) return;
        setLoadingMoreByCategory((prev) => ({ ...prev, [key]: true }));
        try {
            await loadRecords(categoryId, { reset: false });
        } finally {
            setLoadingMoreByCategory((prev) => ({ ...prev, [key]: false }));
        }
    }, [loadRecords, loadingMoreByCategory]);

    const resetRecordsCache = useCallback(() => {
        setRecordsByCategoryId({});
        setHasMoreByCategory({});
        hasRecordsCache.current = false;
    }, []);

    const value = useMemo(() => ({
        categories,
        records,
        recordsByCategory,
        recordsByCategoryId,
        hasMoreByCategory,
        loadingMoreByCategory,
        totalPostCount,
        reactionCacheByPostId,
        loadCategories,
        loadRecords,
        loadMoreRecords,
        resetRecordsCache,
        loadReactionsForPosts,
        loadingCategories,
        loadingRecords,
    }), [
        categories,
        records,
        recordsByCategory,
        recordsByCategoryId,
        hasMoreByCategory,
        loadingMoreByCategory,
        totalPostCount,
        reactionCacheByPostId,
        loadCategories,
        loadRecords,
        loadMoreRecords,
        resetRecordsCache,
        loadReactionsForPosts,
        loadingCategories,
        loadingRecords,
    ]);

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
