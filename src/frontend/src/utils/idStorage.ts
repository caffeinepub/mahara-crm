const LEAD_IDS_KEY = "mahara_lead_ids";
const FOLLOWUP_IDS_KEY = "mahara_followup_ids";
const BRANCH_IDS_KEY = "mahara_branch_ids";

function getIds(key: string): bigint[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return (JSON.parse(raw) as string[]).map((s) => BigInt(s));
  } catch {
    return [];
  }
}

function addId(key: string, id: bigint): void {
  const ids = getIds(key);
  ids.push(id);
  localStorage.setItem(key, JSON.stringify(ids.map(String)));
}

function removeId(key: string, id: bigint): void {
  const ids = getIds(key).filter((i) => i !== id);
  localStorage.setItem(key, JSON.stringify(ids.map(String)));
}

export function getLeadIds() {
  return getIds(LEAD_IDS_KEY);
}
export function addLeadId(id: bigint) {
  addId(LEAD_IDS_KEY, id);
}
export function removeLeadId(id: bigint) {
  removeId(LEAD_IDS_KEY, id);
}

export function getFollowUpIds() {
  return getIds(FOLLOWUP_IDS_KEY);
}
export function addFollowUpId(id: bigint) {
  addId(FOLLOWUP_IDS_KEY, id);
}
export function removeFollowUpId(id: bigint) {
  removeId(FOLLOWUP_IDS_KEY, id);
}

export function getBranchIds() {
  return getIds(BRANCH_IDS_KEY);
}
export function addBranchId(id: bigint) {
  addId(BRANCH_IDS_KEY, id);
}
export function removeBranchId(id: bigint) {
  removeId(BRANCH_IDS_KEY, id);
}
