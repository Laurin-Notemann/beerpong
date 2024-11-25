package pro.beerpong.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import pro.beerpong.api.model.dto.ResponseEnvelope;

@Component
@RequiredArgsConstructor
public class TestUtils {
    private final TestRestTemplate restTemplate;

    public ResponseEntity<Object> performGet(int port, String path, Class<?> firstClazz, Class<?>... classes) {
        return performCall(port, path, HttpMethod.GET, null, firstClazz, classes);
    }

    public ResponseEntity<Object> performPost(int port, String path, Object body, Class<?> firstClazz,
            Class<?>... classes) {
        return performCall(port, path, HttpMethod.POST, body, firstClazz, classes);
    }

    public ResponseEntity<Object> performPut(int port, String path, Object body, Class<?> firstClazz,
            Class<?>... classes) {
        return performCall(port, path, HttpMethod.PUT, body, firstClazz, classes);
    }

    public ResponseEntity<Object> performDelete(int port, String path, Object body, Class<?> firstClazz,
            Class<?>... classes) {
        return performCall(port, path, HttpMethod.DELETE, body, firstClazz, classes);
    }

    public ResponseEntity<Object> performCall(int port, String path, HttpMethod method, Object body,
            Class<?> firstClazz, Class<?>... classes) {
        var exchange = restTemplate.exchange("http://localhost::" + port + path, method,
                body == null ? null : new HttpEntity<>(body), String.class);

        var objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();

        var typeFactory = objectMapper.getTypeFactory();

        JavaType valueType = null;

        int limit = classes.length + 1;

        for (int i = limit - 1; i >= 0; i--) {

            if (limit - 1 == 0) {
                // list is empty
                valueType = typeFactory.constructParametricType(ResponseEnvelope.class, firstClazz);
            } else {
                // list isn't empty

                if (i == 0) {
                    // firstClass height

                    if (limit - 1 == 1) {
                        // list has just 1 element
                        valueType = typeFactory.constructParametricType(firstClazz, classes[i]);
                    } else {
                        // list has > 1 element
                        valueType = typeFactory.constructParametricType(firstClazz, valueType);
                    }

                    valueType = typeFactory.constructParametricType(ResponseEnvelope.class, valueType);
                } else {
                    // over firstClass height, inside classes list

                    if (limit - 1 > 1 && i < limit - 1) {
                        // list has > 1 element + skip last pair

                        if (valueType == null) {
                            valueType = typeFactory.constructParametricType(classes[i - 1], classes[i]);
                        } else {
                            valueType = typeFactory.constructParametricType(classes[i - 1], valueType);
                        }
                    }
                }
            }
        }

        var responseBody = exchange.getBody();

        if (responseBody == null) {
            return ResponseEntity.status(exchange.getStatusCode()).build();
        }

        Object responseEnvelope;

        try {
            responseEnvelope = objectMapper.readValue(responseBody, valueType);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        return ResponseEntity.status(exchange.getStatusCode()).body(responseEnvelope);
    }
}