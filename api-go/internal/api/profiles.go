package api

import (
	"errors"

	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// groupExists answers 404 groupNotFound for unknown groups.
func (s *Server) groupExists(r *request) response {
	exists, err := s.q.GroupExists(r.Context(), r.path("groupId"))
	if err != nil {
		return internal(err)
	}
	if !exists {
		return fail(errGroupNotFound)
	}
	return nil
}

func readProfileName(r *request) (*string, response) {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return nil, res
	}
	o, err := asObject(body)
	if err != nil {
		return nil, springError(400)
	}
	name, err := o.str("name")
	if err != nil {
		return nil, springError(400)
	}
	return name, nil
}

func (s *Server) listProfiles(r *request) response {
	if res := s.groupExists(r); res != nil {
		return res
	}
	rows, err := s.q.ProfilesByGroup(r.Context(), ptr(r.path("groupId")))
	if err != nil {
		return internal(err)
	}
	out := make([]profileDTO, len(rows))
	for i, p := range rows {
		out[i] = toProfileDTO(p)
	}
	return ok(out)
}

// createProfile adds a player to the group. A name that already exists in the
// group brings the existing profile back into the active season instead.
func (s *Server) createProfile(r *request) response {
	name, res := readProfileName(r)
	if res != nil {
		return res
	}
	if res := s.groupExists(r); res != nil {
		return res
	}
	groupID := r.path("groupId")
	ctx := r.Context()
	var created profileCreatedDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		existing, err := q.ProfileByGroupAndName(ctx, db.ProfileByGroupAndNameParams{GroupID: &groupID, Name: name})
		if err == nil {
			seasonID, err := q.ActiveSeasonIDOfGroup(ctx, &groupID)
			if err != nil {
				return nil, err
			}
			playerID, err := q.PlayerIDByProfileAndSeason(ctx, db.PlayerIDByProfileAndSeasonParams{ProfileID: &existing.ID, SeasonID: &seasonID})
			switch {
			case err == nil:
				player, err := q.GetPlayerWithSeason(ctx, playerID)
				if err != nil {
					return nil, err
				}
				if player.Player.ActiveThisSeason {
					return fail(errProfileAlreadyExists), nil
				}
				if err := q.SetPlayerActive(ctx, db.SetPlayerActiveParams{ID: playerID, ActiveThisSeason: true}); err != nil {
					return nil, err
				}
				created = profileCreatedDTO{profileDTO: toProfileDTO(existing), Reactivated: true, LastActiveSeasonID: &seasonID}
				return ok(created), nil
			case !notFound(err):
				return nil, err
			}
			// No player this season: continue from the most recent one.
			created = profileCreatedDTO{profileDTO: toProfileDTO(existing)}
			last, err := q.LatestPlayerOfProfile(ctx, &existing.ID)
			if notFound(err) {
				return ok(created), nil
			}
			if err != nil {
				return nil, err
			}
			if last.Points == nil {
				return nil, errors.New("latest player has no statistics")
			}
			stats := leaderboard.Stats{
				Points: *last.Points, Matches: deref(last.Matches), Wins: deref(last.Wins), Moves: deref(last.Moves),
				TotalTeamSize: deref(last.TotalTeamSize), AvgPointsPerMatch: deref(last.AvgPointsPerMatch),
				AvgTeamSize: deref(last.AvgTeamSize), Elo: deref(last.Elo),
			}
			if err := insertPlayers(ctx, q, []newPlayer{{profileID: existing.ID, seasonID: seasonID, active: true, stats: stats}}); err != nil {
				return nil, err
			}
			created.LastActiveSeasonID = last.SeasonID
			return ok(created), nil
		}
		if !notFound(err) {
			return nil, err
		}

		memberID, err := s.membershipID(r, q, groupID)
		if err != nil {
			return nil, err
		}
		if memberID == "" {
			return springError(403), nil
		}
		group, err := q.GetGroup(ctx, groupID)
		if err != nil {
			return nil, err
		}
		if group.ActiveSeasonID == nil {
			return nil, errors.New("group has no active season")
		}
		profile, err := q.InsertProfile(ctx, db.InsertProfileParams{ID: uuid.NewString(), Name: name, GroupID: &groupID, CreatedBy: &memberID})
		if err != nil {
			return nil, err
		}
		if err := insertPlayers(ctx, q, []newPlayer{{profileID: profile.ID, seasonID: *group.ActiveSeasonID, active: true, stats: freshStats()}}); err != nil {
			return nil, err
		}
		created = profileCreatedDTO{profileDTO: toProfileDTO(profile)}
		return ok(created), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.Profiles, "profileCreate", created)
	}
	return res
}

