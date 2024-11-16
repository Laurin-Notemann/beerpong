package pro.beerpong.api.control;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pro.beerpong.api.model.dto.ResponseEnvelope;

@RestController
@RequestMapping("/healthcheck")
public class HealthcheckController {
    @GetMapping
    public ResponseEntity<ResponseEnvelope<String>> getHealthcheck() {
        return ResponseEnvelope.ok("OK");
    }
}
