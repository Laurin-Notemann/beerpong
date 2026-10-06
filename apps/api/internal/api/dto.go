package api

import (
	"encoding/json"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"
)

// The JSON shapes below are the API contract the app is generated from
// (apps/mobile/api/generated/openapi.json). Field names, order and nullability
// follow the Java DTOs; fields that were nullable there are pointers here.

var (
	rankingAlgorithms     = []string{"AVERAGE", "ELO"}
	dailyLeaderboards     = []string{"RESET_AT_MIDNIGHT", "WAKE_TIME", "LAST_24_HOURS"}
	assetTypes            = []string{"GROUP_WALLPAPER", "PROFILE_AVATAR", "TEAM_PHOTO", "PROFILE_SCORE_CLIP"}
	installationTypes     = []string{"IOS", "ANDROID"}
	rankingAverage        = int16(0)
	dailyWakeTime         = int16(1)
	assetGroupWallpaper   = int16(0)
	assetProfileAvatar    = int16(1)
	assetTeamPhoto        = int16(2)
	assetProfileScoreClip = int16(3)
)

func enumName(names []string, ordinal *int16) *string {
	if ordinal == nil || int(*ordinal) < 0 || int(*ordinal) >= len(names) {
		return nil
	}
	return &names[*ordinal]
}

type groupPreset struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	ImageURL string `json:"imageUrl"`
}

var groupPresets = []groupPreset{
	{"beerpong", "Beerpong", "https://www.shutterstock.com/image-photo/cups-plastic-ball-beer-pong-600nw-1107685832.jpg"},
	{"kicker", "Kicker", "https://media.istockphoto.com/id/696594232/photo/foosball-at-modern-office-close-up-view.jpg?s=612x612&w=0&k=20&c=skF0hp5i_9ctZ2MmkqLdaOklvwSGbqEqcAu0JLF8M5c="},
	{"tabletennis", "Table Tennis", "https://media.istockphoto.com/id/1425158165/photo/table-tennis-ping-pong-paddles-and-white-ball-on-blue-board.jpg?s=612x612&w=0&k=20&c=KSdi4bEGoxdhaGMnl6CZaqTLbKbobArgrrpLem3oN98="},
	{"chess", "Chess", "https://media.istockphoto.com/id/1128789429/photo/plan-leading-strategy-of-successful-business-competition-leader-concept-hand-of-player-chess.jpg?s=612x612&w=0&k=20&c=srlCT0xWXduYvZsQgGVYl6B4QAaBjoPjpsceTQrP5XQ="},
	{"billiards", "Billiards", "https://media.istockphoto.com/id/1370682737/photo/a-group-of-young-people-came-to-play-billiards-and-in-the-young-hands-was-a-cane-and-layers.jpg?s=612x612&w=0&k=20&c=monjVEGbEEjeau83cCqBScfiR1n9SOaqlZpDEB3-Ioo="},
}

func presetByID(id *string) *groupPreset {
	if id == nil {
		return nil
	}
	for i := range groupPresets {
		if groupPresets[i].ID == *id {
			return &groupPresets[i]
		}
	}
	return nil
}

type groupDTO struct {
	ID               string       `json:"id"`
	Name             *string      `json:"name"`
	InviteCode       *string      `json:"inviteCode"`
	ActiveSeasonID   *string      `json:"activeSeasonId"`
	AssetIDWallpaper *string      `json:"assetIdWallpaper"`
	CreatedByID      *string      `json:"createdById"`
	CreatedAt        *time.Time   `json:"createdAt"`
	SportPreset      *groupPreset `json:"sportPreset"`
	CustomSportName  *string      `json:"customSportName"`
	NumberOfPlayers  int64        `json:"numberOfPlayers"`
	NumberOfMatches  int64        `json:"numberOfMatches"`
	NumberOfSeasons  int64        `json:"numberOfSeasons"`
}

func toGroupDTO(g db.Group) groupDTO {
	return groupDTO{
		ID:               g.ID,
		Name:             g.Name,
		InviteCode:       g.InviteCode,
		ActiveSeasonID:   g.ActiveSeasonID,
		AssetIDWallpaper: g.AssetIDWallpaper,
		CreatedByID:      g.CreatedBy,
		CreatedAt:        utc(g.CreatedAt),
		SportPreset:      presetByID(g.SportPreset),
		CustomSportName:  g.CustomSportName,
	}
}

