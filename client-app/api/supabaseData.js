import { supabase } from '../utils/supabase';
import { POST_IMAGES_BUCKET, AVATARS_BUCKET } from '../config';
import { imageUriToJpegArrayBuffer } from '../utils/normalizeImageForUpload';
import { moderateImage } from './moderation_image';

const ALLOWED_EMOJIS = ['❤️', '👍', '🌸', '🎉', '✨'];

/** 実DB: category_entities（リポジトリ標準の post_categories ではない） */
const POST_CATEGORY_LINK_TABLE = 'category_entities';

/** invalidation_flag が smallint の行向け（0=有効、1=無効） */
const FLAG_ACTIVE = 0;
const FLAG_INACTIVE = 1;

const requireUser = async () => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (!sessionError && session?.user) {
    return session.user;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error('認証が必要です。再ログインしてください。');
  }
  return data.user;
};

/** PostgREST / Storage が返すフィールドを1本にまとめる（テーブル名は details や追加プロパティに載ることがある） */
const supabaseErrorDiagnostic = (error) => {
  const parts = [error?.message, error?.details, error?.hint, error?.code].filter(
    (x) => x !== undefined && x !== null && String(x).trim() !== ''
  );
  const extraKeys = ['statusCode', 'status', 'name', 'error'];
  for (const k of extraKeys) {
    const v = error?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      parts.push(`${k}=${String(v).trim()}`);
    }
  }
  if (error && typeof error === 'object') {
    for (const k of Object.keys(error)) {
      if (['message', 'details', 'hint', 'code', ...extraKeys].includes(k)) continue;
      try {
        const v = error[k];
        if (v === undefined || v === null) continue;
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        if (s && s !== '{}' && s.length < 500) parts.push(`${k}=${s}`);
      } catch (_) {
        /* ignore */
      }
    }
  }
  return parts.map((x) => String(x).trim()).join(' | ');
};

const rethrowWithStep = (stepLabel, err) => {
  const inner = err instanceof Error ? err.message : String(err);
  throw new Error(`${stepLabel} ${inner}`);
};

/** PostgREST / Postgres のエラーメッセージを、よくある設定ミス向けに分かりやすくする */
const mapSupabaseError = (error) => {
  const msg = error?.message != null ? String(error.message) : String(error);
  const diag = supabaseErrorDiagnostic(error);
  const diagLower = diag.toLowerCase();
  if (msg.includes('invalid input syntax for type bigint')) {
    return new Error(
      'DBの id / user_id が uuid になっていません（bigint のまま等）。Supabase の public.profiles.id、categories.user_id、posts.user_id、follows の follower_id/following_id を uuid（auth.users 参照）に揃えてください。開発中は supabase db reset 後に本リポジトリの migrations を適用するのが確実です。'
    );
  }
  if (
    msg.includes('row-level security') &&
    (msg.toLowerCase().includes('profiles') || diagLower.includes('profiles'))
  ) {
    return new Error(
      `profiles の RLS で INSERT / UPDATE が拒否されています。20260423 / 20260435_profiles_own_row_rls.sql と 20260424_ensure_my_profile_rpc.sql を Supabase に適用してください。 詳細: ${diag}`
    );
  }
  if (
    msg.includes('row-level security') &&
    (msg.includes('"objects"') ||
      msg.toLowerCase().includes('storage') ||
      diagLower.includes('objects') ||
      diagLower.includes('storage'))
  ) {
    return new Error(
      `Storage（avatars 等）の RLS でアップロードが拒否されています。バケット作成と 20260407_storage_policies.sql（または daib-dev-post-images 用の 20260430）を適用し、パス先頭が auth.uid() と一致するか確認してください。 詳細: ${diag}`
    );
  }
  if (msg.includes('row-level security')) {
    return new Error(
      `行レベルセキュリティ（RLS）により拒否されました。プロフィールは profiles のポリシーと ensure_my_profile RPC、アバターは avatars バケットのポリシーを確認してください。 詳細: ${diag}`
    );
  }
  return new Error(msg);
};


