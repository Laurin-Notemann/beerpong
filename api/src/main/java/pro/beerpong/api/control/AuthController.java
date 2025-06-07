package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pro.beerpong.api.model.dto.AuthRegisterDto;
import pro.beerpong.api.model.dto.AuthTokenDto;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.AuthService;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @GetMapping("signup")
    public ResponseEntity<ResponseEnvelope<AuthTokenDto>> signup(@RequestBody AuthRegisterDto authRegisterDto) {
        var result = authService.registerDevice(authRegisterDto);

        if (result == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_REGISTER_INVALID_DTO);
        }

        return ResponseEnvelope.ok(result);
    }

    @GetMapping("refresh")
    public ResponseEntity<ResponseEnvelope<AuthTokenDto>> refreshAuth() {
        return ResponseEnvelope.ok(null);
    }
}
