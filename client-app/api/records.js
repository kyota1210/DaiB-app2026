import { useCallback } from 'react';
import {
  createRecord as createRecordDirect,
  fetchRecords as fetchRecordsDirect,
  fetchRecordById as fetchRecordByIdDirect,
  deleteRecord as deleteRecordDirect,
  updateRecord as updateRecordDirect,
  fetchUserPostCount as fetchUserPostCountDirect,
  fetchCurrentMonthPostCount as fetchCurrentMonthPostCountDirect,
} from './supabaseData';

export const useRecordsApi = () => {
  const createRecord = useCallback((recordData) => createRecordDirect(recordData), []);
  const fetchRecords = useCallback((options) => fetchRecordsDirect(options), []);
  const fetchRecordById = useCallback((id) => fetchRecordByIdDirect(id), []);
  const deleteRecord = useCallback((id) => deleteRecordDirect(id), []);
  const updateRecord = useCallback((id, recordData) => updateRecordDirect(id, recordData), []);
  const fetchUserPostCount = useCallback(() => fetchUserPostCountDirect(), []);
  const fetchCurrentMonthPostCount = useCallback(() => fetchCurrentMonthPostCountDirect(), []);

  return {
    createRecord,
    fetchRecords,
    fetchRecordById,
    deleteRecord,
    updateRecord,
    fetchUserPostCount,
    fetchCurrentMonthPostCount,
  };
};
