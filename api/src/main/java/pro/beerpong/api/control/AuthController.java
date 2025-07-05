package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.AuthService;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
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
            System.out.println("[auth-debug] token is empty: " + dto.getRefreshToken());
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_REFRESH_INVALID_DTO);
        }

        var result = authService.refreshAuth(dto);

        if (result == null) {
            System.out.println("[auth-debug] token is invalid: " + dto.getRefreshToken());
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_REFRESH_INVALID_TOKEN);
        }

        return ResponseEnvelope.ok(result);
    }
}