func (s *Server) getProfile(r *request) response {
	if res := s.groupExists(r); res != nil {
		return res
	}
	profile, err := s.q.GetProfile(r.Context(), r.path("id"))
	if notFound(err) || (err == nil && deref(profile.GroupID) != r.path("groupId")) {
		return fail(errProfileNotFound)
	}
	if err != nil {
		return internal(err)
	}
	return ok(toProfileDTO(profile))
}

func (s *Server) updateProfile(r *request) response {
	name, res := readProfileName(r)
	if res != nil {
		return res
	}
	if res := s.groupExists(r); res != nil {
		return res
	}
	groupID := r.path("groupId")
	profile, err := s.q.GetProfile(r.Context(), r.path("id"))
	if notFound(err) {
		return fail(errProfileNotFound)
	}
	if err != nil {
		return internal(err)
	}
	if deref(profile.GroupID) != groupID {
		return fail(errProfileNotOfGroup)
	}
	updated, err := s.q.UpdateProfileName(r.Context(), db.UpdateProfileNameParams{ID: profile.ID, Name: name})
	if err != nil {
		return internal(err)
	}
	dto := toProfileDTO(updated)
	s.hub.Publish(groupID, realtime.Profiles, "profileUpdate", dto)
	return ok(dto)
}

// profileInGroup answers 404 profileNotFound unless the path's profile
// belongs to the path's group.
func (s *Server) profileInGroup(r *request) response {
	if res := s.groupExists(r); res != nil {
		return res
	}
	exists, err := s.q.ProfileExistsInGroup(r.Context(), db.ProfileExistsInGroupParams{ID: r.path("id"), GroupID: ptr(r.path("groupId"))})
	if err != nil {
		return internal(err)
	}
	if !exists {
		return fail(errProfileNotFound)
	}
	return nil
}

func (s *Server) setAvatar(r *request) response {
	c, res := readCrop(r)
	if res != nil {
		return res
	}
	if res := s.profileInGroup(r); res != nil {
		return res
	}
	if !c.valid() {
		return fail(errAssetValidationFailed)
	}
	profileID := r.path("id")
	ctx := r.Context()
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		profile, err := q.GetProfile(ctx, profileID)
		if err != nil {
			return nil, err
		}
		asset, err := insertAsset(ctx, q, assetProfileAvatar, c)
		if err != nil {
			return nil, err
		}
		if _, err := q.SetProfileAvatar(ctx, db.SetProfileAvatarParams{ID: profileID, AssetIDAvatar: &asset.ID}); err != nil {
			return nil, err
		}
		if profile.AssetIDAvatar != nil {
			if err := s.deleteAsset(ctx, q, *profile.AssetIDAvatar); err != nil {
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
		s.hub.Publish(r.path("groupId"), realtime.Assets, "profileAvatarSet", o.data)
	}
	return res
}

func (s *Server) deleteAvatar(r *request) response {
	if res := s.profileInGroup(r); res != nil {
		return res
	}
	profileID := r.path("id")
	ctx := r.Context()
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		profile, err := q.GetProfile(ctx, profileID)
		if err != nil {
			return nil, err
		}
		if profile.AssetIDAvatar == nil {
			return fail(errProfileHasNoAvatar), nil
		}
		updated, err := q.SetProfileAvatar(ctx, db.SetProfileAvatarParams{ID: profileID})
		if err != nil {
			return nil, err
		}
		if err := s.deleteAsset(ctx, q, *profile.AssetIDAvatar); err != nil {
			return nil, err
		}
		return ok(toProfileDTO(updated)), nil
	})
	if o, isOK := res.(okResponse); isOK {
		// Addressed to the profile id, as the Java backend did.
		s.hub.Publish(profileID, realtime.Assets, "profileAvatarDelete", o.data)
	}
	return res
}
