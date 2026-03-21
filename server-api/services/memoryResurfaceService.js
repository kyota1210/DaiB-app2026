const { DateTime } = require('luxon');
const db = require('../db');
const RecordModel = require('../models/RecordModel');

const DEFAULT_TZ = 'Asia/Tokyo';
const MAX_YEARS_BACK = 50;

function normalizeTimezone(raw) {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return DEFAULT_TZ;
    const z = raw.trim();
    const probe = DateTime.now().setZone(z);
    return probe.isValid ? z : DEFAULT_TZ;
}

/**
 * @param {number} userId
 * @param {string} tz IANA
 * @param {import('mysql2/promise').PoolConnection} conn
 */
async function pickNewRecord(userId, tz, conn) {
    const anchor = DateTime.now().setZone(tz).startOf('day');
    for (let y = 1; y <= MAX_YEARS_BACK; y++) {
        const target = anchor.minus({ years: y });
        const loggedDate = target.toISODate();
        const id = await RecordModel.findFirstResurfaceRecordIdByLoggedDate(userId, loggedDate, conn);
        if (id) {
            return { recordId: id, kind: 'anniversary', yearsAgo: y };
        }
    }
    const id = await RecordModel.findRandomResurfaceRecordId(userId, conn);
    if (id) {
        return { recordId: id, kind: 'serendipity', yearsAgo: null };
    }
    return null;
}

function buildMemoryPayload(rowMeta, timelineRecord) {
    if (!timelineRecord) return null;
    return {
        record: { ...timelineRecord, is_memory_resurface: true },
        kind: rowMeta.kind,
        yearsAgo: rowMeta.years_ago != null ? Number(rowMeta.years_ago) : null,
    };
}

/**
 * スレッド用「過去の自分」再浮上を解決する（本人のみ・月1回・表示は発火日のカレンダー1日まで）
 * @param {number} userId
 * @param {string|undefined} clientTimezoneHeader
 * @returns {Promise<{ record: object, kind: string, yearsAgo: number|null }|null>}
 */
async function resolveMemoryResurface(userId, clientTimezoneHeader) {
    const tz = normalizeTimezone(clientTimezoneHeader);
    const nowZ = DateTime.now().setZone(tz);
    const yearMonth = nowZ.toFormat('yyyy-MM');
    const displayLocalDate = nowZ.toISODate();
    const windowEndLocal = DateTime.fromISO(displayLocalDate, { zone: tz }).endOf('day');
    const windowEndUtcJs = windowEndLocal.toUTC().toJSDate();

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [existingRows] = await conn.query(
            'SELECT * FROM user_memory_resurface WHERE user_id = ? AND year_month = ? FOR UPDATE',
            [userId, yearMonth]
        );

        if (existingRows.length > 0) {
            const row = existingRows[0];
            await conn.commit();
            if (new Date() > new Date(row.window_end_utc)) {
                return null;
            }
            const timelineRecord = await RecordModel.findTimelineRowByRecordIdForUser(row.record_id, userId);
            return buildMemoryPayload(row, timelineRecord);
        }

        const picked = await pickNewRecord(userId, tz, conn);
        if (!picked) {
            await conn.commit();
            return null;
        }

        try {
            await conn.query(
                `INSERT INTO user_memory_resurface
                (user_id, year_month, record_id, kind, years_ago, client_timezone, display_local_date, window_end_utc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    yearMonth,
                    picked.recordId,
                    picked.kind,
                    picked.yearsAgo,
                    tz,
                    displayLocalDate,
                    windowEndUtcJs,
                ]
            );
        } catch (e) {
            if (e.code !== 'ER_DUP_ENTRY') {
                await conn.rollback();
                throw e;
            }
            await conn.rollback();
            const [again] = await db.query(
                'SELECT * FROM user_memory_resurface WHERE user_id = ? AND year_month = ?',
                [userId, yearMonth]
            );
            if (!again.length) {
                return null;
            }
            const row = again[0];
            if (new Date() > new Date(row.window_end_utc)) {
                return null;
            }
            const timelineRecord = await RecordModel.findTimelineRowByRecordIdForUser(row.record_id, userId);
            return buildMemoryPayload(row, timelineRecord);
        }

        await conn.commit();
        const timelineRecord = await RecordModel.findTimelineRowByRecordIdForUser(picked.recordId, userId);
        return buildMemoryPayload(
            { kind: picked.kind, years_ago: picked.yearsAgo },
            timelineRecord
        );
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = {
    resolveMemoryResurface,
    normalizeTimezone,
};
