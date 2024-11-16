package pro.beerpong.api;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import pro.beerpong.api.model.dto.ResponseEnvelope;

@Component
@RequiredArgsConstructor
public class TestUtils {
    private final TestRestTemplate restTemplate;

    public <T> ResponseEntity<ResponseEnvelope<T>> performGet(int port, String path, ParameterizedTypeReference<ResponseEnvelope<T>> responseType) {
        return performCall(port, path, HttpMethod.GET, null, responseType);
    }

    public <T> ResponseEntity<ResponseEnvelope<T>> performPost(int port, String path, Object body, ParameterizedTypeReference<ResponseEnvelope<T>> responseType) {
        return performCall(port, path, HttpMethod.POST, body, responseType);
    }

    public <T> ResponseEntity<ResponseEnvelope<T>> performPut(int port, String path, Object body, ParameterizedTypeReference<ResponseEnvelope<T>> responseType) {
        return performCall(port, path, HttpMethod.PUT, body, responseType);
    }

    public <T> ResponseEntity<ResponseEnvelope<T>> performDelete(int port, String path, Object body, ParameterizedTypeReference<ResponseEnvelope<T>> responseType) {
        return performCall(port, path, HttpMethod.DELETE, body, responseType);
    }

    public <T> ResponseEntity<ResponseEnvelope<T>> performCall(int port, String path, HttpMethod method, Object body, ParameterizedTypeReference<ResponseEnvelope<T>> responseType) {
        return restTemplate.exchange("http://localhost:" + port + path, method, body == null ? null : new HttpEntity<>(body), responseType);
    }
}
