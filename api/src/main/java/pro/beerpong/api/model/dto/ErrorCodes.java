package pro.beerpong.api.model.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCodes {
    GROUP_NOT_FOUND("groupNotFound", "The requested group could not be found!"),
    SEASON_NOT_FOUND("seasonNotFound", "The requested season could not be found!");

    private final String code;
    private final String descr;

    public ResponseEnvelope.ErrorDetails toDetails() {
        return new ResponseEnvelope.ErrorDetails(code, descr);
    }
}
