package pro.beerpong.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.util.Lists;
import lombok.extern.log4j.Log4j2;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import pro.beerpong.api.auth.JwtTokenProvider;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.auth.AuthRefreshDto;
import pro.beerpong.api.model.dto.auth.AuthSignupDto;
import pro.beerpong.api.model.dto.auth.AuthTokenDto;
import pro.beerpong.api.util.InstallationType;
import pro.beerpong.api.util.TokenType;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@Log4j2
@Component
public class RequestUtils {
    private static final List<String> GROUP_ACCESS = Lists.newArrayList();
    private static String REFRESH_TOKEN;
    private static String AUTH_TOKEN;
    private static boolean RESET_FOR_NEXT_REQUEST = false;
    private static boolean DEBUG = false;

    private final TestRestTemplate restTemplate;
    private final JwtTokenProvider jwtTokenProvider;

    public RequestUtils(TestRestTemplate restTemplate, JwtTokenProvider jwtTokenProvider) {
        this.restTemplate = restTemplate;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public static void withDebug() {
        DEBUG = true;
    }

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

    public void resetAuthForNextRequest() {
        RESET_FOR_NEXT_REQUEST = true;
    }

    public void resetAuth() {
        REFRESH_TOKEN = null;
        AUTH_TOKEN = null;
        GROUP_ACCESS.clear();
    }

    @SuppressWarnings("unchecked")
    private String generateAuthToken(int port) {
        String tempRefresh = REFRESH_TOKEN;

        if (RESET_FOR_NEXT_REQUEST || REFRESH_TOKEN == null) {
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

            tempRefresh = signupTokenDto.getToken();

            if (!RESET_FOR_NEXT_REQUEST) {
                REFRESH_TOKEN = tempRefresh;
            }

        }

        var tempAuth = AUTH_TOKEN;

        if (RESET_FOR_NEXT_REQUEST || AUTH_TOKEN == null) {
            var refreshDto = new AuthRefreshDto();
            refreshDto.setRefreshToken(tempRefresh);

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

            tempAuth = refreshTokenDto.getToken();

            if (!RESET_FOR_NEXT_REQUEST) {
                AUTH_TOKEN = tempAuth;
            }
        }

        RESET_FOR_NEXT_REQUEST = false;

        return tempAuth;
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

        if (!responseBody.startsWith("{") && !responseBody.startsWith("[")) {
            return ResponseEntity.status(exchange.getStatusCode()).body(responseBody);
        }

        Object responseEnvelope;

        try {
            responseEnvelope = objectMapper.readValue(responseBody, valueType);
        } catch (JsonProcessingException e) {
            log.error("Error whilst parsing body '{}'!", responseBody);
            throw new RuntimeException(e);
        }

        return ResponseEntity.status(exchange.getStatusCode()).body(responseEnvelope);
    }

    @SuppressWarnings("unchecked")
    public <T> T assertSuccess(ResponseEntity<Object> response, Class<T> tClass) {
        if (DEBUG) {
            log.info("Received response: {} with code {} which is expected to SUCCEED", response.getBody(), response.getStatusCode().value());
        }

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        ResponseEnvelope<Object> envelope = (ResponseEnvelope<Object>) response.getBody();
        assertNotNull(envelope);
        assertEquals(ResponseEnvelope.Status.OK, envelope.getStatus());
        assertEquals(200, envelope.getHttpCode());
        assertNull(envelope.getError());
        assertNotNull(envelope.getData());
        assertEquals(tClass, envelope.getData().getClass());

        return tClass.cast(envelope.getData());
    }

    @SuppressWarnings("unchecked")
    public void assertFailure(ResponseEntity<Object> response, ErrorCodes error) {
        if (DEBUG) {
            log.info("Received response: {} with code {} which is expected to FAIL!", response.getBody(), response.getStatusCode().value());
        }

        assertNotNull(response);
        assertEquals(error.getHttpStatus().value(), response.getStatusCode().value());

        ResponseEnvelope<Object> envelope = (ResponseEnvelope<Object>) response.getBody();
        assertNotNull(envelope);
        assertEquals(ResponseEnvelope.Status.ERROR, envelope.getStatus());
        assertEquals(error.getHttpStatus().value(), envelope.getHttpCode());
        assertNotNull(envelope.getError());
        assertEquals(error.getCode(), envelope.getError().getCode());
        assertEquals(error.getDescription(), envelope.getError().getDescription());
        assertNull(envelope.getData());
    }

    public void assertFailure(ResponseEntity<Object> response, HttpStatus status, String message) {
        if (DEBUG) {
            log.info("Received response: {} with code {} which is expected to FAIL!", response.getBody(), response.getStatusCode().value());
        }

        assertNotNull(response);
        assertEquals(status.value(), response.getStatusCode().value());

        String result = (String) response.getBody();
        assertNotNull(result);
        assertEquals(message, result);
    }

    public String currentUserId() {
        if (REFRESH_TOKEN == null || REFRESH_TOKEN.trim().isEmpty()) {
            return null;
        }

        var claims = jwtTokenProvider.validateToken(REFRESH_TOKEN, "refresh");

        if (claims == null) {
            return null;
        }

        return claims.getSubject();
    }
}