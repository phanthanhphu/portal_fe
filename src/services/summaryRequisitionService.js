import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getUserEmail } from '../utils/authUser';

export const BULK_COMPLETION_ACTION = Object.freeze({
  CONFIRM: 'confirm',
  CANCEL: 'cancel',
});

const ACTION_TO_ENDPOINT = Object.freeze({
  [BULK_COMPLETION_ACTION.CONFIRM]: '/api/summary-requisitions/mark-completed',
  [BULK_COMPLETION_ACTION.CANCEL]: '/api/summary-requisitions/mark-uncompleted',
});

export const bulkUpdateCompletion = async (actionKey, requisitionIds, options = {}) => {
  const endpoint = ACTION_TO_ENDPOINT[actionKey];
  if (!endpoint) throw new Error(`INVALID_ACTION_KEY: ${actionKey}`);

  const ids = Array.isArray(requisitionIds)
    ? requisitionIds.map((x) => String(x).trim()).filter(Boolean)
    : [];

  if (ids.length === 0) throw new Error('EMPTY_REQUISITION_IDS');

  const email = (options.email ?? getUserEmail())?.trim?.() || null;
  if (!email) throw new Error('MISSING_EMAIL');

  return axios.patch(
    `${API_BASE_URL}${endpoint}`,
    { requisitionIds: ids },
    {
      params: { email }, // ✅ đúng yêu cầu mới
      headers: { Accept: '*/*' },
    }
  );
};
