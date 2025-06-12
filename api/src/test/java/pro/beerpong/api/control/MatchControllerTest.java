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
public class MatchControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    @Transactional
    public void matches_create_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_create_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_create_invalidTeamSizes() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_create_invalidDto() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    @Transactional
    public void matches_findAll_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_findAll_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    @Transactional
    public void matches_findById_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_findById_invalidArgs() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    @Transactional
    public void matches_overviewAll_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_overviewAll_invalidArgs() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    @Transactional
    public void matches_overviewById_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_overviewById_invalidArgs() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    @Transactional
    public void matches_update_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_update_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_update_invalidTeamSizes() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_update_invalidDto() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    @Transactional
    public void matches_delete_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }

    @Test
    public void matches_delete_invalidArgs() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

    }
}