package api

import (
	"strings"

	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/auth"
	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
)

// isGroupsPath matches Spring's "/groups/**": everything under /groups needs
// a valid access token.
func isGroupsPath(path string) bool {
	return path == "/groups" || strings.HasPrefix(path, "/groups/")
}

// membershipExempt lists the /groups paths that need a user but no
// membership in the group: listing and creating groups, lookups by invite
// code, and joining.
func membershipExempt(path string) bool {
	if path == "/groups" || path == "/groups/user" {
		return true
	}
	segments := strings.Split(strings.TrimPrefix(path, "/groups/"), "/")
	return len(segments) == 2 && segments[0] != "" && segments[1] == "join"
}

// groupIDFromPath is the first segment after /groups/ ("" when there is none).
func groupIDFromPath(path string) string {
	rest, found := strings.CutPrefix(path, "/groups/")
	if !found {
		return ""
	}
	id, _, _ := strings.Cut(rest, "/")
	return id
}

// authenticate is the JWT filter in front of /groups/**. It answers with the
// same plain-text 401s the Java filter wrote.
func (s *Server) authenticate(r *request) response {
	header := r.Header.Get("Authorization")
	if strings.TrimSpace(header) == "" || !strings.HasPrefix(header, "Bearer ") {
		return plainUnauthorized("Missing or invalid Authorization header!")
	}
	token := header[len("Bearer "):]
	if strings.TrimSpace(token) == "" {
		return plainUnauthorized("Invalid access token or invalid user-id!")
	}
	userID, valid, err := s.tokens.Subject(token, auth.TypeAccess)
	if err != nil {
		return internal(err)
	}
	if !valid {
		return plainUnauthorized("Invalid access token or invalid user-id!")
	}
	check, err := s.q.AuthorizeRequest(r.Context(), db.AuthorizeRequestParams{UserID: userID, GroupID: ptr(groupIDFromPath(r.URL.Path))})
	if err != nil {
		return internal(err)
	}
	if !check.UserExists {
		return plainUnauthorized("Invalid access token or invalid user-id!")
	}
	if !membershipExempt(r.URL.Path) && !check.IsMember {
		return plainUnauthorized("No access to this group!")
	}
	r.userID = userID
	return nil
}

func (s *Server) signup(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	installation, err := o.enum("installationType", installationTypes)
	if err != nil {
		return springError(400)
	}
	deviceID, err := o.str("deviceId")
	if err != nil {
		return springError(400)
	}
	if deviceID == nil || javaTrimEmpty(*deviceID) || installation == nil {
		return fail(errAuthRegisterInvalidDto)
	}

	userID := uuid.NewString()
	return s.tx(r.Context(), func(q *db.Queries) (response, error) {
		if err := q.CreateUser(r.Context(), userID); err != nil {
			return nil, err
		}
		if err := q.CreateDevice(r.Context(), db.CreateDeviceParams{ID: uuid.NewString(), Type: installation, DeviceID: deviceID, UserID: &userID}); err != nil {
			return nil, err
		}
		token, err := s.tokens.Refresh(userID)
		if err != nil {
			return nil, err
		}
		return ok(authTokenDTO{Token: token, Type: "REFRESH"}), nil
	})
}

func (s *Server) refresh(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	refreshToken, err := o.str("refreshToken")
	if err != nil {
		return springError(400)
	}
	if refreshToken == nil || javaTrimEmpty(*refreshToken) {
		return fail(errAuthRefreshInvalidDto)
	}
	userID, valid, err := s.tokens.Subject(*refreshToken, auth.TypeRefresh)
	if err != nil {
		return internal(err)
	}
	if !valid {
		return fail(errAuthRefreshInvalidToken)
	}
	exists, err := s.q.UserExists(r.Context(), userID)
	if err != nil {
		return internal(err)
	}
	if !exists {
		return fail(errAuthRefreshInvalidToken)
	}
	token, err := s.tokens.Access(userID)
	if err != nil {
		return internal(err)
	}
	return ok(authTokenDTO{Token: token, Type: "ACCESS"})
}

// membershipID is the caller's active membership in the group ("" if none).
func (s *Server) membershipID(r *request, q *db.Queries, groupID string) (string, error) {
	id, err := q.ActiveMembershipID(r.Context(), db.ActiveMembershipIDParams{UserID: &r.userID, GroupID: &groupID})
	if notFound(err) {
		return "", nil
	}
	return id, err
}
