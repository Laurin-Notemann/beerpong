package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
public class ResponseEnvelope<T> {
    private Status status;
    private Integer httpCode;
    private T data;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private ErrorDetails error;

    public ResponseEnvelope(Status status, Integer httpCode, T data, String message) {
        this.status = status;
        this.httpCode = httpCode;
        this.data = data;
    }

    public ResponseEnvelope(Status status, Integer httpCode, ErrorDetails error, String message) {
        this.status = status;
        this.httpCode = httpCode;
        this.error = error;
    }

    @Data
    public static class ErrorDetails {
        private String code;
        private String description;

        public ErrorDetails(String code, String description) {
            this.code = code;
            this.description = description;
        }
    }

    public enum Status {
        OK,
        ERROR
    }
}