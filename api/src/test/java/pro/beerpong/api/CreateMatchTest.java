package pro.beerpong.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.GsonBuilder;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import jakarta.transaction.Transactional;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pro.beerpong.api.model.dto.MatchCreateDto;
import pro.beerpong.api.model.dto.TeamCreateDto;
import pro.beerpong.api.model.dto.TeamMemberCreateDto;
import pro.beerpong.api.model.dto.MatchMoveDto;
import pro.beerpong.api.repository.MatchMoveRepository;
import pro.beerpong.api.repository.MatchRepository;
import pro.beerpong.api.repository.TeamMemberRepository;
import pro.beerpong.api.repository.TeamRepository;
import pro.beerpong.api.repository.SeasonRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
public class CreateMatchTest {

//    @Autowired
//    private MockMvc mockMvc;
//
//    @Autowired
//    private ObjectMapper objectMapper;
//
//    @Autowired
//    private MatchRepository matchRepository;
//
//    @Autowired
//    private TeamRepository teamRepository;
//
//    @Autowired
//    private TeamMemberRepository teamMemberRepository;
//
//    @Autowired
//    private MatchMoveRepository matchMoveRepository;
//
//    @Autowired
//    private SeasonRepository seasonRepository;
//
//    private String groupId = "7967f6ca-1c40-444a-853f-5c226d961323";
//    private String seasonId = "ed600d6b-7c4a-476b-b280-6bd5d4981b75";
//
//    @BeforeEach
//    void setUp() {
//        if (seasonRepository.findById(seasonId).isEmpty()) {
//            var season = new pro.beerpong.api.model.dao.Season();
//            season.setId(seasonId);
//            season.setGroupId(groupId);
//            seasonRepository.save(season);
//        }
//    }
//
//    @Test
//    void createMatch_withTeamsMembersAndMoves_shouldCreateMatchTeamsAndMoves() throws Exception {
//        // Arrange: Erstelle ein MatchCreateDto mit Teams, TeamMembers und Moves
//        MatchCreateDto matchCreateDto = new MatchCreateDto();
//
//        // Team 1 mit zwei Spielern und ihren Moves
//        TeamCreateDto team1 = new TeamCreateDto();
//        TeamMemberCreateDto member1 = new TeamMemberCreateDto();
//        member1.setPlayerId("92b71f08-da47-47d2-a8ca-90c76c5612e6");
//
//        MatchMoveDto move1 = new MatchMoveDto();
//        move1.setMoveId("move-id-1");
//        move1.setCount(3);
//
//        MatchMoveDto move2 = new MatchMoveDto();
//        move2.setMoveId("move-id-2");
//        move2.setCount(5);
//
//        member1.setMoves(List.of(move1, move2));
//
//        TeamMemberCreateDto member2 = new TeamMemberCreateDto();
//        member2.setPlayerId("72029175-4a56-4fd7-8a9d-6ddd4ff22d0b");
//
//        MatchMoveDto move3 = new MatchMoveDto();
//        move3.setMoveId("move-id-3");
//        move3.setCount(2);
//
//        member2.setMoves(List.of(move3));
//
//        team1.setTeamMembers(List.of(member1, member2));
//
//        // Team 2 mit zwei Spielern und ihren Moves
//        TeamCreateDto team2 = new TeamCreateDto();
//        TeamMemberCreateDto member3 = new TeamMemberCreateDto();
//        member3.setPlayerId("ed807176-7ff9-483d-97bb-b3c88335245f");
//
//        MatchMoveDto move4 = new MatchMoveDto();
//        move4.setMoveId("move-id-4");
//        move4.setCount(4);
//
//        member3.setMoves(List.of(move4));
//
//        TeamMemberCreateDto member4 = new TeamMemberCreateDto();
//        member4.setPlayerId("0271df55-5708-48c5-a590-f56afc50ac20");
//
//        MatchMoveDto move5 = new MatchMoveDto();
//        move5.setMoveId("move-id-5");
//        move5.setCount(1);
//
//        MatchMoveDto move6 = new MatchMoveDto();
//        move6.setMoveId("move-id-6");
//        move6.setCount(6);
//
//        member4.setMoves(List.of(move5, move6));
//
//        team2.setTeamMembers(List.of(member3, member4));
//
//        matchCreateDto.setTeams(List.of(team1, team2));
//
//        // Act: Sende eine POST-Anfrage zum Erstellen des Matches
//        ResultActions resultActions = mockMvc.perform(post("/groups/{groupId}/seasons/{seasonId}/match", groupId, seasonId)
//                .contentType(MediaType.APPLICATION_JSON)
//                .content(objectMapper.writeValueAsString(matchCreateDto)));
//
//        // Assert: Überprüfe die Antwort und die Datenbankeinträge
//        resultActions.andExpect(status().isOk())
//                .andExpect(jsonPath("$.status").value("OK"));
//
//        // Überprüfe, ob das Match, die Teams, die TeamMembers und die MatchMoves in der Datenbank erstellt wurden
//        assertThat(matchRepository.findAll()).hasSize(1);
//        assertThat(teamRepository.findAll()).hasSize(2);
//        assertThat(teamMemberRepository.findAll()).hasSize(4);
//        assertThat(matchMoveRepository.findAll()).hasSize(7);
//    }
//
//    @Test
//    void getAllMatches_shouldReturnAllMatchesForSeason() throws Exception {
//        // Arrange: Erstelle ein Match in der Datenbank
//        MatchCreateDto matchCreateDto = new MatchCreateDto();
//        TeamCreateDto team1 = new TeamCreateDto();
//        TeamMemberCreateDto member1 = new TeamMemberCreateDto();
//        member1.setPlayerId("player1-id");
//        team1.setTeamMembers(List.of(member1));
//        matchCreateDto.setTeams(List.of(team1));
//
//        mockMvc.perform(post("/groups/{groupId}/seasons/{seasonId}/match", groupId, seasonId)
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content(objectMapper.writeValueAsString(matchCreateDto)))
//                .andExpect(status().isOk());
//
//        // Act: Sende eine GET-Anfrage, um alle Matches abzurufen
//        ResultActions resultActions = mockMvc.perform(get("/groups/{groupId}/seasons/{seasonId}/matches", groupId, seasonId)
//                .contentType(MediaType.APPLICATION_JSON));
//
//        // Assert: Überprüfe die Antwort
//        resultActions.andExpect(status().isOk())
//                .andExpect(jsonPath("$.status").value("OK"))
//                .andExpect(jsonPath("$.data").isArray())
//                .andExpect(jsonPath("$.data.length()").value(1));
//    }
}
