package pro.beerpong.api.sockets;

import lombok.Getter;

@Getter
public class SocketEvent<T> {
    private final String groupId;
    private final SocketEventType eventType;
    private final String scope;
    private final T body;

    public SocketEvent(SocketEventData<T> data, String groupId, T body) {
        this.groupId = groupId;
        this.eventType = data.eventType();
        this.scope = data.scope();
        this.body = body;
    }
}
