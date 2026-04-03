package pro.beerpong.api.model;

import lombok.Getter;
import org.jetbrains.annotations.NotNull;

@Getter
public class ServiceResponse<T> {
    private T data;
    private ErrorCodes errorCode;

    protected ServiceResponse(@NotNull T data) {
        this.data = data;
    }

    protected ServiceResponse(@NotNull ErrorCodes errorCode) {
        this.errorCode = errorCode;
    }

    public static <T> ServiceResponse<T> ok(T data) {
        return new ServiceResponse<>(data);
    }

    public static <T> ServiceResponse<T> error(ErrorCodes code) {
        return new ServiceResponse<>(code);
    }

    public boolean isOk() {
        return this.data != null;
    }

    public boolean isError() {
        return this.data == null && this.errorCode != null;
    }
}
