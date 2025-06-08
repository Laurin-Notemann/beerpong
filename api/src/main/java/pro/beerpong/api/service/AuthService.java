package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.auth.JwtTokenProvider;
import pro.beerpong.api.mapping.UserMapper;
import pro.beerpong.api.model.dao.Device;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.GroupMember;
import pro.beerpong.api.model.dao.User;
import pro.beerpong.api.model.dto.AuthRefreshDto;
import pro.beerpong.api.model.dto.AuthSignupDto;
import pro.beerpong.api.model.dto.AuthTokenDto;
import pro.beerpong.api.model.dto.UserDto;
import pro.beerpong.api.repository.DeviceRepository;
import pro.beerpong.api.repository.GroupMemberRepository;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.UserRepository;
import pro.beerpong.api.util.TokenType;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final UserMapper userMapper;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupRepository groupRepository;

    public AuthTokenDto registerDevice(AuthSignupDto dto) {
        if (dto.getDeviceId() == null || dto.getDeviceId().trim().isEmpty() || dto.getInstallationType() == null) {
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

        var refreshToken = tokenProvider.createRefreshToken(user.getId());

        return this.buildDto(refreshToken, TokenType.REFRESH);
    }

    public AuthTokenDto refreshAuth(AuthRefreshDto dto) {
        if (dto.getRefreshToken() == null || dto.getRefreshToken().trim().isEmpty()) {
            return null;
        }

        var claims = tokenProvider.validateToken(dto.getRefreshToken(), "refresh");

        if (claims == null) {
            return null;
        }

        var userId = claims.getSubject();

        if (!userRepository.existsById(userId)) {
            return null;
        }

        var accessToken = tokenProvider.createAccessToken(userId);

        return this.buildDto(accessToken, TokenType.ACCESS);
    }

    public UserDto userFromAccessToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }

        var claims = tokenProvider.validateToken(token, "access");

        if (claims == null) {
            return null;
        }

        var userId = claims.getSubject();

        return userRepository.findById(userId)
                .map(userMapper::userToUserDto)
                .orElse(null);
    }

    public boolean hasAccessToGroup(UserDto user, String groupId) {
        return groupMemberRepository.existsByUserIdAndGroupId(user.getId(), groupId);
    }

    public GroupMember memberByUser(UserDto user, String groupId) {
        return groupMemberRepository.findByUserIdAndGroupId(user.getId(), groupId);
    }

    @Transactional
    public GroupMember buildFirstGroupMember(UserDto user) {
        var groupMember = new GroupMember();
        groupMember.setUser(userMapper.userDtoToUser(user));

        return groupMember;
    }

    @Transactional
    public GroupMember joinGroup(UserDto user, String groupId) {
        var groupMember = new GroupMember();
        groupMember.setUser(userMapper.userDtoToUser(user));
        groupMember.setGroup(groupRepository.findById(groupId).orElse(null));

        saveMember(groupMember);

        return groupMember;
    }

    public GroupMember saveMember(GroupMember groupMember) {
        return groupMemberRepository.save(groupMember);
    }

    @Transactional
    public void leaveGroup(UserDto user, String groupId) {
        groupMemberRepository.deleteByUserIdAndGroupId(user.getId(), groupId);
    }

    private AuthTokenDto buildDto(String token, TokenType type) {
        var result = new AuthTokenDto();

        result.setToken(token);
        result.setType(type);

        return result;
    }
}
