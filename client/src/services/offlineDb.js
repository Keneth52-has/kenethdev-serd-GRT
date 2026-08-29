import { openDB } from 'idb';

const DB_NAME = 'shg_offline_db_v1';
const DB_VERSION = 1;
const DRAFTS_STORE = 'drafts';

export async function getOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        const store = db.createObjectStore(DRAFTS_STORE, { keyPath: 'localId' });
        store.createIndex('employee_id', 'employee_id', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('updated_at', 'updated_at', { unique: false });
      }
    },
  });
}

/**
 * Save or update a draft in local IndexedDB
 */
export async function saveLocalDraft(draft) {
  const db = await getOfflineDB();
  const localId = draft.localId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
  
  const draftToSave = {
    ...draft,
    localId,
    syncStatus: draft.syncStatus || 'saved_locally',
    updated_at: new Date().toISOString(),
  };

  await db.put(DRAFTS_STORE, draftToSave);
  return draftToSave;
}

/**
 * Retrieve a specific draft by localId
 */
export async function getLocalDraft(localId) {
  const db = await getOfflineDB();
  return db.get(DRAFTS_STORE, localId);
}

/**
 * Get all local drafts for a user
 */
export async function getAllLocalDrafts(employeeId = null) {
  const db = await getOfflineDB();
  const all = await db.getAll(DRAFTS_STORE);
  if (!employeeId) return all.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  return all
    .filter(d => !d.employee_id || d.employee_id.toUpperCase() === employeeId.toUpperCase())
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

/**
 * Get drafts marked pending sync or saved locally
 */
export async function getPendingSyncDrafts(employeeId = null) {
  const db = await getOfflineDB();
  const all = await db.getAll(DRAFTS_STORE);
  return all.filter(d => {
    const matchesEmp = !employeeId || !d.employee_id || d.employee_id.toUpperCase() === employeeId.toUpperCase();
    const needsSync = d.syncStatus === 'pending_sync' || d.syncStatus === 'saved_locally' || d.syncStatus === 'failed';
    return matchesEmp && needsSync;
  });
}

/**
 * Mark a draft as successfully synced
 */
export async function markDraftSynced(localId, serverId, reportId = null) {
  const db = await getOfflineDB();
  const draft = await db.get(DRAFTS_STORE, localId);
  if (draft) {
    draft.server_id = serverId;
    if (reportId) draft.report_id = reportId;
    draft.syncStatus = 'synced';
    draft.synced_at = new Date().toISOString();
    await db.put(DRAFTS_STORE, draft);
  }
}

/**
 * Delete a local draft
 */
export async function deleteLocalDraft(localId) {
  const db = await getOfflineDB();
  await db.delete(DRAFTS_STORE, localId);
}
