package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@Data
public class ResponseEnvelope<T> {
    private Status status;
    private Integer httpCode;
    private T data;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private ErrorDetails error;

    public ResponseEnvelope(Status status, Integer httpCode, T data) {
        this.status = status;
        this.httpCode = httpCode;
        this.data = data;
    }

    public ResponseEnvelope(Status status, Integer httpCode, ErrorDetails error) {
        this.status = status;
        this.httpCode = httpCode;
        this.error = error;
    }

    public static <T> ResponseEntity<ResponseEnvelope<T>> ok(T data) {
        return new ResponseEntity<>(new ResponseEnvelope<>(ResponseEnvelope.Status.OK, HttpStatus.OK.value(), data), HttpStatus.OK);
    }

    public static <T> ResponseEntity<ResponseEnvelope<T>> notOk(HttpStatus status, ErrorCodes codes) {
        return notOk(status, codes.toDetails());
    }

    public static <T> ResponseEntity<ResponseEnvelope<T>> notOk(HttpStatus status, String code, String descr) {
        return notOk(status, new ErrorDetails(code, descr));
    }

    public static <T> ResponseEntity<ResponseEnvelope<T>> notOk(HttpStatus status, ErrorDetails details) {
        return new ResponseEntity<>(new ResponseEnvelope<>(Status.ERROR, status.value(), details), status);
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