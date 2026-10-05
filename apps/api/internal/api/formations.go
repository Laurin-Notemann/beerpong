package api

import (
	"encoding/json"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// A group's formations, to re-rack cups into during a match. The app makes
// the ids, so creating one is a PUT that a retry repeats safely.

const (
	maxFormationName  = 50
	maxFormationCoord = 6 // the app's cup grid is 7x7
	maxFormationCups  = 49
)

func (s *Server) listFormations(r *request) response {
	rows, err := s.q.FormationsByGroup(r.Context(), r.path("groupId"))
	if err != nil {
		return internal(err)
	}
	out := make([]formationDTO, len(rows))
	for i, row := range rows {
		if out[i], err = toFormationDTO(row); err != nil {
			return internal(err)
		}
	}
	return ok(out)
}

// readFormation binds and checks a formation's name and cups.
func readFormation(r *request) (string, []cupPositionDTO, response) {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return "", nil, res
	}
	o, err := asObject(body)
	if err != nil {
		return "", nil, springError(400)
	}
	name, err := o.str("name")
	if err != nil {
		return "", nil, springError(400)
	}
	items, _, err := o.list("cups")
	if err != nil {
		return "", nil, springError(400)
	}
	cups := make([]cupPositionDTO, len(items))
	seen := map[[2]int32]bool{}
	for i, item := range items {
		co, err := asObject(item)
		if err != nil || co == nil {
			return "", nil, fail(errInvalidFormation)
		}
		if cups[i], err = parseCup(co); err != nil {
			return "", nil, springError(400)
		}
		c := cups[i]
		if c.X == nil || c.Y == nil || *c.X < 0 || *c.X > maxFormationCoord || *c.Y < 0 || *c.Y > maxFormationCoord {
			return "", nil, fail(errInvalidFormation)
		}
		key := [2]int32{*c.X, *c.Y}
		if seen[key] {
			return "", nil, fail(errInvalidFormation)
		}
		seen[key] = true
	}
	if name == nil {
		return "", nil, fail(errInvalidFormation)
	}
	trimmed := strings.TrimSpace(*name)
	if trimmed == "" || utf8.RuneCountInString(trimmed) > maxFormationName || len(cups) == 0 || len(cups) > maxFormationCups {
		return "", nil, fail(errInvalidFormation)
	}
	return trimmed, cups, nil
}

func (s *Server) putFormation(r *request) response {
	name, cups, res := readFormation(r)
	if res != nil {
		return res
	}
	groupID, id := r.path("groupId"), r.path("id")
	if !isUUID(id) {
		return fail(errInvalidFormation)
	}
	encoded, err := json.Marshal(cups)
	if err != nil {
		return internal(err)
	}
	ctx := r.Context()
	var saved formationDTO
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		memberID, err := s.membershipID(r, q, groupID)
		if err != nil {
			return nil, err
		}
		if memberID == "" {
			return fail(errAuthUserNotInGroup), nil
		}
		row, err := q.UpsertFormation(ctx, db.UpsertFormationParams{
			ID: id, GroupID: groupID, Name: name, Cups: string(encoded), CreatedBy: memberID,
			CreatedAt: s.now().Truncate(time.Microsecond),
		})
		if notFound(err) {
			return fail(errFormationNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		if saved, err = toFormationDTO(row); err != nil {
			return nil, err
		}
		return ok(saved), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.hub.Publish(groupID, realtime.Formations, "formationUpdate", saved)
	}
	return res
}

// deleteFormation is idempotent: deleting one that is gone succeeds and
// announces nothing.
func (s *Server) deleteFormation(r *request) response {
	groupID, id := r.path("groupId"), r.path("id")
	ctx := r.Context()
	var deleted bool
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		memberID, err := s.membershipID(r, q, groupID)
		if err != nil {
			return nil, err
		}
		if memberID == "" {
			return fail(errAuthUserNotInGroup), nil
		}
		n, err := q.DeleteFormation(ctx, db.DeleteFormationParams{ID: id, GroupID: groupID})
		if err != nil {
			return nil, err
		}
		deleted = n > 0
		return ok("OK"), nil
	})
	if _, isOK := res.(okResponse); isOK && deleted {
		s.hub.Publish(groupID, realtime.Formations, "formationDelete", id)
	}
	return res
}
