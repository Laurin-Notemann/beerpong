package pro.beerpong.api.model.dto.auth;

import lombok.Data;

@Data
public class AuthRefreshDto {
    private String refreshToken;
}