package api

import (
	"strings"

	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

func (s *Server) healthcheck(*request) response { return ok("OK") }

func (s *Server) listPresets(*request) response { return ok(groupPresets) }

func (s *Server) getAsset(r *request) response {
	asset, err := s.q.GetAsset(r.Context(), r.path("id"))
	if notFound(err) {
		return fail(errAssetNotFound)
	}
	if err != nil {
		return internal(err)
	}
	return ok(s.assetMetadata(asset))
}

func (s *Server) createGroup(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	name, err1 := o.str("name")
	profileNames, _, err2 := o.strList("profileNames")
	rawPreset, err3 := o.str("sportPreset")
	custom, err4 := o.str("customSportName")
	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		return springError(400)
	}

	if nameInvalid(name) {
		return fail(errInvalidGroupName)
	}
	if len(profileNames) == 0 {
		return fail(errInvalidGroupProfiles)
	}
	seen := map[string]bool{}
	for _, n := range profileNames {
		if n == nil {
			// The Java validation dereferenced every name.
			return internalf("profile name is null")
		}
		if seen[*n] {
			return fail(errInvalidGroupProfiles)
		}
		seen[*n] = true
	}

	var preset *string
	if presetByID(rawPreset) != nil {
		preset = rawPreset
	}
	if preset != nil && custom != nil {
		custom = nil
	} else if (custom != nil && javaIsBlank(*custom)) || (preset == nil && custom == nil) {
		return fail(errInvalidGroupSport)
	}

	inviteCode, err := randomInviteCode()
	if err != nil {
		return internal(err)
	}
	now := s.now()
	groupID, memberID, seasonID, settingsID := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	ctx := r.Context()

	return s.tx(ctx, func(q *db.Queries) (response, error) {
		if err := q.InsertGroup(ctx, db.InsertGroupParams{
			ID: groupID, CreatedAt: &now, CustomSportName: custom, InviteCode: &inviteCode, Name: name, SportPreset: preset,
		}); err != nil {
			return nil, err
		}
		if err := q.CreateMembership(ctx, db.CreateMembershipParams{ID: memberID, GroupID: &groupID, UserID: &r.userID}); err != nil {
			return nil, err
		}
		if err := insertSettings(ctx, q, defaultSettings(settingsID)); err != nil {
			return nil, err
		}
		if err := q.InsertSeason(ctx, db.InsertSeasonParams{ID: seasonID, GroupID: &groupID, StartDate: &now, SeasonSettingsID: &settingsID, CreatedBy: &memberID}); err != nil {
			return nil, err
		}
		group, err := q.FinishGroupCreation(ctx, db.FinishGroupCreationParams{ID: groupID, ActiveSeasonID: &seasonID, CreatedBy: &memberID})
		if err != nil {
			return nil, err
		}

		profiles := make([]db.InsertProfilesParams, len(profileNames))
		players := make([]newPlayer, len(profileNames))
		for i, n := range profileNames {
			profiles[i] = db.InsertProfilesParams{ID: uuid.NewString(), Name: n, GroupID: &groupID, CreatedBy: &memberID}
			players[i] = newPlayer{profileID: profiles[i].ID, seasonID: seasonID, active: true, stats: freshStats()}
		}
		if _, err := q.InsertProfiles(ctx, profiles); err != nil {
			return nil, err
		}
		if err := insertPlayers(ctx, q, players); err != nil {
			return nil, err
		}

		moves := defaultMoves
		if preset != nil && *preset == "beerpong" {
			moves = defaultBeerpongMoves
		}
		if err := insertRuleMoves(ctx, q, seasonID, moves); err != nil {
			return nil, err
		}
		// Default rules only exist for beerpong (checked on the raw request value).
		if rawPreset != nil && *rawPreset == "beerpong" {
			rules := make([]db.InsertRulesParams, len(defaultBeerpongRules))
			for i, rule := range defaultBeerpongRules {
				rules[i] = db.InsertRulesParams{ID: uuid.NewString(), Title: ptr(rule[0]), Description: ptr(rule[1]), SeasonID: &seasonID, CreatedBy: &memberID, Position: ptr(int32(i))}
			}
			if _, err := q.InsertRules(ctx, rules); err != nil {
				return nil, err
			}
		}
		return ok(toGroupDTO(group)), nil
	})
}

func (s *Server) userGroups(r *request) response {
	rows, err := s.q.UserGroupsWithStats(r.Context(), &r.userID)
	if err != nil {
		return internal(err)
	}
	groups := make([]groupDTO, len(rows))
	for i, row := range rows {
		g := toGroupDTO(row.Group)
		g.NumberOfMatches, g.NumberOfPlayers, g.NumberOfSeasons = row.Matches, row.Players, row.Seasons
		groups[i] = g
	}
	return ok(groups)
}

