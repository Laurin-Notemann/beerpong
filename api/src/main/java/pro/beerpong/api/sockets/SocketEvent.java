package pro.beerpong.api.sockets;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class SocketEvent<T> {
    private final String groupId;
    private final SocketEventType eventType;

    private final T body;
    /*
    {
    groupId: "",
    scope: "matches" | "users" | "seasons" | "groups",
    eventType: "matchCreated",
    body: {
        id: string // match id
        date: date
        redTeam...
        blueTeam...
    },
}
     */
}
