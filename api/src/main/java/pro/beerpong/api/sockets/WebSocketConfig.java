package pro.beerpong.api.sockets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final SubscriptionHandler subscriptionHandler;

    @Autowired
    public WebSocketConfig(SubscriptionHandler subscriptionHandler) {
        this.subscriptionHandler = subscriptionHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(subscriptionHandler, "/update-socket")
                .setAllowedOrigins("*");
    }
}