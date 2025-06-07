package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.InstallationType;

@Data
public class AuthRefreshDto {
    private String refreshToken;
}