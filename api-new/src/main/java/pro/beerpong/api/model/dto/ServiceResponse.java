package pro.beerpong.api.model.dto;

import lombok.Getter;
import org.jetbrains.annotations.NotNull;
import pro.beerpong.api.model.ErrorCodes;

@Getter
public class ServiceResponse<T> {
    private T data;
    private ErrorCodes errorCode;

    private ServiceResponse(@NotNull T data) {
        this.data = data;
    }

    private ServiceResponse(@NotNull ErrorCodes errorCode) {
        this.errorCode = errorCode;
    }

    public static <T> ServiceResponse<T> ok(T data) {
        return new ServiceResponse<>(data);
    }

    public static <T> ServiceResponse<T> error(ErrorCodes code) {
        return new ServiceResponse<>(code);
    }

    public boolean isError() {
        return this.data == null && this.errorCode != null;
    }
}
