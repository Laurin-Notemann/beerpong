package pro.beerpong.api.model.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCodes {
    GROUP_NOT_FOUND("groupNotFound", "The requested group could not be found!"),
    SEASON_NOT_FOUND("seasonNotFound", "The requested season could not be found!"),
    SEASON_VALIDATION_FAILED("seasonValidationFailed", "The validation of the created season has failed (invalid group id)"),
    MATCH_NOT_FOUND("matchNotFound", "The requested match could not be found!"),
    MATCH_VALIDATION_FAILED("matchValidationFailed", "The validation of the created match has failed (invalid group or season id)"),
    RULE_VALIDATION_FAILED("ruleValidationFailed", "The validation of the created rules has failed (invalid group or season id)");

    private final String code;
    private final String descr;

    public ResponseEnvelope.ErrorDetails toDetails() {
        return new ResponseEnvelope.ErrorDetails(code, descr);
    }
}
