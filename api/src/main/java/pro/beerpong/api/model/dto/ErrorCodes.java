package pro.beerpong.api.model.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCodes {
    GROUP_NOT_FOUND("groupNotFound", "The requested group could not be found!"),
    GROUP_INVITE_NOT_FOUND("groupInviteNotFound", "No group with the provided invite code could be found!"),
    GROUP_INVITE_CODE_NOT_PROVIDED("groupInviteCodeNotProvided", "The invite code needs to be provided!"),
    SEASON_NOT_FOUND("seasonNotFound", "The requested season could not be found!"),
    SEASON_ALREADY_ENDED("seasonAlreadyEnded", "Past seasons are immutable!"),
    SEASON_WRONG_TIME_FORMAT("seasonWrongTimeFormat", "The wake time hour has to be between 0 and 23!"),
    SEASON_WRONG_TEAM_SIZES("seasonWrongTeamSizes", "The min team size has to be less then or equal to the max team size!"),
    SEASON_NOT_OF_GROUP("seasonHasDifferentGroup", "The season does not match the provided group id!"),
    SEASON_VALIDATION_FAILED("seasonValidationFailed", "The validation of the created season has failed (invalid group id)"),
    MATCH_NOT_FOUND("matchNotFound", "The requested match could not be found!"),
    MATCH_VALIDATION_FAILED("matchValidationFailed", "The validation of the created match has failed (invalid group or season id)"),
    MATCH_CREATE_DTO_VALIDATION_FAILED("matchCreateDtoValidationFailed", "The team sizes are not in the boundaries of the season settings!"),
    MATCH_DTO_VALIDATION_FAILED("matchDtoValidationFailed", "The validation of the match create dto failed (invalid player, rulemove, season or group id, or no finish move)"),
    RULE_MOVE_NOT_FOUND("ruleMoveNotFound", "The requested ruleMove could not be found!"),
    RULE_MOVE_VALIDATION_FAILED("ruleMoveValidationFailed", "The rulemove is not part of the provided season or the provided season is not part of the provided gorup!"),
    RULE_VALIDATION_FAILED("ruleValidationFailed", "The validation of the created rules has failed (invalid group or season id)"),
    PLAYER_VALIDATION_FAILED("playerValidationFailed", "The player is not part of the provided season or group!"),
    PLAYER_NOT_FOUND("playerNotFound", "The requested player could not be found!"),
    PROFILE_NOT_FOUND("profileNotFound", "The requested profile could not be found!"),
    ASSET_NOT_FOUND("assetNotFound", "The requested asset could not be found!"),
    LEADERBOARD_SCOPE_NOT_FOUND("leaderboardScopeNotFound", "The leaderboard scope has to be one of: all-time, today, season"),
    LEADERBOARD_SEASON_NOT_FOUND("leaderboardScopeNotFound", "The scope 'season' requires a seasonId param!");

    private final String code;
    private final String description;

    public ResponseEnvelope.ErrorDetails toDetails() {
        return new ResponseEnvelope.ErrorDetails(code, description);
    }
}
