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
    SEASON_VALIDATION_FAILED("seasonValidationFailed", "The validation of the created season has failed (invalid group id)"),
    MATCH_NOT_FOUND("matchNotFound", "The requested match could not be found!"),
    MATCH_VALIDATION_FAILED("matchValidationFailed", "The validation of the created match has failed (invalid group or season id)"),
    MATCH_DTO_VALIDATION_FAILED("matchDtoValidationFailed", "The validation of the match create dto failed (invalid player, rulemove or season id)"),
    RULE_MOVE_NOT_FOUND("ruleMoveNotFound", "The requested ruleMove could not be found!"),
    RULE_MOVE_VALIDATION_FAILED("ruleMoveValidationFailed", "The validation of the created rule move has failed (invalid group or season id)"),
    RULE_VALIDATION_FAILED("ruleValidationFailed", "The validation of the created rules has failed (invalid group or season id)"),
    PLAYER_VALIDATION_FAILED("playerValidationFailed", "The validation of the player to delete has failed (invalid group or season id)"),
    PLAYER_NOT_FOUND("playerNotFound", "The requested player could not be found!"),
    PROFILE_NOT_FOUND("profileNotFound", "The requested profile could not be found!"),
    ASSET_NOT_FOUND("assetNotFound", "The requested asset could not be found!");

    private final String code;
    private final String description;

    public ResponseEnvelope.ErrorDetails toDetails() {
        return new ResponseEnvelope.ErrorDetails(code, description);
    }
}
