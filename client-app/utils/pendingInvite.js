const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let pendingUserId = null;
/** 同じ招待URLの再配信で読み込み画面に戻らないようにする */
let handledInviteUserId = null;

export const isInviteUserId = (value) => UUID.test(String(value || '').trim());

/**
 * daibapp://invite/<uuid> と https 招待URL（/invite/<uuid> または ?u=<uuid>）から userId を取る。
 * daibapp://invite/<uuid> は host が invite、path が /<uuid> になるため両形式を見る。
 */
export const parseInviteUserId = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* 不正な % はそのまま照合する */
  }

  const fromQuery = decoded.match(/[?&]u=([0-9a-f-]{36})/i);
  if (fromQuery && isInviteUserId(fromQuery[1])) return fromQuery[1];

  const fromPath = decoded.match(/\/invite\/([0-9a-f-]{36})/i);
  if (fromPath && isInviteUserId(fromPath[1])) return fromPath[1];

  try {
    const url = new URL(decoded);
    if (url.protocol === 'daibapp:' && url.hostname === 'invite') {
      const segment = url.pathname.replace(/^\/+/, '').split('/')[0];
      if (isInviteUserId(segment)) return segment;
    }
  } catch {
    /* カスタムスキーム以外は無視 */
  }

  return '';
};

export const isInviteAlreadyHandled = (userId) =>
  Boolean(handledInviteUserId) && handledInviteUserId === String(userId || '').trim();

export const markInviteHandled = (userId) => {
  if (isInviteUserId(userId)) handledInviteUserId = String(userId).trim();
};

export const rememberInviteFromUrl = (url) => {
  const id = parseInviteUserId(url);
  if (!id || isInviteAlreadyHandled(id)) return '';
  pendingUserId = id;
  return id;
};

export const setPendingInviteUserId = (userId) => {
  pendingUserId = isInviteUserId(userId) ? String(userId).trim() : null;
};

export const peekPendingInviteUserId = () => pendingUserId;

export const consumePendingInviteUserId = () => {
  const id = pendingUserId;
  pendingUserId = null;
  return id;
};
