-- Bảng Xếp Hạng: thêm hạng mục "teamPower" (chiến lực đội hình = tổng lực chiến 3 cá mạnh nhất).
create or replace function public.leaderboard(p_cat text, p_limit int default 50)
returns table (rank bigint, user_id uuid, display_name text, level int, avatar text, title text, score bigint, guild_name text, guild_tag text)
language sql stable security invoker set search_path = public as $$
  with s as (
    select c.*, case p_cat
      when 'level' then c.level::bigint
      when 'caught' then public.stat_num(c.stats, 'caught')
      when 'bosses' then public.stat_num(c.stats, 'bosses')
      when 'dmWins' then public.stat_num(c.stats, 'dmWins')
      when 'junk' then public.stat_num(c.stats, 'junk')
      when 'teamPower' then public.stat_num(c.stats, 'teamPower')
      else 0 end as score
    from player_cards c
  )
  select rank() over (order by s.score desc), s.user_id, s.display_name, s.level, s.avatar,
         case when jsonb_typeof(s.stats -> 'title') = 'string' then left(s.stats ->> 'title', 64) end, s.score, g.name, g.tag
  from s
  left join guild_members m on m.user_id = s.user_id
  left join guilds g on g.id = m.guild_id
  where s.score > 0
  order by s.score desc, s.updated_at
  limit least(greatest(p_limit, 1), 100)
$$;

create or replace function public.my_rank(p_cat text)
returns bigint language sql stable security invoker set search_path = public as $$
  select r.rank from (
    select c.user_id, rank() over (order by case p_cat
      when 'level' then c.level::bigint
      when 'caught' then public.stat_num(c.stats, 'caught')
      when 'bosses' then public.stat_num(c.stats, 'bosses')
      when 'dmWins' then public.stat_num(c.stats, 'dmWins')
      when 'junk' then public.stat_num(c.stats, 'junk')
      when 'teamPower' then public.stat_num(c.stats, 'teamPower')
      else 0 end desc) as rank
    from player_cards c
  ) r where r.user_id = auth.uid()
$$;
