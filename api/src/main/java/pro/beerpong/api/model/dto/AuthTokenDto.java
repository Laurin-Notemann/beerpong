package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.TokenType;

import java.time.ZonedDateTime;

@Data
public class AuthTokenDto {
    private String token;
    private TokenType type;
}