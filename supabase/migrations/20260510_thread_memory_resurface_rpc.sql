-- スレッド「過去の投稿」再表示 RPC
-- ユーザーが当日（クライアント TZ）初めてスレッドを取得したタイミングで呼ぶ。
-- フリー: 1年前の同日のみ。Plus: 1M/3M/6M/1Y/3Y/5Y 前の同日をすべて返す。
-- 記録なし時は空行セット（0行）。専用テーブルは不要。

create or replace function public.get_thread_memory_resurface(
    p_client_tz text default 'Asia/Tokyo'
)
returns table (
    id bigint,
    author_id uuid,
    author_name text,
    author_avatar_url text,
    author_profile_updated_at timestamptz,
    title text,
    description text,
    date_logged date,
    image_url text,
    my_reaction text,
    horizon text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_tz   text;
    v_today date;
    v_uid  uuid;
begin
    -- タイムゾーン検証: 不正な値は Asia/Tokyo にフォールバック
    v_tz := coalesce(nullif(trim(p_client_tz), ''), 'Asia/Tokyo');
    begin
        v_today := (now() at time zone v_tz)::date;
    exception when others then
        v_tz    := 'Asia/Tokyo';
        v_today := (now() at time zone v_tz)::date;
    end;

    v_uid := auth.uid();

    if public.is_current_user_premium() then
        -- Plus プラン: 直近から遠い順 (1M → 3M → 6M → 1Y → 3Y → 5Y)

        return query
            select p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
                   p.title::text, p.description, p.date_logged::date, p.image_url::text,
                   react.emoji::text, '1M'::text
            from public.posts p
            join public.profiles pr on pr.id = p.user_id
            left join public.reactions react
                on react.post_id = p.id and react.user_id = v_uid
            where p.user_id = v_uid
              and public.invalidation_flag_is_active(p.invalidation_flag)
              and p.date_logged::date = (v_today - interval '1 month')::date
            order by p.id desc;

        return query
            select p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
                   p.title::text, p.description, p.date_logged::date, p.image_url::text,
                   react.emoji::text, '3M'::text
            from public.posts p
            join public.profiles pr on pr.id = p.user_id
            left join public.reactions react
                on react.post_id = p.id and react.user_id = v_uid
            where p.user_id = v_uid
              and public.invalidation_flag_is_active(p.invalidation_flag)
              and p.date_logged::date = (v_today - interval '3 months')::date
            order by p.id desc;

        return query
            select p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
                   p.title::text, p.description, p.date_logged::date, p.image_url::text,
                   react.emoji::text, '6M'::text
            from public.posts p
            join public.profiles pr on pr.id = p.user_id
            left join public.reactions react
                on react.post_id = p.id and react.user_id = v_uid
            where p.user_id = v_uid
              and public.invalidation_flag_is_active(p.invalidation_flag)
              and p.date_logged::date = (v_today - interval '6 months')::date
            order by p.id desc;

        return query
            select p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
                   p.title::text, p.description, p.date_logged::date, p.image_url::text,
                   react.emoji::text, '1Y'::text
            from public.posts p
            join public.profiles pr on pr.id = p.user_id
            left join public.reactions react
                on react.post_id = p.id and react.user_id = v_uid
            where p.user_id = v_uid
              and public.invalidation_flag_is_active(p.invalidation_flag)
              and p.date_logged::date = (v_today - interval '1 year')::date
            order by p.id desc;

        return query
            select p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
                   p.title::text, p.description, p.date_logged::date, p.image_url::text,
                   react.emoji::text, '3Y'::text
            from public.posts p
            join public.profiles pr on pr.id = p.user_id
            left join public.reactions react
                on react.post_id = p.id and react.user_id = v_uid
            where p.user_id = v_uid
              and public.invalidation_flag_is_active(p.invalidation_flag)
              and p.date_logged::date = (v_today - interval '3 years')::date
            order by p.id desc;

        return query
            select p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
                   p.title::text, p.description, p.date_logged::date, p.image_url::text,
                   react.emoji::text, '5Y'::text
            from public.posts p
            join public.profiles pr on pr.id = p.user_id
            left join public.reactions react
                on react.post_id = p.id and react.user_id = v_uid
            where p.user_id = v_uid
              and public.invalidation_flag_is_active(p.invalidation_flag)
              and p.date_logged::date = (v_today - interval '5 years')::date
            order by p.id desc;

    else
        -- フリープラン: 1年前のみ
        return query
            select p.id, p.user_id, pr.user_name::text, pr.avatar_url, pr.updated_at,
                   p.title::text, p.description, p.date_logged::date, p.image_url::text,
                   react.emoji::text, '1Y'::text
            from public.posts p
            join public.profiles pr on pr.id = p.user_id
            left join public.reactions react
                on react.post_id = p.id and react.user_id = v_uid
            where p.user_id = v_uid
              and public.invalidation_flag_is_active(p.invalidation_flag)
              and p.date_logged::date = (v_today - interval '1 year')::date
            order by p.id desc;

    end if;
end;
$$;

revoke all on function public.get_thread_memory_resurface(text) from public;
grant execute on function public.get_thread_memory_resurface(text) to authenticated;
