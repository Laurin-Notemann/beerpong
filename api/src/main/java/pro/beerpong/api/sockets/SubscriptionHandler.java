package pro.beerpong.api.sockets;

import lombok.SneakyThrows;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.TextMessage;

import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.google.common.collect.Sets;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

@Component
public class SubscriptionHandler extends TextWebSocketHandler {
    private static final Pattern GROUP_IDS_PATTERN = Pattern.compile("groupIds:([^\n]+)");
    // Source: https://www.baeldung.com/java-validate-uuid-string
    private static final Pattern UUID_PATTERN = Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    private static final int MAX_GROUP_SUBSCRIPTIONS = 100;
    private static final Gson GSON = new GsonBuilder().serializeNulls().create();

    private final Map<String, Set<String>> userGroups = new ConcurrentHashMap<>();
    private final Map<String, Set<WebSocketSession>> groupSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        //TODO maybe validate connection, ...
        System.out.println("connected: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        System.out.println("received message: " + new String(message.asBytes()));

        var groupIds = extractGroupIds(GSON.fromJson(new String(message.asBytes()), JsonObject.class));

        if (groupIds == null || groupIds.isEmpty()) {
            return;
        }

        System.out.println(session.getId() + " subscribed to: " + groupIds);

        saveGroupIds(session, groupIds);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        var userId = session.getId();

        if (!userGroups.containsKey(userId)) {
            return;
        }

        var groupIds = userGroups.get(userId);

        for (String groupId : groupIds) {
            this.clearSession(groupId, session);
        }

        userGroups.remove(userId);

        System.out.println("disconnected: " + session.getId());
    }

    public void broadcastMessage(String message) {
        groupSessions.forEach((s, webSocketSessions) ->
                webSocketSessions.forEach(session ->
                        sendMessage(session, message)));
    }

    public void callEvent(SocketEvent<?> event) {
        if (!groupSessions.containsKey(event.getGroupId())) {
            return;
        }

        Sets.newHashSet(groupSessions.get(event.getGroupId())).forEach(session -> {
            if (session.isOpen()) {
                this.sendMessage(session, GSON.toJson(event));
            } else {
                this.clearSession(event.getGroupId(), session);
            }
        });
    }

    private void clearSession(String groupId, WebSocketSession session) {
        if (groupSessions.containsKey(groupId)) {
            groupSessions.get(groupId).remove(session);
            System.out.println(session.getId() + " unsubscribed from: " + groupId);

            if (groupSessions.get(groupId).isEmpty()) {
                groupSessions.remove(groupId);

                System.out.println(groupId + " has no subscriptions. Removing");
            }
        }
    }

    private void saveGroupIds(WebSocketSession session, Set<String> ids) {
        var userId = session.getId();

        userGroups.put(userId, ids);

        for (String groupId : ids) {
            groupSessions.computeIfAbsent(groupId, k -> ConcurrentHashMap.newKeySet()).add(session);
        }
    }

    @SneakyThrows
    private void sendMessage(WebSocketSession session, String message) {
        session.sendMessage(new TextMessage(message));
    }

    private Set<String> extractGroupIds(JsonObject jsonObject) {
        if (jsonObject == null || !jsonObject.has("groupIds") || !jsonObject.get("groupIds").isJsonArray()) {
            return null;
        }

        return Sets.newHashSet(jsonObject.get("groupIds").getAsJsonArray().iterator()).stream()
                .map(JsonElement::getAsString)
                .filter(s -> UUID_PATTERN.matcher(s).matches())
                .limit(MAX_GROUP_SUBSCRIPTIONS)
                .collect(Collectors.toSet());
    }
}
