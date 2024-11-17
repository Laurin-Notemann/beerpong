package pro.beerpong.api.sockets;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.MatchDto;

@Getter
@RequiredArgsConstructor
public class SocketEventData<T> {
    public static final SocketEventData<GroupDto> GROUP_CREATE = new SocketEventData<>(GroupDto.class, SocketEventType.GROUPS, "groupCreate");
    public static final SocketEventData<GroupDto> GROUP_UPDATE = new SocketEventData<>(GroupDto.class, SocketEventType.GROUPS, "groupUpdate");

    private final Class<T> bodyClass;
    private final SocketEventType eventType;
    private final String scope;
}
