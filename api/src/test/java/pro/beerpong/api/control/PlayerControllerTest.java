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

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class PlayerControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    //TODO season start: test copying of players (with statistics)

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void players_findAll_success() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);
        var season = prerequisiteGroup.getActiveSeason();

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + season.getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        for (PlayerDto playerDto : players) {
            assertTrue(profileNames.stream().anyMatch(s -> playerDto.getProfile().getName().equals(s)));
            assertTrue(playerDto.isActiveThisSeason());
            assertNull(playerDto.getStatistics());
            assertEquals(season.getId(), playerDto.getSeason().getId());
        }

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + season.getId() + "/players?showStats=true", List.class, PlayerDto.class);
        players = (List<PlayerDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        for (PlayerDto playerDto : players) {
            assertTrue(profileNames.stream().anyMatch(s -> playerDto.getProfile().getName().equals(s)));
            assertTrue(playerDto.isActiveThisSeason());
            //TODO maybe check stats?
            assertNotNull(playerDto.getStatistics());
            assertEquals(season.getId(), playerDto.getSeason().getId());
        }

        //TODO test showInactive=true
    }

    @Test
    @Transactional
    public void players_delete_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }
}