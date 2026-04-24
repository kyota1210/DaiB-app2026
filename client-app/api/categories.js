import {
  fetchCategories as fetchCategoriesDirect,
  createCategory as createCategoryDirect,
  updateCategory as updateCategoryDirect,
  deleteCategory as deleteCategoryDirect,
  reorderCategories as reorderCategoriesDirect,
} from './supabaseData';

export const fetchCategories = async (_token) => fetchCategoriesDirect();
export const createCategory = async (_token, payload) => createCategoryDirect(payload);
export const updateCategory = async (_token, id, payload) => updateCategoryDirect(id, payload);
export const deleteCategory = async (_token, id) => deleteCategoryDirect(id);
export const reorderCategories = async (_token, categoryIds) => reorderCategoriesDirect(categoryIds);
