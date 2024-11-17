package pro.beerpong.api.sockets;

import lombok.SneakyThrows;
import pro.beerpong.api.sockets.types.ZonedDateTimeAdapter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.TextMessage;

import java.time.ZonedDateTime;
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
    private static final Logger LOGGER = LoggerFactory.getLogger(SubscriptionHandler.class);

    private static final Pattern GROUP_IDS_PATTERN = Pattern.compile("groupIds:([^\n]+)");
    // Source: https://www.baeldung.com/java-validate-uuid-string
    private static final Pattern UUID_PATTERN = Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private static final int MAX_GROUP_SUBSCRIPTIONS = 100;

    private static final Gson GSON = new GsonBuilder()
            .serializeNulls()
            .registerTypeAdapter(ZonedDateTime.class, new ZonedDateTimeAdapter())
            .create();

    private final Map<String, Set<String>> userGroups = new ConcurrentHashMap<>();
    private final Map<String, Set<WebSocketSession>> groupSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        LOGGER.debug("SOCKETS: Client connected with id {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        LOGGER.debug("SOCKETS: Received message from {}: {}", session.getId(), new String(message.asBytes()));

        var groupIds = extractGroupIds(GSON.fromJson(new String(message.asBytes()), JsonObject.class));

        if (groupIds == null || groupIds.isEmpty()) {
            return;
        }

        LOGGER.debug("SOCKETS: {} subscribed to: {}", session.getId(), groupIds);

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

        LOGGER.debug("SOCKETS: Client with id {} disconnected", session.getId());
    }

    public void broadcastMessage(String message) {
        groupSessions.forEach((s, webSocketSessions) ->
                webSocketSessions.forEach(session ->
                        sendMessage(session, message)));
    }

    public void callEvent(SocketEvent<?> event) {
        LOGGER.debug("SOCKETS: Calling {} event for group {}", event.getEventType().name().toLowerCase(), event.getGroupId());

        if (!groupSessions.containsKey(event.getGroupId())) {
            return;
        }

        var json = GSON.toJson(event);

        Sets.newHashSet(groupSessions.get(event.getGroupId())).forEach(session -> {
            if (session.isOpen()) {
                this.sendMessage(session, json);
            } else {
                this.clearSession(event.getGroupId(), session);
            }
        });
    }

    private void clearSession(String groupId, WebSocketSession session) {
        if (groupSessions.containsKey(groupId)) {
            groupSessions.get(groupId).remove(session);

            LOGGER.debug("SOCKETS: Client with id {} unsubscribed from {}", session.getId(), groupId);

            if (groupSessions.get(groupId).isEmpty()) {
                groupSessions.remove(groupId);

                LOGGER.debug("SOCKETS: Group {} has no remaining subscriptions. Removing!", groupId);
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
