package pro.beerpong.api.control;

import org.springframework.http.HttpStatus;
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
        return new ResponseEntity<>(new ResponseEnvelope<>(ResponseEnvelope.Status.OK, 200, "OK", null), HttpStatus.OK);
    }
}
