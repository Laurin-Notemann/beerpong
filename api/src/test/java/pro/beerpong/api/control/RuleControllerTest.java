package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.RuleMoveService;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class RuleControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void ruleMoves_findAll_groupCreationCorrectMoves() {
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", "beerpong");

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(response, ArrayList.class);

        testUtils.assertRuleMovesEquals(RuleMoveService.DEFAULT_BEERPONG_MOVES, ruleMoves);
    }
}