type seasonSettingsDTO struct {
	MinMatchesToQualify *int32  `json:"minMatchesToQualify"`
	MinTeamSize         *int32  `json:"minTeamSize"`
	MaxTeamSize         *int32  `json:"maxTeamSize"`
	RankingAlgorithm    *string `json:"rankingAlgorithm"`
	DailyLeaderboard    *string `json:"dailyLeaderboard"`
	WakeTime            *string `json:"wakeTime"`
	// the Elo weights in effect (the defaults where none are set)
	EloK          *float64 `json:"eloK"`
	EloKr         *float64 `json:"eloKr"`
	EloRingWeight *float64 `json:"eloRingWeight"`
	EloSwing      *float64 `json:"eloSwing"`
	EloSpread     *float64 `json:"eloSpread"`
}

type seasonDTO struct {
	ID             string             `json:"id"`
	Name           *string            `json:"name"`
	StartDate      *time.Time         `json:"startDate"`
	EndDate        *time.Time         `json:"endDate"`
	GroupID        *string            `json:"groupId"`
	SeasonSettings *seasonSettingsDTO `json:"seasonSettings"`
	CreatedByID    *string            `json:"createdById"`
}

// season is a season row joined with its settings.
type season struct {
	ID        string
	Name      *string
	StartDate *time.Time
	EndDate   *time.Time
	GroupID   *string
	CreatedBy *string
	Settings  *settings
}

type settings struct {
	ID                  string
	MinMatchesToQualify int32
	MinTeamSize         int32
	MaxTeamSize         int32
	RankingAlgorithm    *int16
	DailyLeaderboard    *int16
	WakeTime            string // HH:MM:SS
	Elo                 eloWeights
}

// eloWeights are a season's Elo weights; nil is the default.
type eloWeights struct {
	K, KR, RingWeight, Swing, Spread *float64
}

func (w eloWeights) params() leaderboard.EloParams {
	p := leaderboard.DefaultElo
	for _, f := range []struct {
		set *float64
		to  *float64
	}{{w.K, &p.K}, {w.KR, &p.KR}, {w.RingWeight, &p.RingWeight}, {w.Swing, &p.Swing}, {w.Spread, &p.Spread}} {
		if f.set != nil {
			*f.to = *f.set
		}
	}
	return p
}

func (s *settings) dto() *seasonSettingsDTO {
	if s == nil {
		return nil
	}
	wake, elo := s.WakeTime, s.Elo.params()
	return &seasonSettingsDTO{
		MinMatchesToQualify: &s.MinMatchesToQualify,
		MinTeamSize:         &s.MinTeamSize,
		MaxTeamSize:         &s.MaxTeamSize,
		RankingAlgorithm:    enumName(rankingAlgorithms, s.RankingAlgorithm),
		DailyLeaderboard:    enumName(dailyLeaderboards, s.DailyLeaderboard),
		WakeTime:            &wake,
		EloK:                &elo.K,
		EloKr:               &elo.KR,
		EloRingWeight:       &elo.RingWeight,
		EloSwing:            &elo.Swing,
		EloSpread:           &elo.Spread,
	}
}

func (s season) dto() seasonDTO {
	return seasonDTO{
		ID:             s.ID,
		Name:           s.Name,
		StartDate:      utc(s.StartDate),
		EndDate:        utc(s.EndDate),
		GroupID:        s.GroupID,
		SeasonSettings: s.Settings.dto(),
		CreatedByID:    s.CreatedBy,
	}
}

func seasonFromRow(r db.GetSeasonRow) season {
	s := season{ID: r.ID, Name: r.Name, StartDate: r.StartDate, EndDate: r.EndDate, GroupID: r.GroupID, CreatedBy: r.CreatedBy}
	if r.SeasonSettingsID != nil && r.MinTeamSize != nil {
		s.Settings = &settings{
			ID:                  *r.SeasonSettingsID,
			MinMatchesToQualify: deref(r.MinMatchesToQualify),
			MinTeamSize:         deref(r.MinTeamSize),
			MaxTeamSize:         deref(r.MaxTeamSize),
			RankingAlgorithm:    r.RankingAlgorithm,
			DailyLeaderboard:    r.DailyLeaderboard,
			WakeTime:            r.WakeTime,
			Elo:                 eloWeights{K: r.EloK, KR: r.EloKr, RingWeight: r.EloRingWeight, Swing: r.EloSwing, Spread: r.EloSpread},
		}
	}
	return s
}

