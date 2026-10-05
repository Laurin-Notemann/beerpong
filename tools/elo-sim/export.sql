-- One group's games, one row per move (or per player without moves), for
-- make-page.sh. Read only. psql -v group_id=<id> -f export.sql
COPY (
  SELECT s.id, coalesce(s.name, 'Running season'), m.id, m.date, t.id, tm.id,
         coalesce(pr.name, '?'), coalesce(rm.name, ''), coalesce(mm.value, 0),
         coalesce(rm.points_for_scorer, 0), coalesce(rm.points_for_team, 0),
         coalesce(rm.finishing_move, false), coalesce(rm.cups, -1)
  FROM matches m
  JOIN seasons s ON s.id = m.season_id
  JOIN teams t ON t.match_id = m.id
  JOIN team_members tm ON tm.team_id = t.id
  JOIN players p ON p.id = tm.player_id
  LEFT JOIN profiles pr ON pr.id = p.profile_id
  LEFT JOIN match_moves mm ON mm.team_member_id = tm.id
  LEFT JOIN rule_moves rm ON rm.id = mm.move_id
  WHERE s.group_id = :'group_id'
  ORDER BY m.date, t.id, pr.name, rm.name
) TO STDOUT WITH CSV HEADER;
