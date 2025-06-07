package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.auth.JwtTokenProvider;
import pro.beerpong.api.model.dao.Device;
import pro.beerpong.api.model.dao.User;
import pro.beerpong.api.model.dto.AuthRegisterDto;
import pro.beerpong.api.model.dto.AuthTokenDto;
import pro.beerpong.api.repository.DeviceRepository;
import pro.beerpong.api.repository.UserRepository;
import pro.beerpong.api.util.TokenType;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;

    public AuthTokenDto registerDevice(AuthRegisterDto dto) {
        if (dto.getDeviceId() == null || dto.getDeviceId().isEmpty() || dto.getInstallationType() == null) {
            return null;
        }

        var user = new User();
        user = userRepository.save(user);

        var device = new Device();
        device.setUser(user);
        device.setDeviceId(dto.getDeviceId());
        device.setType(dto.getInstallationType());
        //TODO set pushNotifyToken?

        deviceRepository.save(device);

        var token = tokenProvider.createRefreshToken(user.getId());
        var result = new AuthTokenDto();

        result.setToken(token);
        result.setType(TokenType.REFRESH);

        return result;
    }
}
