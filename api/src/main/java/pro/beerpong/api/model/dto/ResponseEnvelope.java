package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@Data
public class ResponseEnvelope<T> {
    private Status status;
    private Integer httpCode;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private T data;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private ErrorDetails error;

    public static <T> ResponseEntity<ResponseEnvelope<T>> ok(T data) {
        var envelope = new ResponseEnvelope<T>();
        envelope.setStatus(Status.OK);
        envelope.setHttpCode(HttpStatus.OK.value());
        envelope.setData(data);
        return new ResponseEntity<>(envelope, HttpStatus.OK);
    }

    public static <T> ResponseEntity<ResponseEnvelope<T>> okNoContent() {
        var envelope = new ResponseEnvelope<T>();
        envelope.setStatus(Status.OK);
        envelope.setHttpCode(HttpStatus.NO_CONTENT.value());
        return new ResponseEntity<>(envelope, HttpStatus.NO_CONTENT);
    }

    public static <T> ResponseEntity<ResponseEnvelope<T>> notOk(HttpStatus status, ErrorCodes code) {
        return notOk(status, code.toDetails());
    }

    public static <T> ResponseEntity<ResponseEnvelope<T>> notOk(HttpStatus status, String code, String descr) {
        return notOk(status, new ErrorDetails(code, descr));
    }

    public static <T> ResponseEntity<ResponseEnvelope<T>> notOk(HttpStatus status, ErrorDetails details) {
        var envelope = new ResponseEnvelope<T>();
        envelope.setStatus(Status.ERROR);
        envelope.setHttpCode(status.value());
        envelope.setError(details);

        return new ResponseEntity<>(envelope, status);
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