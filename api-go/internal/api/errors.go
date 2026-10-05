package api

import "net/http"

// errorCode is an API error the app understands: HTTP status, stable code
// and a human description. Codes and texts are part of the contract.
type errorCode struct {
	status      int
	code        string
	description string
}

var (
	errGeneric = errorCode{500, "error", "An internal error occurred!"}

	errGroupNotFound          = errorCode{404, "groupNotFound", "The requested group could not be found!"}
	errGroupInviteNotFound    = errorCode{404, "groupInviteNotFound", "No group with the provided invite code could be found!"}
	errGroupAlreadyInGroup    = errorCode{403, "groupAlreadyInGroup", "The user is already a member of this group!"}
	errGroupHasNoWallpaper    = errorCode{404, "groupHasNoWallpaper", "The provided group does not have a wallpaper saved!"}
	errGroupNoRunningSeason   = errorCode{500, "groupHasNoRunningSeason", "The provided group does not have a running season! Something went very wrong here :("}
	errInvalidGroupName       = errorCode{400, "invalidGroupName", "Group name must be non-null, non-empty and between 2 and 50 characters!"}
	errInvalidGroupProfiles   = errorCode{400, "invalidGroupProfileNames", "Group profileNames must be non-null and non-empty!"}
	errInvalidGroupSport      = errorCode{400, "invalidGroupSport", "Either a valid preset-id has to be set to 'sportPreset' or a non-null, non-empty 'customSportName' has to be supplied!"}
	errInvalidGroupInviteCode = errorCode{400, "invalidGroupInviteCode", "Group invite code must be non-null and non-empty!"}

	errSeasonNotFound        = errorCode{404, "seasonNotFound", "This season could not be found!"}
	errSeasonAlreadyEnded    = errorCode{403, "seasonAlreadyEnded", "Past seasons are immutable!"}
	errSeasonWrongTimeFormat = errorCode{400, "seasonWrongTimeFormat", "The wake time has to be supplied in the following format: HH:mm and be a valid hour and minute"}
	errSeasonWrongTeamSizes  = errorCode{400, "seasonWrongTeamSizes", "The min team size has to be less then or equal to the max team size!"}
	errSeasonNotOfGroup      = errorCode{404, "seasonHasDifferentGroup", "The provided season and group id do not match or no season with this id could be found!"}
	errInvalidSeasonName     = errorCode{400, "invalidSeasonName", "Season name must be non-null, non-empty and between 2 and 50 characters!"}
	errInvalidRuleMoves      = errorCode{400, "invalidRuleMoves", "Rule Moves must be non-null, contain at least one normal and one finish move and every move must be valid (name non-null, non empty; pointsForScorer and pointsForTeam > 0)"}
	errInvalidSeasonDto      = errorCode{400, "invalidSeasonDto", "Season update dto must be non-null and have non-null seasonSettings!"}

	errMatchNotFound            = errorCode{404, "matchNotFound", "The requested match could not be found or its season id does not match the provided group id!"}
	errMatchWrongAmountOfTeams  = errorCode{400, "matchWrongAmountOfTeams", "The amount of teams has to be exactly 2!"}
	errMatchDtoValidationFailed = errorCode{400, "matchDtoValidationFailed", "The validation of the match create dto failed (invalid player, rulemove, season or group id, double player, or no/more than exactly one finish move)"}
	errMatchNeedsTeamIDs        = errorCode{400, "matchCreateDtoNeedsIds", "Every team needs a 'existingTeamId' attribute containing the id of the existing team!"}
	errMatchTeamNotUnique       = errorCode{400, "matchTeamNotUnique", "The existingTeamIds have to be distinct!"}
	errMatchTeamNotFound        = errorCode{400, "matchTeamNotFound", "Could not find a team matching the provided existingTeamId!"}
	errMatchNoTeamFound         = errorCode{403, "matchNoTeamFound", "Could not find a team with the provided id linked to the provided match!"}
	errMatchTeamHasNoPhoto      = errorCode{404, "matchTeamHasNoPhoto", "The provided team does not have a photo set!"}
	errMatchSeasonMismatch      = errorCode{400, "matchGroupOrSeasonIdDontMatch", "The provided season id doesnt match the season id of the provided match!"}

	errLiveMatchNotFound   = errorCode{404, "liveMatchNotFound", "The requested live match could not be found in this group!"}
	errLiveMatchEnded      = errorCode{409, "liveMatchEnded", "This live match is no longer in progress!"}
	errLiveMatchStale      = errorCode{409, "liveMatchStale", "The live match has changed since the provided expectedSeq!"}
	errLiveMatchInvalidOps = errorCode{400, "liveMatchInvalidOps", "The ops are invalid: at most 50 per request, ids have to be UUIDs, every op needs the fields of its type, delta has to be between -20 and 20 but not 0, a cup hit has 1 to 10 cups with coordinates between 0 and 9, and teams are 'red' or 'blue'!"}
	errLiveMatchTooManyOps = errorCode{400, "liveMatchTooManyOps", "A live match can have at most 2000 ops!"}

	errRuleMoveNotFound         = errorCode{404, "ruleMoveNotFound", "The requested ruleMove could not be found!"}
	errRuleMoveValidationFailed = errorCode{500, "ruleMoveValidationFailed", "The rulemove is not part of the provided season or the provided season is not part of the provided gorup!"}
	errRuleMoveInvalidDto       = errorCode{400, "ruleMoveInvalidDto", "The name has to be non-null and non-empty and pointsForScorer and pointsForTeam have to be >= 0!"}
	errRuleInvalidDto           = errorCode{400, "ruleInvalidDto", "Every rule name and description has to be non-null and non-empty!"}

	errPlayerNotFound       = errorCode{404, "playerNotFound", "The requested player could not be found!"}
	errPlayerAlreadyDeleted = errorCode{403, "playerAlreadyDeleted", "This player has been deleted!"}
	errPlayerNotOfGroup     = errorCode{400, "playerNotOfGroup", "The provided player and group id do not match!"}

	errProfileNotFound      = errorCode{404, "profileNotFound", "The requested profile could not be found or the provided group id does not match the profiles group!"}
	errProfileNotOfGroup    = errorCode{400, "profileNotOfGroup", "The provided profile and group id do not match!"}
	errProfileAlreadyExists = errorCode{400, "profileAlreadyExists", "There already exists a profile with the provided name and an active player in the current season!"}
	errProfileHasNoAvatar   = errorCode{404, "profileHasNoAvatar", "The provided profiles does not have an avatar saved!"}

	errAssetNotFound         = errorCode{404, "assetNotFound", "The requested asset could not be found!"}
	errAssetValidationFailed = errorCode{400, "assetValidationFailed", "The provided asset offsets or zoom have to be >= 0!"}

	errLeaderboardScopeNotFound     = errorCode{404, "leaderboardScopeNotFound", "The leaderboard scope has to be one of: all-time, today, season"}
	errLeaderboardSeasonNotFound    = errorCode{404, "leaderboardScopeNotFound", "The scope 'season' requires a seasonId param!"}
	errLeaderboardInvalidProjection = errorCode{400, "leaderboardInvalidProjection", "A projection needs matches: [{teams: [blue, red]}], every member with a playerId and moves, at most 20 matches."}

	errAuthRegisterInvalidDto  = errorCode{400, "authRegisterInvalidDto", "The installationType or deviceId is invalid!"}
	errAuthRefreshInvalidDto   = errorCode{400, "authRefreshInvalidDto", "The refreshToken has to be non-null and non-empty!"}
	errAuthUserNotInGroup      = errorCode{401, "authUserNotInGroup", "The user is not in this group!"}
	errAuthRefreshInvalidToken = errorCode{400, "authRefreshInvalidToken", "The refreshToken is either no refresh-token, invalid or the subject-userId is invalid!"}
)

// Spring Boot's reason phrases for the statuses its default error body uses.
var springReasons = map[int]string{
	http.StatusBadRequest:           "Bad Request",
	http.StatusForbidden:            "Forbidden",
	http.StatusNotFound:             "Not Found",
	http.StatusMethodNotAllowed:     "Method Not Allowed",
	http.StatusUnsupportedMediaType: "Unsupported Media Type",
	http.StatusInternalServerError:  "Internal Server Error",
}
