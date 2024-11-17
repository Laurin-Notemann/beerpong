package pro.beerpong.api.sockets;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.model.dto.PlayerDto;
import pro.beerpong.api.model.dto.RuleDto;

import java.util.List;

@Getter
@RequiredArgsConstructor
public class SocketEventData<T> {
    public static final SocketEventData<GroupDto> GROUP_CREATE = new SocketEventData<>(GroupDto.class, SocketEventType.GROUPS, "groupCreate");
    public static final SocketEventData<GroupDto> GROUP_UPDATE = new SocketEventData<>(GroupDto.class, SocketEventType.GROUPS, "groupUpdate");

    public static final SocketEventData<MatchDto> MATCH_UPDATE = new SocketEventData<>(MatchDto.class, SocketEventType.MATCHES, "matchCreate");

    public static final SocketEventData<PlayerDto> PLAYER_DELETE = new SocketEventData<>(PlayerDto.class, SocketEventType.PLAYERS, "playerDelete");

    public static final SocketEventData<RuleDto[]> RULES_WRITE = new SocketEventData<>(RuleDto[].class, SocketEventType.RULES, "rulesWrite");

    private final Class<T> bodyClass;
    private final SocketEventType eventType;
    private final String scope;
}
