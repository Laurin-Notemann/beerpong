package pro.beerpong.api.model.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import pro.beerpong.api.service.GroupService;

@Getter
@RequiredArgsConstructor
public enum ErrorCodes {
    /* GROUPS */
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "groupNotFound", "The requested group could not be found!"),
    GROUP_INVITE_NOT_FOUND(HttpStatus.NOT_FOUND, "groupInviteNotFound", "No group with the provided invite code could be found!"),
    GROUP_INVITE_CODE_NOT_PROVIDED(HttpStatus.BAD_REQUEST, "groupInviteCodeNotProvided", "The invite code needs to be provided!"),
    INVALID_GROUP_NAME(HttpStatus.BAD_REQUEST, "invalidGroupName", "Group name must be non-null, non-empty and between 2 and 50 characters!"),
    INVALID_GROUP_PROFILE_NAMES(HttpStatus.BAD_REQUEST, "invalidGroupProfileNames", "Group profileNames must be non-null and non-empty!"),
    INVALID_GROUP_SPORT(HttpStatus.BAD_REQUEST, "invalidGroupSport", "Either a valid preset-id has to be set to 'sportPreset' or a non-null, non-empty 'customSportName' has to be supplied!"),
    INVALID_GROUP_INVITE_CODE(HttpStatus.BAD_REQUEST, "invalidGroupInviteCode", "Group invite code must be non-null and non-empty!"),
    INVALID_GROUP_ID(HttpStatus.BAD_REQUEST, "invalidGroupId", "Group id must be non-null and non-empty!"),
    /* SEASONS */
    SEASON_NOT_FOUND(HttpStatus.NOT_FOUND, "seasonNotFound", "The requested season could not be found!"),
    SEASON_ALREADY_ENDED(HttpStatus.FORBIDDEN, "seasonAlreadyEnded", "Past seasons are immutable!"),
    SEASON_WRONG_TIME_FORMAT(HttpStatus.BAD_REQUEST, "seasonWrongTimeFormat", "The wake time hour has to be between 0 and 23!"),
    SEASON_WRONG_TEAM_SIZES(HttpStatus.BAD_REQUEST, "seasonWrongTeamSizes", "The min team size has to be less then or equal to the max team size!"),
    SEASON_NOT_OF_GROUP(HttpStatus.FORBIDDEN, "seasonHasDifferentGroup", "The season does not match the provided group id!"),
    SEASON_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "seasonValidationFailed", "The validation of the created season has failed (invalid group id)"),
    INVALID_SEASON_NAME(HttpStatus.BAD_REQUEST, "invalidSeasonName", "Season name must be non-null, non-empty and between 2 and 50 characters!"),
    INVALID_RULE_MOVES(HttpStatus.BAD_REQUEST, "invalidRuleMoves", "Rule Moves must be non-null, contain at least one normal and one finish move and every move must be valid (name non-null, non empty; pointsForScorer and pointsForTeam > 0)"),
    INVALID_SEASON_ID(HttpStatus.BAD_REQUEST, "invalidSeasonId", "Season id must be non-null and non-empty!"),
    INVALID_SEASON_DTO(HttpStatus.BAD_REQUEST, "invalidSeasonDto", "Season update dto must be non-null and have non-null seasonSettings!"),
    /* MATCHES */
    MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "matchNotFound", "The requested match could not be found!"),
    MATCH_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "matchValidationFailed", "The validation of the created match has failed (invalid group or season id)"),
    MATCH_CREATE_DTO_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "matchCreateDtoValidationFailed", "The team sizes are not in the boundaries of the season settings!"),
    MATCH_DTO_VALIDATION_FAILED(HttpStatus.FORBIDDEN, "matchDtoValidationFailed", "The validation of the match create dto failed (invalid player, rulemove, season or group id, or no finish move)"),
    /* RULE MOVES */
    RULE_MOVE_NOT_FOUND(HttpStatus.NOT_FOUND, "ruleMoveNotFound", "The requested ruleMove could not be found!"),
    RULE_MOVE_VALIDATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "ruleMoveValidationFailed", "The rulemove is not part of the provided season or the provided season is not part of the provided gorup!"),
    RULE_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "ruleValidationFailed", "The validation of the created rules has failed (invalid group or season id)"),
    /* PLAYERS */
    PLAYER_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "playerValidationFailed", "The player is not part of the provided season or group!"),
    PLAYER_NOT_FOUND(HttpStatus.NOT_FOUND, "playerNotFound", "The requested player could not be found!"),
    PLAYER_ALREADY_DELETED(HttpStatus.FORBIDDEN, "playerAlreadyDeleted", "This player has been deleted!"),
    INVALID_PLAYER_ID(HttpStatus.BAD_REQUEST, "invalidPlayerId", "Player id must be non-null and non-empty!"),
    /* PROFILES */
    PROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "profileNotFound", "The requested profile could not be found!"),
    PROFILE_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "profileAlreadyExists", "There already exists a profile with the provided name and an active player in the current season!"),
    /* ASSETS */
    ASSET_NOT_FOUND(HttpStatus.NOT_FOUND, "assetNotFound", "The requested asset could not be found!"),
    /* LEADERBOARDS */
    LEADERBOARD_SCOPE_NOT_FOUND(HttpStatus.NOT_FOUND, "leaderboardScopeNotFound", "The leaderboard scope has to be one of: all-time, today, season"),
    LEADERBOARD_SEASON_NOT_FOUND(HttpStatus.NOT_FOUND, "leaderboardScopeNotFound", "The scope 'season' requires a seasonId param!"),
    /* AUTH */
    AUTH_REGISTER_INVALID_DTO(HttpStatus.BAD_REQUEST, "authRegisterInvalidDto", "The installationType or deviceId is invalid!"),
    AUTH_REFRESH_INVALID_DTO(HttpStatus.BAD_REQUEST, "authRefreshInvalidDto", "The refreshToken has to be non-null and non-empty!"),
    AUTH_REFRESH_INVALID_TOKEN(HttpStatus.BAD_REQUEST, "authRefreshInvalidToken", "The refreshToken is no refresh-token, invalid or the subject-userId is invalid!");

    private final HttpStatus httpStatus;
    private final String code;
    private final String description;

    public ResponseEnvelope.ErrorDetails toDetails() {
        return new ResponseEnvelope.ErrorDetails(code, description);
    }
}