type seasonStartDTO struct {
	OldSeason *seasonDTO `json:"oldSeason"`
	NewSeason seasonDTO  `json:"newSeason"`
}

type profileDTO struct {
	ID            string  `json:"id"`
	Name          *string `json:"name"`
	AssetIDAvatar *string `json:"assetIdAvatar"`
	// AvatarURL is where the avatar loads from, so the app doesn't look up
	// every profile's asset.
	AvatarURL   *string `json:"avatarUrl"`
	GroupID     *string `json:"groupId"`
	CreatedByID *string `json:"createdById"`
	// ScoreClipURLs are the videos Versus TV and the app play one of at random
	// when the player scores, oldest first.
	ScoreClipURLs []string `json:"scoreClipUrls"`
	// ScoreClipURL is the newest of them, for app versions from before there
	// could be several.
	ScoreClipURL *string `json:"scoreClipUrl"`
}

func (s *Server) toProfileDTO(p db.Profile) profileDTO {
	url := func(assetID *string) *string {
		if assetID == nil {
			return nil
		}
		return ptr(s.bucket.PublicURL(*assetID))
	}
	clips := []string{}
	for _, id := range p.AssetIdsScoreClips {
		clips = append(clips, s.bucket.PublicURL(id))
	}
	var newest *string
	if len(clips) > 0 {
		newest = &clips[len(clips)-1]
	}
	return profileDTO{ID: p.ID, Name: p.Name, AssetIDAvatar: p.AssetIDAvatar, AvatarURL: url(p.AssetIDAvatar), GroupID: p.GroupID, CreatedByID: p.CreatedBy, ScoreClipURLs: clips, ScoreClipURL: newest}
}

type profileCreatedDTO struct {
	profileDTO
	Reactivated        bool    `json:"reactivated"`
	LastActiveSeasonID *string `json:"lastActiveSeasonId"`
}

type playerDTO struct {
	ID               string  `json:"id"`
	ProfileID        *string `json:"profileId"`
	SeasonID         *string `json:"seasonId"`
	ActiveThisSeason bool    `json:"activeThisSeason"`
	StatisticsID     *string `json:"statisticsId"`
}

func toPlayerDTO(p db.Player) playerDTO {
	return playerDTO{ID: p.ID, ProfileID: p.ProfileID, SeasonID: p.SeasonID, ActiveThisSeason: p.ActiveThisSeason, StatisticsID: p.StatisticsID}
}

type statisticsDTO struct {
	ID                *string `json:"id"`
	Points            int64   `json:"points"`
	Matches           int64   `json:"matches"`
	Wins              int64   `json:"wins"`
	Moves             int64   `json:"moves"`
	TotalTeamSize     int64   `json:"totalTeamSize"`
	AvgPointsPerMatch float64 `json:"avgPointsPerMatch"`
	AvgTeamSize       float64 `json:"avgTeamSize"`
	Elo               float64 `json:"elo"`
}

type playerExtendedDTO struct {
	ID               string         `json:"id"`
	ProfileID        *string        `json:"profileId"`
	Season           seasonDTO      `json:"season"`
	ActiveThisSeason bool           `json:"activeThisSeason"`
	Statistics       *statisticsDTO `json:"statistics"`
}

type leaderboardDTO struct {
	NumPlayers int64               `json:"numPlayers"`
	NumMatches int64               `json:"numMatches"`
	StartedAt  *time.Time          `json:"startedAt"`
	Entries    []playerExtendedDTO `json:"entries"`
}

type ruleDTO struct {
	ID          string  `json:"id"`
	Title       *string `json:"title"`
	Description *string `json:"description"`
	CreatedByID *string `json:"createdById"`
	SeasonID    *string `json:"seasonId"`
}

