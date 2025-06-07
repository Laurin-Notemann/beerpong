package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.InstallationType;

@Data
public class AuthSignupDto {
    private InstallationType installationType;
    private String deviceId;
}