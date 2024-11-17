package pro.beerpong.api;

import com.google.gson.GsonBuilder;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import pro.beerpong.api.model.dto.*;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class CreateMatchTest {
    @LocalServerPort
    private int port;

    @Autowired
    private TestUtils testUtils;

    private String seasonId = "ed600d6b-7c4a-476b-b280-6bd5d4981b75";

//    @BeforeEach
//    void setUp() {
//        if (seasonRepository.findById(seasonId).isEmpty()) {
//            var season = new pro.beerpong.api.model.dao.Season();
//            season.setId(seasonId);
//            season.setGroupId(groupId);
//            seasonRepository.save(season);
//        }
//    }

    @Test
    @SuppressWarnings("unchecked")
    void createMatch_withTeamsMembersAndMoves_shouldCreateMatchTeamsAndMoves() throws Exception {
        var createGroupDto = new GroupCreateDto();
        createGroupDto.setProfileNames(List.of("player1", "player2", "player3", "player4"));
        createGroupDto.setName("test");

        var prerequisiteGroupResponse = testUtils.performPost(port, "/groups", createGroupDto, GroupDto.class);

        assertNotNull(prerequisiteGroupResponse);
        assertEquals(200, prerequisiteGroupResponse.getStatusCode().value());

        ResponseEnvelope<GroupDto> prerequisiteEnvelope = (ResponseEnvelope<GroupDto>) prerequisiteGroupResponse.getBody();
        assertNotNull(prerequisiteEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, prerequisiteEnvelope.getStatus());
        assertNull(prerequisiteEnvelope.getError());
        assertEquals(200, prerequisiteEnvelope.getHttpCode());

        var prerequisiteGroup = prerequisiteEnvelope.getData();

        var response = testUtils.performGet(port, "/groups?inviteCode=" + prerequisiteGroup.getInviteCode(), GroupDto.class);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        ResponseEnvelope<GroupDto> envelope = (ResponseEnvelope<GroupDto>) response.getBody();
        assertNotNull(envelope);
        assertEquals(ResponseEnvelope.Status.OK, envelope.getStatus());
        assertNull(envelope.getError());
        assertEquals(200, envelope.getHttpCode());

        var group = envelope.getData();

        // if this is not here, the startDate millis are rounded and this test fails
        group.getActiveSeason().setStartDate(prerequisiteGroup.getActiveSeason().getStartDate());

        assertNotNull(group);
        assertNotNull(group.getName());
        assertEquals(prerequisiteGroup, group);
        assertNotNull(group.getId());
        assertNotNull(group.getInviteCode());
        assertNotNull(group.getGroupSettings());
        assertNotNull(group.getGroupSettings().getId());
        assertNotNull(group.getActiveSeason());
        assertNotNull(group.getActiveSeason().getId());
        assertEquals(group.getActiveSeason().getGroupId(), group.getId());
        
        var season = group.getActiveSeason();

        var playersResponse = testUtils.performGet(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/players", List.class, PlayerDto.class);

        assertNotNull(playersResponse);
        assertEquals(200, playersResponse.getStatusCode().value());

        ResponseEnvelope<List<PlayerDto>> playersEnvelope = (ResponseEnvelope<List<PlayerDto>>) playersResponse.getBody();
        assertNotNull(playersEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, playersEnvelope.getStatus());
        assertNull(playersEnvelope.getError());
        assertEquals(200, playersEnvelope.getHttpCode());

        var players = playersEnvelope.getData();
        
        var createRulemMoveDto = new RuleMoveCreateDto();
        createRulemMoveDto.setName("RuleMove1");
        createRulemMoveDto.setFinishingMove(false);
        createRulemMoveDto.setPointsForTeam(0);
        createRulemMoveDto.setPointsForScorer(1);
        
        var ruleMoveResponse = testUtils.performPost(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/rule-moves", createRulemMoveDto, RuleMoveDto.class);

        assertNotNull(ruleMoveResponse);
        assertEquals(200, ruleMoveResponse.getStatusCode().value());

        ResponseEnvelope<RuleMoveDto> ruleMoveEnvelope = (ResponseEnvelope<RuleMoveDto>) ruleMoveResponse.getBody();
        assertNotNull(ruleMoveEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, ruleMoveEnvelope.getStatus());
        assertNull(ruleMoveEnvelope.getError());
        assertEquals(200, ruleMoveEnvelope.getHttpCode());
        
        var ruleMove = ruleMoveEnvelope.getData();

        // Arrange: Erstelle ein MatchCreateDto mit Teams, TeamMembers und Moves
        MatchCreateDto matchCreateDto = new MatchCreateDto();

        // Team 1 mit zwei Spielern und ihren Moves
        TeamCreateDto team1 = new TeamCreateDto();
        TeamMemberCreateDto member1 = new TeamMemberCreateDto();
        member1.setPlayerId(players.get(0).getId());

        MatchMoveDto move1 = new MatchMoveDto();
        move1.setMoveId(ruleMove.getId());
        move1.setCount(3);

        MatchMoveDto move2 = new MatchMoveDto();
        move2.setMoveId(ruleMove.getId());
        move2.setCount(5);

        member1.setMoves(List.of(move1, move2));

        TeamMemberCreateDto member2 = new TeamMemberCreateDto();
        member2.setPlayerId(players.get(1).getId());

        MatchMoveDto move3 = new MatchMoveDto();
        move3.setMoveId(ruleMove.getId());
        move3.setCount(2);

        member2.setMoves(List.of(move3));

        team1.setTeamMembers(List.of(member1, member2));

        // Team 2 mit zwei Spielern und ihren Moves
        TeamCreateDto team2 = new TeamCreateDto();
        TeamMemberCreateDto member3 = new TeamMemberCreateDto();
        member3.setPlayerId(players.get(2).getId());

        MatchMoveDto move4 = new MatchMoveDto();
        move4.setMoveId(ruleMove.getId());
        move4.setCount(4);

        member3.setMoves(List.of(move4));

        TeamMemberCreateDto member4 = new TeamMemberCreateDto();
        member4.setPlayerId(players.get(3).getId());

        MatchMoveDto move5 = new MatchMoveDto();
        move5.setMoveId(ruleMove.getId());
        move5.setCount(1);

        MatchMoveDto move6 = new MatchMoveDto();
        move6.setMoveId(ruleMove.getId());
        move6.setCount(6);

        member4.setMoves(List.of(move5, move6));

        team2.setTeamMembers(List.of(member3, member4));

        matchCreateDto.setTeams(List.of(team1, team2));

        var createMatchResponse = testUtils.performPost(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/matches", matchCreateDto, MatchDto.class);

        assertNotNull(createMatchResponse);
        assertEquals(200, createMatchResponse.getStatusCode().value());

        ResponseEnvelope<MatchDto> matchEnvelope = (ResponseEnvelope<MatchDto>) createMatchResponse.getBody();
        assertNotNull(matchEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, matchEnvelope.getStatus());
        assertNull(matchEnvelope.getError());
        assertEquals(200, matchEnvelope.getHttpCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void updateMatch_withTeamsMembersAndMoves_shouldUpdateMatchTeamsAndMoves() throws Exception {
        // Step 1: Create a prerequisite group with players
        var createGroupDto = new GroupCreateDto();
        createGroupDto.setProfileNames(List.of("player1", "player2", "player3", "player4"));
        createGroupDto.setName("test-update");

        var groupResponse = testUtils.performPost(port, "/groups", createGroupDto, GroupDto.class);
        ResponseEnvelope<GroupDto> groupEnvelope = (ResponseEnvelope<GroupDto>) groupResponse.getBody();
        var group = groupEnvelope.getData();

        var season = group.getActiveSeason();

        var playersResponse = testUtils.performGet(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/players", List.class, PlayerDto.class);
        ResponseEnvelope<List<PlayerDto>> playersEnvelope = (ResponseEnvelope<List<PlayerDto>>) playersResponse.getBody();
        var players = playersEnvelope.getData();

        // Step 2: Create a rule move
        var createRuleMoveDto = new RuleMoveDto();
        createRuleMoveDto.setName("UpdateRuleMove");

        var ruleMoveResponse = testUtils.performPost(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/rule-moves", createRuleMoveDto, RuleMoveDto.class);
        ResponseEnvelope<RuleMoveDto> ruleMoveEnvelope = (ResponseEnvelope<RuleMoveDto>) ruleMoveResponse.getBody();
        var ruleMove = ruleMoveEnvelope.getData();

        // Step 3: Create a match with teams and members
        MatchCreateDto matchCreateDto = new MatchCreateDto();

        // Team 1
        TeamCreateDto team1 = new TeamCreateDto();
        TeamMemberCreateDto member1 = new TeamMemberCreateDto();
        member1.setPlayerId(players.get(0).getId());
        MatchMoveDto move1 = new MatchMoveDto();
        move1.setMoveId(ruleMove.getId());
        move1.setCount(3);
        member1.setMoves(List.of(move1));
        team1.setTeamMembers(List.of(member1));

        // Team 2
        TeamCreateDto team2 = new TeamCreateDto();
        TeamMemberCreateDto member2 = new TeamMemberCreateDto();
        member2.setPlayerId(players.get(1).getId());
        MatchMoveDto move2 = new MatchMoveDto();
        move2.setMoveId(ruleMove.getId());
        move2.setCount(5);
        member2.setMoves(List.of(move2));
        team2.setTeamMembers(List.of(member2));

        matchCreateDto.setTeams(List.of(team1, team2));

        // Step 4: Create the match
        var createMatchResponse = testUtils.performPost(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/matches", matchCreateDto, MatchDto.class);
        ResponseEnvelope<MatchDto> matchEnvelope = (ResponseEnvelope<MatchDto>) createMatchResponse.getBody();
        assert matchEnvelope != null;
        var match = matchEnvelope.getData();
        
        team1.getTeamMembers().get(0).getMoves().get(0).setCount(1);
        matchCreateDto.setTeams(List.of(team1, team2));

        // Step 5: Update the match
        var updateResponse = testUtils.performPut(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/matches/" + match.getId(), matchCreateDto, MatchDto.class);
        ResponseEnvelope<MatchDto> updateEnvelope = (ResponseEnvelope<MatchDto>) updateResponse.getBody();

        // Assertions
        assertNotNull(updateResponse);
        assertEquals(200, updateResponse.getStatusCode().value());
        assertNotNull(updateEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, updateEnvelope.getStatus());
        assertNull(updateEnvelope.getError());
        assertEquals(200, updateEnvelope.getHttpCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void getAllMatches_shouldReturnAllMatchesForSeason() throws Exception {
        // Step 1: Create a prerequisite group with players
        var createGroupDto = new GroupCreateDto();
        createGroupDto.setProfileNames(List.of("player1", "player2"));
        createGroupDto.setName("test-get");

        var groupResponse = testUtils.performPost(port, "/groups", createGroupDto, GroupDto.class);
        ResponseEnvelope<GroupDto> groupEnvelope = (ResponseEnvelope<GroupDto>) groupResponse.getBody();
        var group = groupEnvelope.getData();

        var season = group.getActiveSeason();

        // Step 2: Create a match
        MatchCreateDto matchCreateDto = new MatchCreateDto();
        TeamCreateDto team = new TeamCreateDto();
        TeamMemberCreateDto member = new TeamMemberCreateDto();
        member.setPlayerId("player1-id");
        team.setTeamMembers(List.of(member));
        matchCreateDto.setTeams(List.of(team));

        testUtils.performPost(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/match", matchCreateDto, MatchDto.class);

        // Step 3: Get all matches for the season
        var getAllMatchesResponse = testUtils.performGet(port, "/groups/" + group.getId() + "/seasons/" + season.getId() + "/matches", List.class, MatchDto.class);
        ResponseEnvelope<List<MatchDto>> matchesEnvelope = (ResponseEnvelope<List<MatchDto>>) getAllMatchesResponse.getBody();

        // Assertions
        assertNotNull(getAllMatchesResponse);
        assertEquals(200, getAllMatchesResponse.getStatusCode().value());
        assertNotNull(matchesEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, matchesEnvelope.getStatus());
        assertNull(matchesEnvelope.getError());
        assertEquals(200, matchesEnvelope.getHttpCode());
        assertNotNull(matchesEnvelope.getData());
        assertEquals(1, matchesEnvelope.getData().size());
    }

}