func toRuleDTO(r db.Rule) ruleDTO {
	return ruleDTO{ID: r.ID, Title: r.Title, Description: r.Description, CreatedByID: r.CreatedBy, SeasonID: r.SeasonID}
}

type ruleMoveDTO struct {
	ID              string  `json:"id"`
	Name            *string `json:"name"`
	SeasonID        *string `json:"seasonId"`
	PointsForTeam   int32   `json:"pointsForTeam"`
	PointsForScorer int32   `json:"pointsForScorer"`
	FinishingMove   bool    `json:"finishingMove"`
	Cups            int32   `json:"cups"`
}

func toRuleMoveDTO(m db.RuleMove) ruleMoveDTO {
	return ruleMoveDTO{ID: m.ID, Name: m.Name, SeasonID: m.SeasonID, PointsForTeam: m.PointsForTeam, PointsForScorer: m.PointsForScorer, FinishingMove: m.FinishingMove, Cups: cupsPerHit(m)}
}

type assetMetadataDTO struct {
	ID      string  `json:"id"`
	URL     string  `json:"url"`
	Type    *string `json:"type"`
	OffsetX float64 `json:"offsetX"`
	OffsetY float64 `json:"offsetY"`
	Zoom    float64 `json:"zoom"`
}

type assetUploadDTO struct {
	assetMetadataDTO
	SingleUploadURL string `json:"singleUploadUrl"`
}

type teamPhotoDTO struct {
	TeamID    *string        `json:"teamId"`
	TeamPhoto assetUploadDTO `json:"teamPhoto"`
}

type matchDTO struct {
	ID           string          `json:"id"`
	Date         *time.Time      `json:"date"`
	SeasonID     *string         `json:"seasonId"`
	CreatedByID  *string         `json:"createdById"`
	PhotoUploads *[]teamPhotoDTO `json:"photoUploads"`
}

func toMatchDTO(m db.Match) matchDTO {
	return matchDTO{ID: m.ID, Date: utc(m.Date), SeasonID: m.SeasonID, CreatedByID: m.CreatedBy}
}

type teamDTO struct {
	ID           string  `json:"id"`
	MatchID      *string `json:"matchId"`
	PhotoAssetID *string `json:"photoAssetId"`
}

func toTeamDTO(t db.Team) teamDTO {
	return teamDTO{ID: t.ID, MatchID: t.MatchID, PhotoAssetID: t.AssetIDPhoto}
}

type teamMemberDTO struct {
	ID       string  `json:"id"`
	TeamID   *string `json:"teamId"`
	PlayerID *string `json:"playerId"`
}

type matchMoveCompleteDTO struct {
	ID           string  `json:"id"`
	Value        int32   `json:"value"`
	TeamMemberID *string `json:"teamMemberId"`
	MoveID       *string `json:"moveId"`
}

type matchExtendedDTO struct {
	matchDTO
	Teams       []teamDTO              `json:"teams"`
	TeamMembers []teamMemberDTO        `json:"teamMembers"`
	MatchMoves  []matchMoveCompleteDTO `json:"matchMoves"`
}

type matchMoveDTO struct {
	MoveID *string `json:"moveId"`
	Count  int32   `json:"count"`
}

type overviewMemberDTO struct {
	PlayerID *string        `json:"playerId"`
	Points   int32          `json:"points"`
	Moves    []matchMoveDTO `json:"moves"`
}

type overviewTeamDTO struct {
	Points       int32               `json:"points"`
	TeamID       string              `json:"teamId"`
	AssetPhotoID *string             `json:"assetPhotoId"`
	Members      []overviewMemberDTO `json:"members"`
}

type matchOverviewDTO struct {
	ID       string          `json:"id"`
	Date     *time.Time      `json:"date"`
	SeasonID *string         `json:"seasonId"`
	BlueTeam overviewTeamDTO `json:"blueTeam"`
	RedTeam  overviewTeamDTO `json:"redTeam"`
}

type authTokenDTO struct {
	Token string `json:"token"`
	Type  string `json:"type"`
}

func utc(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	u := t.UTC()
	return &u
}

func deref[T any](p *T) T {
	var zero T
	if p == nil {
		return zero
	}
	return *p
}

