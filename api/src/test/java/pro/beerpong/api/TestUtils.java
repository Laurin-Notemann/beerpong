package pro.beerpong.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.util.Lists;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.util.InstallationType;
import pro.beerpong.api.util.TokenType;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Component
@RequiredArgsConstructor
public class TestUtils {
    private static List<String> GROUP_ACCESS = Lists.newArrayList();
    private static String REFRESH_TOKEN;
    private static String AUTH_TOKEN;

    private final TestRestTemplate restTemplate;

    public ResponseEntity<Object> performGet(int port, String path, Class<?> firstClazz, Class<?>... classes) {
        return performCall(true, port, path, HttpMethod.GET, null, firstClazz, classes);
    }

    public ResponseEntity<Object> performPost(int port, String path, Object body, Class<?> firstClazz, Class<?>... classes) {
        return performCall(true, port, path, HttpMethod.POST, body, firstClazz, classes);
    }

    public ResponseEntity<Object> performPut(int port, String path, Object body, Class<?> firstClazz, Class<?>... classes) {
        return performCall(true, port, path, HttpMethod.PUT, body, firstClazz, classes);
    }

    public ResponseEntity<Object> performDelete(int port, String path, Object body, Class<?> firstClazz, Class<?>... classes) {
        return performCall(true, port, path, HttpMethod.DELETE, body, firstClazz, classes);
    }

    @SuppressWarnings("unchecked")
    private String generateAuthToken(int port) {
        if (REFRESH_TOKEN == null) {
            var signupDto = new AuthSignupDto();
            signupDto.setDeviceId("test");
            signupDto.setInstallationType(InstallationType.IOS);

            var signupResponse = this.performCall(false, port, "/auth/signup", HttpMethod.POST, signupDto, AuthTokenDto.class);
            var signupEnvelope = (ResponseEnvelope<AuthTokenDto>) signupResponse.getBody();
            assert signupEnvelope != null;
            var signupTokenDto = signupEnvelope.getData();

            // Assertions
            assertNotNull(signupResponse);
            assertEquals(200, signupResponse.getStatusCode().value());
            assertNotNull(signupEnvelope);
            assertEquals(ResponseEnvelope.Status.OK, signupEnvelope.getStatus());
            assertNull(signupEnvelope.getError());
            assertEquals(200, signupEnvelope.getHttpCode());
            assertNotNull(signupTokenDto);
            assertEquals(TokenType.REFRESH, signupTokenDto.getType());
            assertNotNull(signupTokenDto.getToken());

            REFRESH_TOKEN = signupTokenDto.getToken();
        }

        if (AUTH_TOKEN == null) {
            var refreshDto = new AuthRefreshDto();
            refreshDto.setRefreshToken(REFRESH_TOKEN);

            var refreshResponse = this.performCall(false, port, "/auth/refresh", HttpMethod.POST, refreshDto, AuthTokenDto.class);
            var refreshEnvelope = (ResponseEnvelope<AuthTokenDto>) refreshResponse.getBody();
            assert refreshEnvelope != null;
            var refreshTokenDto = refreshEnvelope.getData();

            // Assertions
            assertNotNull(refreshResponse);
            assertEquals(200, refreshResponse.getStatusCode().value());
            assertNotNull(refreshEnvelope);
            assertEquals(ResponseEnvelope.Status.OK, refreshEnvelope.getStatus());
            assertNull(refreshEnvelope.getError());
            assertEquals(200, refreshEnvelope.getHttpCode());
            assertNotNull(refreshTokenDto);
            assertEquals(TokenType.ACCESS, refreshTokenDto.getType());
            assertNotNull(refreshTokenDto.getToken());

            AUTH_TOKEN = refreshTokenDto.getToken();
        }

        return AUTH_TOKEN;
    }

    public ResponseEntity<Object> performCall(boolean withAuth, int port, String path, HttpMethod method, Object body, Class<?> firstClazz, Class<?>... classes) {
        HttpHeaders headers = new HttpHeaders();

        if (withAuth) {
            headers.setBearerAuth(generateAuthToken(port));
        }

        headers.setContentType(MediaType.APPLICATION_JSON);

        var entity = (body == null ? new HttpEntity<>(headers) : new HttpEntity<>(body, headers));
        var exchange = restTemplate.exchange("http://localhost:" + port + path, method, entity, String.class);

        var objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();

        var typeFactory = objectMapper.getTypeFactory();

        JavaType valueType = null;

        int limit = classes.length + 1;

        for (int i = limit - 1; i >= 0; i--) {

            if (limit - 1 == 0) {
                //list is empty
                valueType = typeFactory.constructParametricType(ResponseEnvelope.class, firstClazz);
            } else {
                //list isn't empty

                if (i == 0) {
                    //firstClass height

                    if (limit - 1 == 1) {
                        //list has just 1 element
                        valueType = typeFactory.constructParametricType(firstClazz, classes[i]);
                    } else {
                        //list has > 1 element
                        valueType = typeFactory.constructParametricType(firstClazz, valueType);
                    }

                    valueType = typeFactory.constructParametricType(ResponseEnvelope.class, valueType);
                } else {
                    //over firstClass height, inside classes list

                    if (limit - 1 > 1 && i < limit - 1) {
                        //list has > 1 element + skip last pair

                        if (valueType == null) {
                            valueType = typeFactory.constructParametricType(classes[i-1], classes[i]);
                        } else {
                            valueType = typeFactory.constructParametricType(classes[i-1], valueType);
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