func (s *Server) findGroupByInviteCode(r *request) response {
	values, present := r.URL.Query()["inviteCode"]
	if !present {
		return springError(400)
	}
	code := strings.Join(values, ",")
	if javaTrimEmpty(code) {
		return fail(errInvalidGroupInviteCode)
	}
	group, err := s.q.GetGroupByInviteCode(r.Context(), &code)
	if notFound(err) {
		return fail(errGroupInviteNotFound)
	}
	if err != nil {
		return internal(err)
	}
	return ok(toGroupDTO(group))
}

func (s *Server) getGroup(r *request) response {
	row, err := s.q.GroupWithStats(r.Context(), r.path("id"))
	if notFound(err) {
		return fail(errGroupNotFound)
	}
	if err != nil {
		return internal(err)
	}
	g := toGroupDTO(row.Group)
	g.NumberOfMatches, g.NumberOfPlayers, g.NumberOfSeasons = row.Matches, row.Players, row.Seasons
	return ok(g)
}

func (s *Server) updateGroup(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	name, err := o.str("name")
	if err != nil {
		return springError(400)
	}
	if _, _, err := o.strList("profileNames"); err != nil {
		return springError(400)
	}
	if nameInvalid(name) {
		return fail(errInvalidGroupName)
	}
	group, err := s.q.UpdateGroupName(r.Context(), db.UpdateGroupNameParams{ID: r.path("id"), Name: name})
	if notFound(err) {
		return fail(errGroupNotFound)
	}
	if err != nil {
		return internal(err)
	}
	dto := toGroupDTO(group)
	s.hub.Publish(group.ID, realtime.Groups, "groupUpdate", dto)
	return ok(dto)
}

func (s *Server) joinGroup(r *request) response {
	groupID := r.path("id")
	ctx := r.Context()
	return s.tx(ctx, func(q *db.Queries) (response, error) {
		member, err := q.AnyMembership(ctx, db.AnyMembershipParams{UserID: &r.userID, GroupID: &groupID})
		switch {
		case err == nil && member.Active:
			return fail(errGroupAlreadyInGroup), nil
		case err == nil:
			return ok("OK"), q.SetMembershipActive(ctx, db.SetMembershipActiveParams{ID: member.ID, Active: true})
		case !notFound(err):
			return nil, err
		}
		exists, err := q.GroupExists(ctx, groupID)
		if err != nil {
			return nil, err
		}
		if !exists {
			// Java answered "already in group" for unknown groups too.
			return fail(errGroupAlreadyInGroup), nil
		}
		return ok("OK"), q.CreateMembership(ctx, db.CreateMembershipParams{ID: uuid.NewString(), GroupID: &groupID, UserID: &r.userID})
	})
}

func (s *Server) leaveGroup(r *request) response {
	memberID, err := s.membershipID(r, s.q, r.path("id"))
	if err != nil {
		return internal(err)
	}
	if memberID == "" {
		return fail(errAuthUserNotInGroup)
	}
	if err := s.q.SetMembershipActive(r.Context(), db.SetMembershipActiveParams{ID: memberID, Active: false}); err != nil {
		return internal(err)
	}
	return ok("OK")
}

func (s *Server) setWallpaper(r *request) response {
	crop, res := readCrop(r)
	if res != nil {
		return res
	}
	groupID := r.path("id")
	group, err := s.q.GetGroup(r.Context(), groupID)
	if notFound(err) {
		return fail(errGroupNotFound)
	}
	if err != nil {
		return internal(err)
	}
	if !crop.valid() {
		return fail(errAssetValidationFailed)
	}
	ctx := r.Context()
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		asset, err := insertAsset(ctx, q, assetGroupWallpaper, crop)
		if err != nil {
			return nil, err
		}
		if _, err := q.SetGroupWallpaper(ctx, db.SetGroupWallpaperParams{ID: groupID, AssetIDWallpaper: &asset.ID}); err != nil {
			return nil, err
		}
		if group.AssetIDWallpaper != nil {
			if err := s.deleteAsset(ctx, q, *group.AssetIDWallpaper); err != nil {
				return nil, err
			}
		}
		upload, err := s.assetUpload(r, asset)
		if err != nil {
			return nil, err
		}
		return ok(upload), nil
	})
	if o, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.Assets, "groupWallpaperSet", o.data)
	}
	return res
}

func (s *Server) deleteWallpaper(r *request) response {
	groupID := r.path("id")
	group, err := s.q.GetGroup(r.Context(), groupID)
	if notFound(err) {
		return fail(errGroupNotFound)
	}
	if err != nil {
		return internal(err)
	}
	if group.AssetIDWallpaper == nil {
		return fail(errGroupHasNoWallpaper)
	}
	ctx := r.Context()
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		updated, err := q.SetGroupWallpaper(ctx, db.SetGroupWallpaperParams{ID: groupID})
		if err != nil {
			return nil, err
		}
		if err := s.deleteAsset(ctx, q, *group.AssetIDWallpaper); err != nil {
			return nil, err
		}
		return ok(toGroupDTO(updated)), nil
	})
	if o, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.Assets, "groupWallpaperDelete", o.data)
	}
	return res
}