/** DB が smallint のとき boolean を送らない（0/1） */
const asSmallIntFlag = (v) => (v !== false && v !== 0 && v !== '0' ? 1 : 0);

/** posts.show_in_timeline は Postgres 側を boolean に揃える */
const asBooleanTimelineFlag = (v) => {
  if (v === undefined || v === null || v === '') return true;
  if (v === false || v === 0 || v === '0') return false;
  if (typeof v === 'string' && v.toLowerCase() === 'false') return false;
  return true;
};

/** 表示名: スキーマによって列名が異なる場合がある */
const profileDisplayName = (row) =>
  row?.user_name ?? row?.username ?? row?.name ?? row?.display_name ?? '';

const normalizeProfileRow = (row) => {
  if (!row) return row;
  return { ...row, user_name: profileDisplayName(row) };
};

const isProfilesSchemaColumnError = (msg) => {
  const m = String(msg || '').toLowerCase();
  return (
    m.includes('schema cache') ||
    m.includes('could not find') ||
    m.includes('column') && m.includes('does not exist')
  );
};

/** user_name / username / name など、存在する列へ初回 INSERT */
const insertProfileRow = async (userId, fallbackName) => {
  const short = String(fallbackName).slice(0, 25);
  const attempts = [
    { id: userId, user_name: short, bio: null },
    { id: userId, user_name: short },
    { id: userId, username: short, bio: null },
    { id: userId, username: short },
    { id: userId, name: short, bio: null },
    { id: userId, name: short },
    { id: userId, display_name: short, bio: null },
    { id: userId, display_name: short },
  ];
  let lastErr;
  for (const payload of attempts) {
    const { data, error } = await supabase.from('profiles').insert(payload).select('*').single();
    if (!error) return normalizeProfileRow(data);
    lastErr = error;
    const m = String(error.message || '');
    if (m.includes('row-level security')) throw mapSupabaseError(error);
    if (!isProfilesSchemaColumnError(m)) break;
  }
  throw mapSupabaseError(lastErr);
};

