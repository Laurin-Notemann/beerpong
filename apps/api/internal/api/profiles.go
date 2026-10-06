package api

import (
	"context"
	"errors"
	"slices"

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
		out[i] = s.toProfileDTO(p)
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
				created = profileCreatedDTO{profileDTO: s.toProfileDTO(existing), Reactivated: true, LastActiveSeasonID: &seasonID}
				return ok(created), nil
			case !notFound(err):
				return nil, err
			}
			// No player this season: continue from the most recent one.
			created = profileCreatedDTO{profileDTO: s.toProfileDTO(existing)}
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
		created = profileCreatedDTO{profileDTO: s.toProfileDTO(profile)}
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
	return ok(s.toProfileDTO(profile))
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
	dto := s.toProfileDTO(updated)
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

// profileAsset is a picture or video a profile carries: its avatar or its
// score clips. Both are set and removed the same way.
type profileAsset struct {
	typ      int16
	current  func(db.Profile) []string
	set      func(ctx context.Context, q *db.Queries, profileID string, assetIDs []string) (db.Profile, error)
	none     errorCode
	setEvent string
	delEvent string
}

// maxScoreClips is how many score clips a profile can have; one of them plays
// at random when the player scores
const maxScoreClips = 10

var (
	profileAvatar = profileAsset{
		typ: assetProfileAvatar,
		current: func(p db.Profile) []string {
			if p.AssetIDAvatar == nil {
				return nil
			}
			return []string{*p.AssetIDAvatar}
		},
		set: func(ctx context.Context, q *db.Queries, id string, assetIDs []string) (db.Profile, error) {
			var assetID *string
			if len(assetIDs) > 0 {
				assetID = &assetIDs[0]
			}
			return q.SetProfileAvatar(ctx, db.SetProfileAvatarParams{ID: id, AssetIDAvatar: assetID})
		},
		none:     errProfileHasNoAvatar,
		setEvent: "profileAvatarSet",
		delEvent: "profileAvatarDelete",
	}
	// the clips Versus TV plays when the player scores in a live match
	profileScoreClip = profileAsset{
		typ:     assetProfileScoreClip,
		current: func(p db.Profile) []string { return p.AssetIdsScoreClips },
		set: func(ctx context.Context, q *db.Queries, id string, assetIDs []string) (db.Profile, error) {
			if assetIDs == nil {
				assetIDs = []string{}
			}
			return q.SetProfileScoreClips(ctx, db.SetProfileScoreClipsParams{ID: id, AssetIds: assetIDs})
		},
		none:     errProfileHasNoScoreClip,
		setEvent: "profileScoreClipSet",
		delEvent: "profileScoreClipDelete",
	}
)

func (s *Server) setAvatar(r *request) response {
	c, res := readCrop(r)
	if res != nil {
		return res
	}
	return s.setProfileAsset(r, profileAvatar, c)
}

func (s *Server) deleteAvatar(r *request) response {
	return s.deleteProfileAsset(r, profileAvatar)
}

// setScoreClip replaces all the profile's score clips with a new one (what app
// versions before several clips do). It takes no body: a video has no crop.
func (s *Server) setScoreClip(r *request) response {
	return s.setProfileAsset(r, profileScoreClip, crop{})
}

// deleteScoreClip removes all the profile's score clips.
func (s *Server) deleteScoreClip(r *request) response {
	return s.deleteProfileAsset(r, profileScoreClip)
}

// addScoreClip adds a score clip next to the profile's others and answers
// where to upload it.
func (s *Server) addScoreClip(r *request) response {
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
		if len(profile.AssetIdsScoreClips) >= maxScoreClips {
			return fail(errProfileScoreClipLimit), nil
		}
		asset, err := insertAsset(ctx, q, assetProfileScoreClip, crop{})
		if err != nil {
			return nil, err
		}
		if _, err := q.AddProfileScoreClip(ctx, db.AddProfileScoreClipParams{ID: profileID, AssetID: asset.ID}); err != nil {
			return nil, err
		}
		upload, err := s.assetUpload(r, asset)
		if err != nil {
			return nil, err
		}
		return ok(upload), nil
	})
	if o, isOK := res.(okResponse); isOK {
		s.hub.Publish(r.path("groupId"), realtime.Assets, profileScoreClip.setEvent, o.data)
	}
	return res
}

// removeScoreClip removes one of the profile's score clips.
func (s *Server) removeScoreClip(r *request) response {
	if res := s.profileInGroup(r); res != nil {
		return res
	}
	profileID, assetID := r.path("id"), r.path("assetId")
	ctx := r.Context()
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		profile, err := q.GetProfile(ctx, profileID)
		if err != nil {
			return nil, err
		}
		if !slices.Contains(profile.AssetIdsScoreClips, assetID) {
			return fail(errProfileHasNoScoreClip), nil
		}
		updated, err := q.RemoveProfileScoreClip(ctx, db.RemoveProfileScoreClipParams{ID: profileID, AssetID: assetID})
		if err != nil {
			return nil, err
		}
		if err := s.deleteAsset(ctx, q, assetID); err != nil {
			return nil, err
		}
		return ok(s.toProfileDTO(updated)), nil
	})
	if o, isOK := res.(okResponse); isOK {
		s.hub.Publish(r.path("groupId"), realtime.Assets, profileScoreClip.delEvent, o.data)
	}
	return res
}

// setProfileAsset replaces the profile's asset with a new one and answers
// where to upload it.
func (s *Server) setProfileAsset(r *request, a profileAsset, c crop) response {
	if res := s.profileInGroup(r); res != nil {
		return res
	}
	if !c.valid() {
		return fail(errAssetValidationFailed)
	}
	profileID := r.path("id")
	ctx := r.Context()
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		profile, err := q.GetProfile(ctx, profileID)
		if err != nil {
			return nil, err
		}
		asset, err := insertAsset(ctx, q, a.typ, c)
		if err != nil {
			return nil, err
		}
		if _, err := a.set(ctx, q, profileID, []string{asset.ID}); err != nil {
			return nil, err
		}
		for _, old := range a.current(profile) {
			if err := s.deleteAsset(ctx, q, old); err != nil {
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
		s.hub.Publish(r.path("groupId"), realtime.Assets, a.setEvent, o.data)
	}
	return res
}

func (s *Server) deleteProfileAsset(r *request, a profileAsset) response {
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
		old := a.current(profile)
		if len(old) == 0 {
			return fail(a.none), nil
		}
		updated, err := a.set(ctx, q, profileID, nil)
		if err != nil {
			return nil, err
		}
		for _, id := range old {
			if err := s.deleteAsset(ctx, q, id); err != nil {
				return nil, err
			}
		}
		return ok(s.toProfileDTO(updated)), nil
	})
	if o, isOK := res.(okResponse); isOK {
		s.hub.Publish(r.path("groupId"), realtime.Assets, a.delEvent, o.data)
	}
	return res
}
