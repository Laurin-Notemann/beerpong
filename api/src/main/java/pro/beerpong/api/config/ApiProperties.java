package pro.beerpong.api.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Getter
public class ApiProperties {
    @Value("${API_BASE_URL}")
    private String apiBaseUrl;
}