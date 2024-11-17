package pro.beerpong.api.sockets;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.TextMessage;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ConnectionHandler extends TextWebSocketHandler {

    private final Map<String, Set<String>> userGroups = new ConcurrentHashMap<>();
    private final Map<String, Set<WebSocketSession>> groupSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println("connected: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        System.out.println("received message " + message.toString());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = session.getId();

        if (!userGroups.containsKey(userId)) {
            return;
        }

        Set<String> groupIds = userGroups.get(userId);

        for (String groupId : groupIds) {
            if (groupSessions.containsKey(groupId)) {
                groupSessions.get(groupId).remove(session);

                if (groupSessions.get(groupId).isEmpty()) {
                    groupSessions.remove(groupId);
                }
            }
        }

        userGroups.remove(userId);

        System.out.println("disconnected: " + session.getId());
    }

    public void saveGroupIds(WebSocketSession session, Set<String> ids) {
        var userId = session.getId();

        userGroups.put(userId, ids);

        for (String groupId : ids) {
            groupSessions.computeIfAbsent(groupId, k -> ConcurrentHashMap.newKeySet()).add(session);
        }
    }

    public void sendMessageToGroup(String groupId, String message) throws IOException {
        Set<WebSocketSession> sessions = groupSessions.get(groupId);
        if (sessions != null) {
            for (WebSocketSession session : sessions) {
                session.sendMessage(new TextMessage(message));
            }
        }
    }
}
