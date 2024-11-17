package pro.beerpong.api.sockets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class EventService {
/*    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public EventService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }*/

    public void callEvent(SocketEvent<?> event) {
        //messagingTemplate.convertAndSend("/events", event);
    }
}
