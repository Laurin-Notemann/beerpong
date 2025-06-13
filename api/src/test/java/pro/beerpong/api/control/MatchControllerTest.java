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
    @SuppressWarnings("unchecked")
    public void matches_create_success_basic() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotEquals(player1, player2);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match.getId());
        assertEquals(prerequisiteGroup.getActiveSeason().getId(), match.getSeason().getId());
        assertEquals(prerequisiteGroup.getCreatedBy(), match.getCreatedBy());
        assertNotNull(match.getDate());

        assertEquals(2, match.getTeams().size());

        var team1 = match.getTeams().getFirst();
        var team2 = match.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(match.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(match.getId(), team2.getMatchId());

        var teamMembers1 = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(1, teamMembers1.size());
        assertEquals(1, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers2.getFirst();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());
        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team2.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());

        var matchMoves1 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();
        var matchMoves2 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember2.getId()))
                .toList();

        assertEquals(2, matchMoves1.size());
        assertEquals(1, matchMoves2.size());

        var normalMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(normalMove.getId())).findFirst().orElseThrow();
        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();
        var normalMove2 = matchMoves2.getFirst();

        assertNotNull(normalMove1);
        assertNotNull(normalMove1.getId());
        assertEquals(teamMember1.getId(), normalMove1.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove1.getMoveId());
        assertEquals(5, normalMove1.getValue());

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());

        assertNotNull(normalMove2);
        assertNotNull(normalMove2.getId());
        assertEquals(teamMember2.getId(), normalMove2.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove2.getMoveId());
        assertEquals(3, normalMove2.getValue());
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_success_morePlayers() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 4)
                        ),
                        buildMember(
                                player4.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match.getId());
        assertEquals(prerequisiteGroup.getActiveSeason().getId(), match.getSeason().getId());
        assertEquals(prerequisiteGroup.getCreatedBy(), match.getCreatedBy());
        assertNotNull(match.getDate());

        assertEquals(2, match.getTeams().size());

        var team1 = match.getTeams().getFirst();
        var team2 = match.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(match.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(match.getId(), team2.getMatchId());

        var teamMembers1 = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(2, teamMembers1.size());
        assertEquals(2, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers1.getLast();
        var teamMember3 = teamMembers2.getFirst();
        var teamMember4 = teamMembers2.getLast();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());
        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team1.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());
        assertNotNull(teamMember3);
        assertNotNull(teamMember3.getId());
        assertEquals(team2.getId(), teamMember3.getTeamId());
        assertEquals(player3.getId(), teamMember3.getPlayerId());
        assertNotNull(teamMember4);
        assertNotNull(teamMember4.getId());
        assertEquals(team2.getId(), teamMember4.getTeamId());
        assertEquals(player4.getId(), teamMember4.getPlayerId());

        var matchMoves1 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();
        var matchMoves2 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember2.getId()))
                .toList();
        var matchMoves3 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember3.getId()))
                .toList();
        var matchMoves4 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember4.getId()))
                .toList();

        assertEquals(2, matchMoves1.size());
        assertEquals(1, matchMoves2.size());
        assertEquals(1, matchMoves3.size());
        assertEquals(1, matchMoves4.size());

        var normalMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(normalMove.getId())).findFirst().orElseThrow();
        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();
        var normalMove2 = matchMoves2.getFirst();
        var normalMove3 = matchMoves3.getFirst();
        var normalMove4 = matchMoves4.getFirst();

        assertNotNull(normalMove1);
        assertNotNull(normalMove1.getId());
        assertEquals(teamMember1.getId(), normalMove1.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove1.getMoveId());
        assertEquals(5, normalMove1.getValue());

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());

        assertNotNull(normalMove2);
        assertNotNull(normalMove2.getId());
        assertEquals(teamMember2.getId(), normalMove2.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove2.getMoveId());
        assertEquals(2, normalMove2.getValue());

        assertNotNull(normalMove3);
        assertNotNull(normalMove3.getId());
        assertEquals(teamMember3.getId(), normalMove3.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove3.getMoveId());
        assertEquals(4, normalMove3.getValue());

        assertNotNull(normalMove4);
        assertNotNull(normalMove4.getId());
        assertEquals(teamMember4.getId(), normalMove4.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove4.getMoveId());
        assertEquals(2, normalMove4.getValue());
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_success_moreMoves() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMoves = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).toList();

        assertTrue(normalMoves.size() >= 2);

        var frstNormalMove = normalMoves.getFirst();
        var scndNormalMove = normalMoves.get(1);
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(frstNormalMove);
        assertFalse(frstNormalMove.isFinishingMove());
        assertNotNull(scndNormalMove);
        assertFalse(scndNormalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(frstNormalMove.getId(), 5),
                                buildMove(scndNormalMove.getId(), 2),
                                buildMove(finishMove.getId(), 1),
                                buildMove(finishMove.getId(), 0)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(frstNormalMove.getId(), 2),
                                buildMove(finishMove.getId(), 0)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(frstNormalMove.getId(), 4),
                                buildMove(scndNormalMove.getId(), 6),
                                buildMove(finishMove.getId(), 0)
                        ),
                        buildMember(
                                player4.getId(),
                                buildMove(scndNormalMove.getId(), 2),
                                buildMove(finishMove.getId(), 0)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match.getId());
        assertEquals(prerequisiteGroup.getActiveSeason().getId(), match.getSeason().getId());
        assertEquals(prerequisiteGroup.getCreatedBy(), match.getCreatedBy());
        assertNotNull(match.getDate());

        assertEquals(2, match.getTeams().size());

        var team1 = match.getTeams().getFirst();
        var team2 = match.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(match.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(match.getId(), team2.getMatchId());

        var teamMembers1 = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(2, teamMembers1.size());
        assertEquals(2, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers1.getLast();
        var teamMember3 = teamMembers2.getFirst();
        var teamMember4 = teamMembers2.getLast();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());

        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team1.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());

        assertNotNull(teamMember3);
        assertNotNull(teamMember3.getId());
        assertEquals(team2.getId(), teamMember3.getTeamId());
        assertEquals(player3.getId(), teamMember3.getPlayerId());

        assertNotNull(teamMember4);
        assertNotNull(teamMember4.getId());
        assertEquals(team2.getId(), teamMember4.getTeamId());
        assertEquals(player4.getId(), teamMember4.getPlayerId());

        var matchMoves1 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();
        var matchMoves2 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember2.getId()))
                .toList();
        var matchMoves3 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember3.getId()))
                .toList();
        var matchMoves4 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember4.getId()))
                .toList();

        assertEquals(3, matchMoves1.size());
        assertEquals(1, matchMoves2.size());
        assertEquals(2, matchMoves3.size());
        assertEquals(1, matchMoves4.size());

        var normalMove11 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(frstNormalMove.getId())).findFirst().orElseThrow();
        var normalMove12 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(scndNormalMove.getId())).findFirst().orElseThrow();
        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();
        var normalMove21 = matchMoves2.getFirst();
        var normalMove31 = matchMoves3.stream().filter(dto -> dto.getMoveId().equals(frstNormalMove.getId())).findFirst().orElseThrow();
        var normalMove32 = matchMoves3.stream().filter(dto -> dto.getMoveId().equals(scndNormalMove.getId())).findFirst().orElseThrow();
        var normalMove42 = matchMoves4.getFirst();

        assertNotNull(normalMove11);
        assertNotNull(normalMove11.getId());
        assertEquals(teamMember1.getId(), normalMove11.getTeamMemberId());
        assertEquals(frstNormalMove.getId(), normalMove11.getMoveId());
        assertEquals(5, normalMove11.getValue());

        assertNotNull(normalMove12);
        assertNotNull(normalMove12.getId());
        assertEquals(teamMember1.getId(), normalMove12.getTeamMemberId());
        assertEquals(scndNormalMove.getId(), normalMove12.getMoveId());
        assertEquals(2, normalMove12.getValue());

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());

        assertNotNull(normalMove21);
        assertNotNull(normalMove21.getId());
        assertEquals(teamMember2.getId(), normalMove21.getTeamMemberId());
        assertEquals(frstNormalMove.getId(), normalMove21.getMoveId());
        assertEquals(2, normalMove21.getValue());

        assertNotNull(normalMove31);
        assertNotNull(normalMove31.getId());
        assertEquals(teamMember3.getId(), normalMove31.getTeamMemberId());
        assertEquals(frstNormalMove.getId(), normalMove31.getMoveId());
        assertEquals(4, normalMove31.getValue());

        assertNotNull(normalMove32);
        assertNotNull(normalMove32.getId());
        assertEquals(teamMember3.getId(), normalMove32.getTeamMemberId());
        assertEquals(scndNormalMove.getId(), normalMove32.getMoveId());
        assertEquals(6, normalMove32.getValue());

        assertNotNull(normalMove42);
        assertNotNull(normalMove42.getId());
        assertEquals(teamMember4.getId(), normalMove42.getTeamMemberId());
        assertEquals(scndNormalMove.getId(), normalMove42.getMoveId());
        assertEquals(2, normalMove42.getValue());
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_success_onlyFinish() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player2.getId()
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId()
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match.getId());
        assertEquals(prerequisiteGroup.getActiveSeason().getId(), match.getSeason().getId());
        assertEquals(prerequisiteGroup.getCreatedBy(), match.getCreatedBy());
        assertNotNull(match.getDate());

        assertEquals(2, match.getTeams().size());

        var team1 = match.getTeams().getFirst();
        var team2 = match.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(match.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(match.getId(), team2.getMatchId());

        var teamMembers1 = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(2, teamMembers1.size());
        assertEquals(2, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers1.getLast();
        var teamMember3 = teamMembers2.getFirst();
        var teamMember4 = teamMembers2.getLast();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());

        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team1.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());

        assertNotNull(teamMember3);
        assertNotNull(teamMember3.getId());
        assertEquals(team2.getId(), teamMember3.getTeamId());
        assertEquals(player3.getId(), teamMember3.getPlayerId());

        assertNotNull(teamMember4);
        assertNotNull(teamMember4.getId());
        assertEquals(team2.getId(), teamMember4.getTeamId());
        assertEquals(player4.getId(), teamMember4.getPlayerId());

        var matchMoves1 = match.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();

        assertEquals(1, matchMoves1.size());

        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());
    }

    @Test
    @Transactional
    public void matches_create_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var matchDto = buildDto();

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_ALREADY_ENDED);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_invalidTeams() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var oldSeason = prerequisiteGroup.getActiveSeason();
        var minTeamSize = oldSeason.getSeasonSettings().getMinTeamSize();
        var maxTeamSize = oldSeason.getSeasonSettings().getMaxTeamSize();

        assertEquals(1, minTeamSize);
        assertEquals(10, maxTeamSize);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(2, players.size());

        var player1 = players.getFirst();
        var player2 = players.getLast();

        var matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam(
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId())
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_CREATE_DTO_VALIDATION_FAILED);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam()
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_CREATE_DTO_VALIDATION_FAILED);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam(
                        buildMember(player2.getId())
                ),
                buildTeam(
                        buildMember(player2.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);

        matchDto = buildDto();

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_create_nonUniquePlayers() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        // test non unique players in same team
        var matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId()),
                        buildMember(player2.getId())
                ),
                buildTeam(
                        buildMember(player3.getId()),
                        buildMember(player3.getId())
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test non unique players in different teams
        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId()),
                        buildMember(player3.getId())
                ),
                buildTeam(
                        buildMember(player3.getId()),
                        buildMember(player4.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_create_invalidFinishMove() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        // test too many finish moves in different teams
        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(finishMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test too many finish moves in same team
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test no finish move
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 0)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test finish move amount!=1
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test finish move amount!=1
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_create_invalidPlayers() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var oldPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/players", List.class, PlayerDto.class);
        var oldPlayers = (List<PlayerDto>) requestUtils.assertSuccess(oldPlayerResponse, ArrayList.class);

        assertEquals(profileNames.size(), oldPlayers.size());

        var oldPlayer1 = oldPlayers.getFirst();
        var oldPlayer2 = oldPlayers.get(1);
        var oldPlayer3 = oldPlayers.get(2);

        assertNotNull(oldPlayer1);
        assertNotNull(oldPlayer2);
        assertNotNull(oldPlayer3);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        var otherPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var otherPlayers = (List<PlayerDto>) requestUtils.assertSuccess(otherPlayerResponse, ArrayList.class);

        assertEquals(2, otherPlayers.size());

        var otherPlayer1 = otherPlayers.getFirst();
        var otherPlayer2 = otherPlayers.getLast();

        assertNotNull(otherPlayer1);
        assertNotNull(otherPlayer2);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var newPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/players", List.class, PlayerDto.class);
        var newPlayers = (List<PlayerDto>) requestUtils.assertSuccess(newPlayerResponse, ArrayList.class);

        assertEquals(profileNames.size(), newPlayers.size());

        var newPlayer1 = newPlayers.getFirst();
        var newPlayer2 = newPlayers.get(1);
        var newPlayer3 = newPlayers.get(2);

        assertNotNull(newPlayer1);
        assertNotNull(newPlayer2);
        assertNotNull(newPlayer3);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        // test invalid player id
        var matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember("someIdThatNotExists")
                ),
                buildTeam(
                        buildMember(newPlayer3.getId())
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test invalid player id
        matchDto = buildDto(
                buildTeam(
                        buildMember("someIdThatNotExists")
                ),
                buildTeam(
                        buildMember(newPlayer3.getId()),
                        buildMember(newPlayer1.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test player from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(oldPlayer1.getId())
                ),
                buildTeam(
                        buildMember(newPlayer3.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test player from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(newPlayer2.getId())
                ),
                buildTeam(
                        buildMember(oldPlayer1.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test player from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(newPlayer2.getId())
                ),
                buildTeam(
                        buildMember(otherPlayer1.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test player from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(otherPlayer1.getId())
                ),
                buildTeam(
                        buildMember(newPlayer2.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_create_invalidMoves() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var oldMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var oldMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(oldMovesResponse, ArrayList.class);

        assertTrue(oldMoves.size() >= 2);

        var oldNormalMove = oldMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var oldFinishMove = oldMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(oldNormalMove);
        assertFalse(oldNormalMove.isFinishingMove());
        assertNotNull(oldFinishMove);
        assertTrue(oldFinishMove.isFinishingMove());

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        var otherMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var otherMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(otherMovesResponse, ArrayList.class);

        assertTrue(otherMoves.size() >= 2);

        var otherNormalMove = otherMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var otherFinishMove = otherMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(otherNormalMove);
        assertFalse(otherNormalMove.isFinishingMove());
        assertNotNull(otherFinishMove);
        assertTrue(otherFinishMove.isFinishingMove());

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);

        var newMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var newMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(newMovesResponse, ArrayList.class);

        assertTrue(newMoves.size() >= 2);

        var newNormalMove = newMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var newFinishMove = newMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(newNormalMove);
        assertFalse(newNormalMove.isFinishingMove());
        assertNotNull(newFinishMove);
        assertTrue(newFinishMove.isFinishingMove());

        // test invalid move id
        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove("someIdThatNotExists", 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test invalid move id
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove("someIdThatNotExists", 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(oldNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(oldNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test finish move from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(oldFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(oldFinishMove.getId(), 1)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(otherNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(otherNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test finish move from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(otherFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(otherFinishMove.getId(), 1)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
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

    private MatchCreateDto buildDto(TeamCreateDto... teams) {
        var dto = new MatchCreateDto();
        dto.setTeams(List.of(teams));
        return dto;
    }

    private TeamCreateDto buildTeam(TeamMemberCreateDto... members) {
        var dto = new TeamCreateDto();
        dto.setTeamMembers(List.of(members));
        return dto;
    }

    private TeamMemberCreateDto buildMember(String playerId, MatchMoveDto... moves) {
        var dto = new TeamMemberCreateDto();
        dto.setPlayerId(playerId);
        dto.setMoves(List.of(moves));
        return dto;
    }

    private MatchMoveDto buildMove(String moveId, int amount) {
        var dto = new MatchMoveDto();
        dto.setMoveId(moveId);
        dto.setCount(amount);
        return dto;
    }
}