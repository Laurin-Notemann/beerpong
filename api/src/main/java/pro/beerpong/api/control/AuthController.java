package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.auth.AuthRefreshDto;
import pro.beerpong.api.model.dto.auth.AuthSignupDto;
import pro.beerpong.api.model.dto.auth.AuthTokenDto;
import pro.beerpong.api.service.AuthService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    @PostMapping("signup")
    public ResponseEntity<ResponseEnvelope<AuthTokenDto>> signup(@RequestBody AuthSignupDto authSignupDto) {
        var result = authService.registerDevice(authSignupDto);

        if (result == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_REGISTER_INVALID_DTO);
        }

        return ResponseEnvelope.ok(result);
    }

    @PostMapping("refresh")
    public ResponseEntity<ResponseEnvelope<AuthTokenDto>> refreshAuth(@RequestBody AuthRefreshDto dto) {
        if (dto.getRefreshToken() == null || dto.getRefreshToken().trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_REFRESH_INVALID_DTO);
        }

        var result = authService.refreshAuth(dto);

        if (result == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_REFRESH_INVALID_TOKEN);
        }

        return ResponseEnvelope.ok(result);
    }
}