/** プロフィール画像: AVATARS_BUCKET に {userId}/avatar.jpg。戻り値は DB 保存用のバケット内キーのみ（投稿画像と同様） */
const uploadImageToBucket = async (bucket, userId, file) => {
  if (!file?.uri) return null;
  const path =
    bucket === AVATARS_BUCKET ? `${userId}/avatar.jpg` : `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { arrayBuffer, contentType } = await imageUriToJpegArrayBuffer(file.uri);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: bucket === AVATARS_BUCKET,
    });
  if (error) throw mapSupabaseError(error);
  if (bucket === AVATARS_BUCKET) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/** 投稿画像: バケット内パス {userId}/{postId}/{timestamp}.jpg のみ返す（DB保存用） */
const uploadPostImagePath = async (userId, postId, file) => {
  if (!file?.uri) return null;
  const path = `${userId}/${postId}/${Date.now()}.jpg`;
  const { arrayBuffer, contentType } = await imageUriToJpegArrayBuffer(file.uri);
  const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });
  if (error) throw mapSupabaseError(error);
  return path;
};

const getMyProfile = async () => {
  const user = await requireUser();
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (fetchError) throw mapSupabaseError(fetchError);
  if (existing) return normalizeProfileRow(existing);

  const { data: ensured, error: rpcError } = await supabase.rpc('ensure_my_profile');
  const ensuredRow = Array.isArray(ensured) ? ensured[0] : ensured;
  if (!rpcError && ensuredRow) return normalizeProfileRow(ensuredRow);

  const metadataName = String(user.user_metadata?.user_name || '').trim();
  const fallbackName = metadataName || user.email?.split('@')[0] || 'user';
  return insertProfileRow(user.id, fallbackName);
};

/** プロフィール更新前に行を確保（ensure_my_profile を優先。未デプロイ時は getMyProfile にフォールバック） */
const ensureProfileRowBeforeUpdate = async () => {
  const { error: rpcError } = await supabase.rpc('ensure_my_profile');
  if (!rpcError) return;
  const m = String(rpcError.message || '').toLowerCase();
  if (
    rpcError.code === 'PGRST202' ||
    m.includes('could not find the function') ||
    m.includes('does not exist')
  ) {
    await getMyProfile();
    return;
  }
  throw mapSupabaseError(rpcError);
};

const appendFollowCounts = async (userId, baseUser) => {
  try {
    const [{ count: followingCount }, { count: followerCount }, friendsRes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('invalidation_flag', 0),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('invalidation_flag', 0),
      getFriendsList(userId),
    ]);
    return {
      ...baseUser,
      following_count: followingCount ?? 0,
      follower_count: followerCount ?? 0,
      friend_count: friendsRes.length,
    };
  } catch {
    // follows.user_id が UUID でないレガシーDBなどで失敗してもプロフィール表示は続行
    return {
      ...baseUser,
      following_count: 0,
      follower_count: 0,
      friend_count: 0,
    };
  }
};

const getFriendsList = async (userId) => {
  // 両方向 approved = true のフォロー関係がフレンド
  const { data: following, error: followingErr } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('invalidation_flag', 0)
    .eq('approved', true);
  if (followingErr) throw mapSupabaseError(followingErr);
  const ids = (following || []).map((v) => v.following_id);
  if (ids.length === 0) return [];
  const { data: backFollows, error: backErr } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .in('follower_id', ids)
    .eq('invalidation_flag', 0)
    .eq('approved', true);
  if (backErr) throw mapSupabaseError(backErr);
  const friendIds = (backFollows || []).map((v) => v.follower_id);
  if (friendIds.length === 0) return [];
  const { data: users, error: usersErr } = await supabase
    .from('profiles')
    .select('id,user_name,bio,avatar_url,updated_at')
    .in('id', friendIds);
  if (usersErr) throw mapSupabaseError(usersErr);
  return users || [];
};

export const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(String(email).trim());
  if (error) throw mapSupabaseError(error);
  return { message: 'ご登録のメールアドレスに再設定メールを送信しました。' };
};

export const resetPasswordWithSession = async ({ new_password }) => {
  const { error } = await supabase.auth.updateUser({ password: new_password });
  if (error) throw mapSupabaseError(error);
  return { message: 'パスワードを変更しました。' };
};

export const getUserInfo = async () => {
  const profile = await getMyProfile();
  return { user: await appendFollowCounts(profile.id, profile) };
};

const categoryDisplayName = (row) =>
  row?.name ?? row?.title ?? row?.label ?? row?.category_name ?? '';

export const fetchCategories = async () => {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .eq('invalidation_flag', 0)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw mapSupabaseError(error);
  return (data || []).map((row) => ({
    id: row.id,
    name: categoryDisplayName(row) || String(row.id),
  }));
};

export const createCategory = async ({ name }) => {
  const user = await requireUser();
  const { data: last } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, category_name: name, sort_order: nextOrder })
    .select('*')
    .single();
  if (error) throw mapSupabaseError(error);
  return { id: data.id, name: categoryDisplayName(data) || name };
};

export const updateCategory = async (id, { name }) => {
  const { data, error } = await supabase
    .from('categories')
    .update({ category_name: name })
    .eq('id', id)
    .eq('invalidation_flag', 0)
    .select('*')
    .single();
  if (error) throw mapSupabaseError(error);
  return { id: data.id, name: categoryDisplayName(data) || name };
};

export const deleteCategory = async (id) => {
  const { error } = await supabase
    .from('categories')
    .update({ invalidation_flag: 1, deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw mapSupabaseError(error);
  return { message: 'カテゴリーを削除しました。' };
};

export const reorderCategories = async (categoryIds) => {
  const updates = categoryIds.map((id, i) => supabase.from('categories').update({ sort_order: i }).eq('id', id));
  const results = await Promise.all(updates);
  const error = results.find((r) => r.error)?.error;
  if (error) throw mapSupabaseError(error);
  return { message: '並び順を更新しました。' };
};

const POST_LIST_COLS = 'id,title,description,date_logged,image_url,show_in_timeline';

const mapRecordRow = (row) => ({
  id: row.id,
  title: row.title || '',
  description: row.description || '',
  date_logged: row.date_logged,
  image_url: row.image_url || null,
  show_in_timeline: !!row.show_in_timeline,
  category_ids: row.post_categories?.map((x) => x.category_id) || [],
});

const categoryIdsMapForPosts = async (postIds) => {
  if (!postIds.length) return new Map();
  const { data, error } = await supabase
    .from(POST_CATEGORY_LINK_TABLE)
    .select('post_id, category_id')
    .in('post_id', postIds)
    .eq('invalidation_flag', FLAG_ACTIVE);
  if (error) throw mapSupabaseError(error);
  const m = new Map();
  for (const r of data || []) {
    if (!m.has(r.post_id)) m.set(r.post_id, []);
    m.get(r.post_id).push(r.category_id);
  }
  return m;
};

const attachCategoriesToPostRows = (rows, idToCategoryIds) =>
  (rows || []).map((row) =>
    mapRecordRow({
      ...row,
      post_categories: (idToCategoryIds.get(row.id) || []).map((category_id) => ({ category_id })),
    })
  );

export const fetchRecords = async (categoryId = null) => {
  const user = await requireUser();
  let query = supabase
    .from('posts')
    .select(POST_LIST_COLS)
    .eq('user_id', user.id)
    .eq('invalidation_flag', FLAG_ACTIVE)
    .order('date_logged', { ascending: false })
    .order('id', { ascending: false });

  if (categoryId) {
    const { data: pcRows, error: pcErr } = await supabase
      .from(POST_CATEGORY_LINK_TABLE)
      .select('post_id')
      .eq('category_id', categoryId)
      .eq('invalidation_flag', FLAG_ACTIVE);
    if (pcErr) throw mapSupabaseError(pcErr);
    const inCategory = [...new Set((pcRows || []).map((r) => r.post_id))];
    if (inCategory.length === 0) return [];
    query = query.in('id', inCategory);
  }

  const { data, error } = await query;
  if (error) throw mapSupabaseError(error);
  const catMap = await categoryIdsMapForPosts((data || []).map((p) => p.id));
  return attachCategoriesToPostRows(data, catMap);
};

export const fetchRecordById = async (id) => {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_LIST_COLS)
    .eq('id', id)
    .eq('invalidation_flag', FLAG_ACTIVE)
    .single();
  if (error) throw mapSupabaseError(error);
  const catMap = await categoryIdsMapForPosts([data.id]);
  return attachCategoriesToPostRows([data], catMap)[0];
};

const replaceRecordCategories = async (recordId, categoryIds) => {
  const { error: deactErr } = await supabase
    .from(POST_CATEGORY_LINK_TABLE)
    .update({ invalidation_flag: FLAG_INACTIVE, deleted_at: new Date().toISOString() })
    .eq('post_id', recordId)
    .eq('invalidation_flag', FLAG_ACTIVE);
  if (deactErr) throw mapSupabaseError(deactErr);
  if (categoryIds.length === 0) return;
  const rows = categoryIds.map((categoryId) => ({
    post_id: recordId,
    category_id: categoryId,
    invalidation_flag: FLAG_ACTIVE,
    deleted_at: null,
  }));
  const { error: insertErr } = await supabase.from(POST_CATEGORY_LINK_TABLE).insert(rows);
  if (insertErr) throw mapSupabaseError(insertErr);
};

export const createRecord = async (recordData) => {
  const user = await requireUser();
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      title: recordData.title || '',
      description: recordData.description || '',
      date_logged: recordData.date_logged,
      image_url: null,
      show_in_timeline: asBooleanTimelineFlag(recordData.show_in_timeline),
    })
    .select('id')
    .single();
  if (error) throw mapSupabaseError(error);
  const recordId = data.id;
  let imagePath = null;
  if (recordData.imageUri) {
    imagePath = await uploadPostImagePath(user.id, recordId, {
      uri: recordData.imageUri,
      name: recordData.imageUri.split('/').pop() || 'record.jpg',
      type: 'image/jpeg',
    });

    // 画像モデレーション（NSFW / 暴力検出）。block 判定なら、アップロード済みオブジェクトと
    // 投稿レコードを巻き戻してエラーにする。VISION 未設定時は内部で allow 扱い。
    try {
      const mod = await moderateImage({ bucket: POST_IMAGES_BUCKET, path: imagePath });
      if (mod?.decision === 'block') {
        await supabase.storage.from(POST_IMAGES_BUCKET).remove([imagePath]);
        await supabase.from('posts').delete().eq('id', recordId);
        const err = new Error('image_blocked_by_moderation');
        err.code = 'IMAGE_BLOCKED';
        throw err;
      }
    } catch (e) {
      if (e?.code === 'IMAGE_BLOCKED') throw e;
      // 判定通信エラー時は投稿継続（運用ログは Edge Function 側で出ている）。
    }

    const { data: updatedRow, error: imgErr } = await supabase
      .from('posts')
      .update({ image_url: imagePath })
      .eq('id', recordId)
      .select('id')
      .maybeSingle();
    if (imgErr) throw mapSupabaseError(imgErr);
    if (!updatedRow) {
      throw new Error(
        '投稿の画像パスを保存できませんでした。posts の UPDATE が0 件です（RLS の posts更新ポリシー、または id を確認してください）。'
      );
    }
  }
  await replaceRecordCategories(recordId, recordData.category_ids || []);
  return { message: '記録が作成されました。', recordId, imageUrl: imagePath };
};

export const updateRecord = async (id, recordData) => {
  const patch = {
    title: recordData.title || '',
    description: recordData.description || '',
    date_logged: recordData.date_logged,
  };
  if (recordData.show_in_timeline !== undefined) {
    patch.show_in_timeline = asBooleanTimelineFlag(recordData.show_in_timeline);
  }
  if (recordData.imageUri && !recordData.imageUri.startsWith('http')) {
    const user = await requireUser();
    const newPath = await uploadPostImagePath(user.id, id, {
      uri: recordData.imageUri,
      name: recordData.imageUri.split('/').pop() || 'record.jpg',
      type: 'image/jpeg',
    });
    try {
      const mod = await moderateImage({ bucket: POST_IMAGES_BUCKET, path: newPath });
      if (mod?.decision === 'block') {
        await supabase.storage.from(POST_IMAGES_BUCKET).remove([newPath]);
        const err = new Error('image_blocked_by_moderation');
        err.code = 'IMAGE_BLOCKED';
        throw err;
      }
    } catch (e) {
      if (e?.code === 'IMAGE_BLOCKED') throw e;
    }
    patch.image_url = newPath;
  }
  const { error } = await supabase.from('posts').update(patch).eq('id', id).eq('invalidation_flag', FLAG_ACTIVE);
  if (error) throw mapSupabaseError(error);
  await replaceRecordCategories(id, recordData.category_ids || []);
  return { message: '記録が更新されました。', imageUrl: patch.image_url || null };
};

export const deleteRecord = async (id) => {
  const { error } = await supabase
    .from('posts')
    .update({ invalidation_flag: FLAG_INACTIVE, delete_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw mapSupabaseError(error);
  return { message: '記録が削除されました。' };
};

export const updateProfile = async ({ userName, bio, avatarFile }) => {
  const user = await requireUser();
  try {
    await ensureProfileRowBeforeUpdate();
  } catch (e) {
    rethrowWithStep('[プロフィール行の確保]', e);
  }
  let avatarUrl;
  if (avatarFile?.uri) {
    try {
      avatarUrl = await uploadImageToBucket(AVATARS_BUCKET, user.id, avatarFile);
    } catch (e) {
      rethrowWithStep('[アバター画像のアップロード]', e);
    }
    try {
      // avatars バケットの本人パスは {userId}/avatar.jpg 固定
      const mod = await moderateImage({ bucket: AVATARS_BUCKET, path: `${user.id}/avatar.jpg` });
      if (mod?.decision === 'block') {
        await supabase.storage.from(AVATARS_BUCKET).remove([`${user.id}/avatar.jpg`]);
        const err = new Error('avatar_blocked_by_moderation');
        err.code = 'IMAGE_BLOCKED';
        throw err;
      }
    } catch (e) {
      if (e?.code === 'IMAGE_BLOCKED') rethrowWithStep('[アバター画像のモデレーション]', e);
    }
  }
  const patch = {};
  if (userName !== undefined) patch.user_name = String(userName).trim();
  if (bio !== undefined) patch.bio = bio;
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;
  try {
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (error) throw mapSupabaseError(error);
  } catch (e) {
    rethrowWithStep('[プロフィールの更新]', e);
  }
  try {
    return await getUserInfo();
  } catch (e) {
    rethrowWithStep('[保存後のユーザー情報取得]', e);
  }
};

export const getUserProfile = async () => getUserInfo();

const getFollowStatus = async (viewerId, targetId) => {
  const [{ data: fwd }, { data: back }] = await Promise.all([
    supabase.from('follows').select('follower_id,approved').eq('follower_id', viewerId).eq('following_id', targetId).eq('invalidation_flag', 0).maybeSingle(),
    supabase.from('follows').select('follower_id,approved').eq('follower_id', targetId).eq('following_id', viewerId).eq('invalidation_flag', 0).maybeSingle(),
  ]);
  const is_following = !!fwd;
  const is_followed_by = !!back;
  const is_followed_by_approved = back?.approved === true;
  const is_friend = is_following && is_followed_by && fwd?.approved === true && back?.approved === true;
  return { is_following, is_followed_by, is_followed_by_approved, is_friend };
};

export const getOtherUserProfile = async (userId) => {
  const viewer = await requireUser();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,user_name,bio,avatar_url,updated_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw mapSupabaseError(error);
  if (!profile) return { user: null };
  const status = await getFollowStatus(viewer.id, profile.id);
  return { user: { ...profile, ...status } };
};

export const updateDisplaySettings = async (settings) => {
  const user = await requireUser();
  const patch = {};
  if (settings.default_view_mode !== undefined) patch.default_view_mode = settings.default_view_mode;
  if (settings.default_sort_order !== undefined) patch.default_sort_order = settings.default_sort_order;
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) throw mapSupabaseError(error);
  return getUserInfo();
};

const listProfiles = async (ids) => {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('id,user_name,bio,avatar_url,updated_at').in('id', ids);
  if (error) throw mapSupabaseError(error);
  return data || [];
};

export const getFollowing = async () => {
  const user = await requireUser();
  // 申請中: 自分が送った未承認の申請
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('invalidation_flag', 0)
    .eq('approved', false);
  if (error) throw mapSupabaseError(error);
  return { users: await listProfiles((data || []).map((x) => x.following_id)) };
};

export const getFollowers = async () => {
  const user = await requireUser();
  // リクエスト: 相手が送った申請（承認済み含む）
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id,approved')
    .eq('following_id', user.id)
    .eq('invalidation_flag', 0);
  if (error) throw mapSupabaseError(error);
  // 自分がフォローしているか、かつ承認済みか確認
  const { data: myFollows } = await supabase
    .from('follows')
    .select('following_id,approved')
    .eq('follower_id', user.id)
    .eq('invalidation_flag', 0);
  const myFollowMap = new Map((myFollows || []).map((x) => [x.following_id, x.approved]));
  // approved と is_following を付与、フレンドは除外
  const approvedMap = new Map((data || []).map((x) => [x.follower_id, x.approved]));
  const nonFriendIds = (data || [])
    .filter((x) => {
      const theirApproved = x.approved;
      const myApproved = myFollowMap.get(x.follower_id);
      const isFriend = theirApproved === true && myApproved === true;
      return !isFriend;
    })
    .map((x) => x.follower_id);
  const users = await listProfiles(nonFriendIds);
  return {
    users: users.map((u) => ({
      ...u,
      approved: approvedMap.get(u.id) ?? false,
      is_following: myFollowMap.has(u.id),
    })),
  };
};

export const getFriends = async () => {
  const user = await requireUser();
  return { users: await getFriendsList(user.id) };
};

export const getOtherUserRecords = async (userId) => {
  const viewer = await requireUser();
  if (viewer.id !== userId) {
    const st = await getFollowStatus(viewer.id, userId);
    if (!st.is_friend) return { records: [], is_friend: false };
  }
  const { data, error } = await supabase
    .from('posts')
    .select(POST_LIST_COLS)
    .eq('user_id', userId)
    .eq('invalidation_flag', FLAG_ACTIVE)
    .order('date_logged', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw mapSupabaseError(error);
  const catMap = await categoryIdsMapForPosts((data || []).map((p) => p.id));
  return { records: attachCategoriesToPostRows(data, catMap), is_friend: true };
};

export const follow = async (followingId) => {
  const user = await requireUser();
  // 新規申請: approved = false
  const { error } = await supabase
    .from('follows')
    .upsert(
      { follower_id: user.id, following_id: followingId, invalidation_flag: 0, deleted_at: null, approved: false },
      { onConflict: 'follower_id,following_id' }
    );
  if (error) throw mapSupabaseError(error);
  const status = await getFollowStatus(user.id, followingId);
  return { message: '申請を送りました。', following: true, is_friend: status.is_friend };
};

export const approveFollow = async (followerId) => {
  const user = await requireUser();
  // 相手からの申請を承認（approved = true）
  const { error } = await supabase
    .from('follows')
    .update({ approved: true })
    .eq('follower_id', followerId)
    .eq('following_id', user.id)
    .eq('invalidation_flag', 0);
  if (error) throw mapSupabaseError(error);

  const status = await getFollowStatus(user.id, followerId);
  return { message: '承認しました。', is_friend: status.is_friend };
};

export const unfollow = async (followingId) => {
  const user = await requireUser();
  const { error } = await supabase
    .from('follows')
    .update({ invalidation_flag: 1, deleted_at: new Date().toISOString() })
    .eq('follower_id', user.id)
    .eq('following_id', followingId);
  if (error) throw mapSupabaseError(error);
  return { message: 'フォローを解除しました。', following: false, is_friend: false };
};

export const rejectIncomingFollow = async (followerId) => {
  const user = await requireUser();
  const { error } = await supabase
    .from('follows')
    .update({ invalidation_flag: 1, deleted_at: new Date().toISOString() })
    .eq('follower_id', followerId)
    .eq('following_id', user.id);
  if (error) throw mapSupabaseError(error);
  return { message: '申請を却下しました。', rejected: true };
};

export const getTimeline = async () => {
  const { data, error } = await supabase.rpc('get_timeline_posts');
  if (error) throw mapSupabaseError(error);
  // user_id を author_id にマッピング
  const records = (data || []).map((r) => ({
    ...r,
    author_id: r.user_id,
  }));
  return { records, memoryResurface: null };
};

export const addReaction = async (recordId, emoji) => {
  if (!ALLOWED_EMOJIS.includes(emoji)) {
    throw new Error('許可されていない絵文字です。');
  }
  const user = await requireUser();
  const { error } = await supabase
    .from('reactions')
    .upsert({ post_id: recordId, user_id: user.id, emoji });
  if (error) throw mapSupabaseError(error);
  return { success: true };
};

export const getReactionSummary = async (recordId) => {
  const { data, error } = await supabase.from('reactions').select('emoji').eq('post_id', recordId);
  if (error) throw mapSupabaseError(error);
  const summaryMap = {};
  (data || []).forEach((r) => {
    summaryMap[r.emoji] = (summaryMap[r.emoji] || 0) + 1;
  });
  return { summary: Object.entries(summaryMap).map(([emoji, count]) => ({ emoji, count })) };
};

export const getReactionDetails = async (recordId) => {
  const { data, error } = await supabase
    .from('reactions')
    .select('emoji,user_id,profiles:user_id(id,user_name,avatar_url,updated_at)')
    .eq('post_id', recordId);
  if (error) throw mapSupabaseError(error);
  const details = (data || []).map((row) => ({
    emoji: row.emoji,
    user_id: row.user_id,
    user_name: row.profiles?.user_name || '',
    avatar_url: row.profiles?.avatar_url || null,
    avatar_updated_at: row.profiles?.updated_at ?? null,
  }));
  return { details };
};
