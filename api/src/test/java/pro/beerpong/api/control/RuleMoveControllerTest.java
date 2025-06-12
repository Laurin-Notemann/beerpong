package pro.beerpong.api.control;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.dto.*;

import java.util.ArrayList;
import java.util.List;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class RuleMoveControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    public void ruleMoves_findAll() {
        var prerequisteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisteGroup.getId() + "/seasons/" + prerequisteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = requestUtils.assertSuccess(response, ArrayList.class);


    }

    @Test
    public void season_findById_invalidId() {
        var prerequisteGroup1 = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisteGroup1.getId() + "/seasons/someIdThatNotExists", SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisteGroup2 = testUtils.createTestGroup(port);

        // season form other group
        response = requestUtils.performGet(port, "/groups/" + prerequisteGroup1.getId() + "/seasons/" + prerequisteGroup2.getActiveSeason().getId(), SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);
    }
}