func ptr[T any](v T) *T { return &v }

// ---- live matches ----

type cupPositionDTO struct {
	X *int32 `json:"x"`
	Y *int32 `json:"y"`
}

// liveMatchOpDTO is used for input and output. seq and createdAt are set by
// the server and ignored on input. Which of the typed fields are set depends
// on the type; the rest stay null.
type liveMatchOpDTO struct {
	ID            string           `json:"id"`
	Seq           *int64           `json:"seq"`
	Type          *string          `json:"type"`
	CreatedAt     *time.Time       `json:"createdAt"`
	PlayerID      *string          `json:"playerId"`
	Team          *string          `json:"team"`
	MoveID        *string          `json:"moveId"`
	Delta         *int32           `json:"delta"`
	Cups          []cupPositionDTO `json:"cups"`
	Cup           *cupPositionDTO  `json:"cup"`
	FinishMoveID  *string          `json:"finishMoveId"`
	RedPlayerIDs  []string         `json:"redPlayerIds"`
	BluePlayerIDs []string         `json:"bluePlayerIds"`
	// SET_RERACK only; left out elsewhere rather than null, unlike the fields above
	Drawn       []cupPositionDTO `json:"drawn,omitempty"`
	FormationID *string          `json:"formationId,omitempty"`
}

type liveMatchDTO struct {
	ID              string           `json:"id"`
	GroupID         string           `json:"groupId"`
	SeasonID        string           `json:"seasonId"`
	Status          string           `json:"status"`
	StartedAt       *time.Time       `json:"startedAt"`
	LastActivityAt  *time.Time       `json:"lastActivityAt"`
	EndedAt         *time.Time       `json:"endedAt"`
	CreatedByUserID *string          `json:"createdByUserId"`
	LastSeq         int64            `json:"lastSeq"`
	ResultMatchID   *string          `json:"resultMatchId"`
	Ops             []liveMatchOpDTO `json:"ops"`
}

type liveMatchOpsResultDTO struct {
	LastSeq int64            `json:"lastSeq"`
	Ops     []liveMatchOpDTO `json:"ops"`
}

type liveMatchOpsEventDTO struct {
	LiveMatchID string           `json:"liveMatchId"`
	LastSeq     int64            `json:"lastSeq"`
	Ops         []liveMatchOpDTO `json:"ops"`
}

func toLiveMatchOpDTO(row db.LiveMatchOp) (liveMatchOpDTO, error) {
	var dto liveMatchOpDTO
	if err := json.Unmarshal([]byte(row.Payload), &dto); err != nil {
		return dto, err
	}
	dto.ID, dto.Seq, dto.Type, dto.CreatedAt = row.ID, &row.Seq, &row.Type, utc(&row.CreatedAt)
	return dto, nil
}

func toLiveMatchDTO(lm db.LiveMatch, userID *string, ops []liveMatchOpDTO) liveMatchDTO {
	if ops == nil {
		ops = []liveMatchOpDTO{}
	}
	return liveMatchDTO{
		ID:              lm.ID,
		GroupID:         lm.GroupID,
		SeasonID:        lm.SeasonID,
		Status:          lm.Status,
		StartedAt:       utc(&lm.StartedAt),
		LastActivityAt:  utc(&lm.LastActivityAt),
		EndedAt:         utc(lm.EndedAt),
		CreatedByUserID: userID,
		LastSeq:         lm.LastSeq,
		ResultMatchID:   lm.ResultMatchID,
		Ops:             ops,
	}
}

type formationDTO struct {
	ID        string           `json:"id"`
	GroupID   string           `json:"groupId"`
	Name      string           `json:"name"`
	Cups      []cupPositionDTO `json:"cups"`
	UpdatedAt *time.Time       `json:"updatedAt"`
}

func toFormationDTO(f db.Formation) (formationDTO, error) {
	var cups []cupPositionDTO
	if err := json.Unmarshal([]byte(f.Cups), &cups); err != nil {
		return formationDTO{}, err
	}
	return formationDTO{ID: f.ID, GroupID: f.GroupID, Name: f.Name, Cups: cups, UpdatedAt: &f.UpdatedAt}, nil
}
