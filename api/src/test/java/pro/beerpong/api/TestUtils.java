package pro.beerpong.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import pro.beerpong.api.model.dto.ResponseEnvelope;

import java.util.Arrays;
import java.util.stream.Stream;

@Component
@RequiredArgsConstructor
public class TestUtils {
    private final TestRestTemplate restTemplate;

    public ResponseEntity<Object> performGet(int port, String path, Class<?> firstClazz, Class<?>... classes) {
        return performCall(port, path, HttpMethod.GET, null, firstClazz, classes);
    }

    public ResponseEntity<Object> performPost(int port, String path, Object body, Class<?> firstClazz, Class<?>... classes) {
        return performCall(port, path, HttpMethod.POST, body, firstClazz, classes);
    }

    /*public <T> ResponseEntity<ResponseEnvelope<T>> performPut(int port, String path, Object body, ParameterizedTypeReference<ResponseEnvelope<T>> responseType) {
        return performCall(port, path, HttpMethod.PUT, body, responseType);
    }

    public <T> ResponseEntity<ResponseEnvelope<T>> performDelete(int port, String path, Object body, ParameterizedTypeReference<ResponseEnvelope<T>> responseType) {
        return performCall(port, path, HttpMethod.DELETE, body, responseType);
    }*/

    public ResponseEntity<Object> performCall(int port, String path, HttpMethod method, Object body, Class<?> firstClazz, Class<?>... classes) {
        var exchange = restTemplate.exchange("http://localhost:" + port + path, method, body == null ? null : new HttpEntity<>(body), String.class);

        var objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();

        Object responseEnvelope;

        try {
            responseEnvelope = objectMapper.readValue(exchange.getBody(), objectMapper.getTypeFactory()
                    .constructParametricType(ResponseEnvelope.class, Stream.concat(Stream.of(firstClazz), Arrays.stream(classes)).toArray(Class[]::new)));
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        return ResponseEntity.ok(responseEnvelope);
    }
}
