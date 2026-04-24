import { useCallback } from 'react';
import {
  createRecord as createRecordDirect,
  fetchRecords as fetchRecordsDirect,
  fetchRecordById as fetchRecordByIdDirect,
  deleteRecord as deleteRecordDirect,
  updateRecord as updateRecordDirect,
} from './supabaseData';

export const useRecordsApi = () => {
  const createRecord = useCallback((recordData) => createRecordDirect(recordData), []);
  const fetchRecords = useCallback((categoryId = null) => fetchRecordsDirect(categoryId), []);
  const fetchRecordById = useCallback((id) => fetchRecordByIdDirect(id), []);
  const deleteRecord = useCallback((id) => deleteRecordDirect(id), []);
  const updateRecord = useCallback((id, recordData) => updateRecordDirect(id, recordData), []);

  return { createRecord, fetchRecords, fetchRecordById, deleteRecord, updateRecord };
};
