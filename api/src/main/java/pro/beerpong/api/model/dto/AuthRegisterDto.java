package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.InstallationType;
import pro.beerpong.api.util.TokenType;

@Data
public class AuthRegisterDto {
    private InstallationType installationType;
    private String deviceId;
}