var defaultBeerpongMoves = []defaultMove{
	{"Normal", 1, 0, false, nil},
	{"Bomb", 2, 0, false, nil},
	{"Bouncer", 2, 0, false, nil},
	{"Trickshot", 2, 0, false, nil},
	{"Save", 2, 0, false, nil},
	{"Finish - Normal", 1, 3, true, nil},
	{"Finish - Ring of fire", 1, 10, true, nil},
	{"Finish - Ring of water", 1, 10, true, nil},
}

var defaultMoves = []defaultMove{
	{"Normal", 1, 0, false, nil},
	{"Finish - Normal", 1, 3, true, nil},
}

type defaultMove struct {
	name            string
	pointsForScorer int32
	pointsForTeam   int32
	finish          bool
	cups            *int32 // nil: the default for the name
}

var defaultBeerpongRules = [][2]string{
	{"Teams", "The two teams can have any size, and they don't have to have the same number of players."},
	{"Cup Setup", "Ten cups per side are to be arranged in a pyramid pointing towards the opponent. The back row must be no further from the table edge than one cup diameter. All cups are to be filled with the same amount of liquid, preferably halfway full."},
	{"Number of Balls", "Each side throws at least two balls. If there are three or more players per side, increase the ball count by one per extra player."},
	{"Turn Order", "All players on one team throw their balls, then all players on the other team, alternating back and forth. Within a team, there's no fixed order."},
	{"Guest Throws", "At any point, any player may allow anyone to use their turn, and throw a ball for their team. This includes non-players, players of their own team, or even the opponent."},
	{"Elbow Rule", "Your elbow must be behind the edge of the table when you throw a ball."},
	{"Rearranging", "Each team can tell their opponent to rearrange their cups exactly once a match, into any shape they’d like. The formation must not be longer than four cups in a line, otherwise the cups would be too close to the opponent."},
	{"Blowing", "You may blow spinning balls out of your own cups, without touching the ball. In order to count, the ball must not have touched the liquid, and opponents may inspect it to confirm that it's dry."},
	{"Rebounds", "Balls that bounce off opponent cups may be caught by the throwing side and re-thrown, provided the ball hasn't hit the floor and you haven't stepped around the table edge to catch it."},
	{"Special Rules for ≤ 3 Cups", "Any special rules for bouncers, multiple hits, or balls back apply only when at least 4 cups remain at the start of the round—not when 3 cups are left for re-racking."},
	{"Bouncers", "Balls may bounce on the table any number of times. A ball that bounces once and is then caught or swatted does not count. A successful \"bouncer\" counts as two hits, and you choose one extra cup for the opponent to remove. If the ball hits anything other than a player, cup, or table, it doesn't count at all."},
	{"Multiple Hits in One Cup", "If two or more balls land in the same cup, you may select one additional cup per extra ball to count as hit. Only applies if ≥\u20094 cups remained at the start of the round and follows any balls back. With ≤\u20093 cups at start, each ball must hit its own cup."},
	{"Balls Back", "(1) If you hit with every ball in a round, you earn “balls back” and throw again—multiple times per round if you keep clearing.\n  (2) You may combine bouncers and balls back; cups to drink are cumulative.\n  (3) If balls back leaves 6, 3, or another racking number of cups, re-racking waits until the next round start."},
	{"Ring of Death", "If you hit only the three corner cups plus the center cup, that's a “Ring of Death.” The defender drinks every cup and loses immediately—no extra throws. Only possible with an even number of pyramid rows (e.g., 10 or 21 cups).\n  (1) No re-rolls after a Ring of Death. If achieved on extra throws, the opponent must drink 6 cups, then play a sudden-death overtime with 1 cup each."},
	{"Distractions", "You may distract opponents by moving beside, behind, or over the cups—but must stop as the throw happens. If you distract over the table and hit an opponent's body, you assign a penalty cup for them to drink. If the ball touches a defender then hits a cup, that cup is drunk (bouncer rules apply). A rebound off a defender behind the table that hits a cup is not a penalty—only the cup is drunk (with bouncer rules)."},
	{"Knocking Over Your Own Cup", "If you knock over your own cup, it always counts as a hit."},
	{"Hitting Your Own Cup", "If you hit your own cup or a rebound off an opponent hits your cup you drink it, even if the ball bounced outside the table first. If it bounced on the table before rebounding, it counts as a bouncer."},
	{"Knocking Over a Opponent's Cup", "If an opponent's cup is knocked over but still contains liquid, they may place it back. It does not count as hit, even if the ball is inside. Only a fully emptied cup counts as hit."},
	{"Saves", "When a team's last cup is hit, this is not a game over! They have one last full turn to hit all of their opponent's cups in return. If they are successful, both teams place one cup back on the table, and the game continues."},
}
