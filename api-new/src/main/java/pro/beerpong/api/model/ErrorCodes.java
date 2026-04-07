package pro.beerpong.api.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCodes {
    ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "error", "An internal error occurred!")
    /* GROUPS */,
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "groupNotFound", "The requested group could not be found!"),
    GROUP_INVITE_NOT_FOUND(HttpStatus.NOT_FOUND, "groupInviteNotFound", "No group with the provided invite code could be found!"),
    GROUP_INVITE_CODE_NOT_PROVIDED(HttpStatus.BAD_REQUEST, "groupInviteCodeNotProvided", "The invite code needs to be provided!"),
    GROUP_ALREADY_IN_GROUP(HttpStatus.FORBIDDEN, "groupAlreadyInGroup", "The user is already a member of this group!"),
    GROUP_HAS_NO_WALLPAPER(HttpStatus.NOT_FOUND, "groupHasNoWallpaper", "The provided group does not have a wallpaper saved!"),
    GROUP_HAS_NO_RUNNING_SEASON(HttpStatus.INTERNAL_SERVER_ERROR, "groupHasNoRunningSeason", "The provided group does not have a running season! Something went very wrong here :("),
    INVALID_GROUP_NAME(HttpStatus.BAD_REQUEST, "invalidGroupName", "Group name must be non-null, non-empty and between 2 and 50 characters!"),
    INVALID_GROUP_PROFILE_NAMES(HttpStatus.BAD_REQUEST, "invalidGroupProfileNames", "Group profileNames must be non-null and non-empty!"),
    INVALID_GROUP_SPORT(HttpStatus.BAD_REQUEST, "invalidGroupSport", "Either a valid preset-id has to be set to 'sportPreset' or a non-null, non-empty 'customSportName' has to be supplied!"),
    INVALID_GROUP_INVITE_CODE(HttpStatus.BAD_REQUEST, "invalidGroupInviteCode", "Group invite code must be non-null and non-empty!"),
    INVALID_GROUP_ID(HttpStatus.BAD_REQUEST, "invalidGroupId", "Group id must be non-null and non-empty!")
    /* SEASONS */,
    SEASON_NOT_FOUND(HttpStatus.NOT_FOUND, "seasonNotFound", "This season could not be found!"),
    SEASON_ALREADY_ENDED(HttpStatus.FORBIDDEN, "seasonAlreadyEnded", "Past seasons are immutable!"),
    SEASON_WRONG_TIME_FORMAT(HttpStatus.BAD_REQUEST, "seasonWrongTimeFormat", "The wake time has to be supplied in the following format: HH:mm and be a valid hour and minute"),
    SEASON_WRONG_TEAM_SIZES(HttpStatus.BAD_REQUEST, "seasonWrongTeamSizes", "The min team size has to be less then or equal to the max team size!"),
    SEASON_NOT_OF_GROUP(HttpStatus.NOT_FOUND, "seasonHasDifferentGroup", "The provided season and group id do not match or no season with this id could be found!"),
    SEASON_NOT_ACTIVE(HttpStatus.BAD_REQUEST, "seasonNotActive", "The seasons is not the active season of the providede group!"),
    SEASON_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "seasonValidationFailed", "The validation of the created season has failed (invalid group id)"),
    INVALID_SEASON_NAME(HttpStatus.BAD_REQUEST, "invalidSeasonName", "Season name must be non-null, non-empty and between 2 and 50 characters!"),
    INVALID_RULE_MOVES(HttpStatus.BAD_REQUEST, "invalidRuleMoves", "Rule Moves must be non-null, contain at least one normal and one finish move and every move must be valid (name non-null, non empty; pointsForScorer and pointsForTeam > 0)"),
    INVALID_SEASON_ID(HttpStatus.BAD_REQUEST, "invalidSeasonId", "Season id must be non-null and non-empty!"),
    INVALID_SEASON_DTO(HttpStatus.BAD_REQUEST, "invalidSeasonDto", "Season update dto must be non-null and have non-null seasonSettings!")
    /* MATCHES */,
    MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "matchNotFound", "The requested match could not be found or its season id does not match the provided group id!"),
    MATCH_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "matchValidationFailed", "The validation of the created match has failed (invalid group or season id)"),
    MATCH_CREATE_DTO_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "matchCreateDtoValidationFailed", "The team sizes are not in the boundaries of the season settings!"),
    MATCH_WRONG_AMOUNT_OF_TEAMS(HttpStatus.BAD_REQUEST, "matchWrongAmountOfTeams", "The amount of teams has to be exactly 2!"),
    MATCH_DTO_VALIDATION_FAILED(HttpStatus.FORBIDDEN, "matchDtoValidationFailed", "The validation of the match create dto failed (invalid player, rulemove, season or group id, double player, or no/more than exactly one finish move)"),
    MATCH_CREATE_DTO_NEEDS_IDS(HttpStatus.BAD_REQUEST, "matchCreateDtoNeedsIds", "Every team needs a 'existingTeamId' attribute containing the id of the existing team!"),
    MATCH_NO_TEAM_FOUND(HttpStatus.FORBIDDEN, "matchNoTeamFound", "Could not find a team with the provided id linked to the provided match!"),
    MATCH_TEAM_HAS_NO_PHOTO(HttpStatus.NOT_FOUND, "matchTeamHasNoPhoto", "The provided team does not have a photo set!"),
    MATCH_GROUP_OR_SEASON_ID_DONT_MATCH(HttpStatus.BAD_REQUEST, "matchGroupOrSeasonIdDontMatch", "The provided season id doesnt match the season id of the provided match!"),
    INVALID_MATCH_CREATE_DTO(HttpStatus.BAD_REQUEST, "invalidMatchCreateDto", "The matchCreateDto has either more than 1 finishMove, the finishMove is of a count != 1, the playerIds are non-distinct, the playerIds are of players not in the current season of the provided group"),
    /* RULE MOVES */
    RULE_MOVE_NOT_FOUND(HttpStatus.NOT_FOUND, "ruleMoveNotFound", "The requested ruleMove could not be found!"),
    RULE_MOVE_VALIDATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "ruleMoveValidationFailed", "The rulemove is not part of the provided season or the provided season is not part of the provided gorup!"),
    RULE_MOVE_INVALID_DTO(HttpStatus.BAD_REQUEST, "ruleMoveInvalidDto", "The name has to be non-null and non-empty and pointsForScorer and pointsForTeam have to be >= 0!"),
    INVALID_RULE_MOVE_CREATE_DTO(HttpStatus.BAD_REQUEST, "invalidRuleMoveCreateDto", "The ruleMoveCreateDto needs a name and non negative points for scorer/team"),
    RULE_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "ruleValidationFailed", "The validation of the created rules has failed (invalid group or season id)"),
    /* RULES */
    RULE_INVALID_DTO(HttpStatus.BAD_REQUEST, "ruleInvalidDto", "Every rule name and description has to be non-null and non-empty!"),
    /* PLAYERS */
    PLAYER_NOT_FOUND(HttpStatus.NOT_FOUND, "playerNotFound", "The requested player could not be found!"),
    PLAYER_ALREADY_DELETED(HttpStatus.FORBIDDEN, "playerAlreadyDeleted", "This player has been deleted!"),
    PLAYER_NOT_OF_GROUP(HttpStatus.BAD_REQUEST, "playerNotOfGroup", "The provided player and group id do not match!"),
    INVALID_PLAYER_ID(HttpStatus.BAD_REQUEST, "invalidPlayerId", "Player id must be non-null and non-empty!"),
    /* PROFILES */
    PROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "profileNotFound", "The requested profile could not be found or the provided group id does not match the profiles group!"),
    PROFILE_NOT_OF_GROUP(HttpStatus.BAD_REQUEST, "profileNotOfGroup", "The provided profile and group id do not match!"),
    PROFILE_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "profileAlreadyExists", "There already exists a profile with the provided name and an active player in the current season!"),
    PROFILE_HAS_NO_AVATAR(HttpStatus.NOT_FOUND, "profileHasNoAvatar", "The provided profiles does not have an avatar saved!"),
    /* ASSETS */
    ASSET_NOT_FOUND(HttpStatus.NOT_FOUND, "assetNotFound", "The requested asset could not be found!"),
    ASSET_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "assetValidationFailed", "The provided asset offsets or zoom have to be >= 0!"),
    /* LEADERBOARDS */
    LEADERBOARD_SCOPE_NOT_FOUND(HttpStatus.NOT_FOUND, "leaderboardScopeNotFound", "The leaderboard scope has to be one of: all-time, today, season"),
    LEADERBOARD_SEASON_NOT_FOUND(HttpStatus.NOT_FOUND, "leaderboardScopeNotFound", "The scope 'season' requires a seasonId param!"),
    /* AUTH */
    AUTH_REGISTER_INVALID_DTO(HttpStatus.BAD_REQUEST, "authRegisterInvalidDto", "The installationType or deviceId is invalid!"),
    AUTH_REFRESH_INVALID_DTO(HttpStatus.BAD_REQUEST, "authRefreshInvalidDto", "The refreshToken has to be non-null and non-empty!"),
    AUTH_INVALID_USER(HttpStatus.UNAUTHORIZED, "authInvalidUser", "The user from the access token has to be non-null!"),
    AUTH_USER_NOT_IN_GROUP(HttpStatus.UNAUTHORIZED, "authUserNotInGroup", "The user is not in this group!"),
    AUTH_REFRESH_INVALID_TOKEN(HttpStatus.BAD_REQUEST, "authRefreshInvalidToken", "The refreshToken is either no refresh-token, invalid or the subject-userId is invalid!");

    private final HttpStatus httpStatus;
    private final String code;
    private final String description;

    public ResponseEnvelope.ErrorDetails toDetails() {
        return new ResponseEnvelope.ErrorDetails(code, description);
    }
}
