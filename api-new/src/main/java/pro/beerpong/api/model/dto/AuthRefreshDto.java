package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class AuthRefreshDto {
    private String refreshToken;
}