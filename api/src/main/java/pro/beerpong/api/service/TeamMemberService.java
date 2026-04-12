package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.TeamMemberMapper;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dto.teammembers.TeamMemberCreateDto;
import pro.beerpong.api.model.dto.teammembers.TeamMemberDto;
import pro.beerpong.api.model.dto.teams.TeamDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.TeamMemberRepository;
import pro.beerpong.api.repository.TeamRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamMemberService {
    private final TeamMemberRepository teamMemberRepository;
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;

    private final MatchMoveService matchMoveService;

    private final TeamMemberMapper teamMemberMapper;

    public void createTeamMembersForTeam(String teamId, List<TeamMemberCreateDto> teamMembers) {
        var team = teamRepository.getReferenceById(teamId);

        var playerIds = teamMembers.stream()
                .map(TeamMemberCreateDto::getPlayerId)
                .toList();
        var players = playerRepository.findAllById(playerIds).stream()
                .collect(Collectors.toMap(Player::getId, p -> p));
        var validMembers = teamMembers.stream()
                .filter(dto -> players.containsKey(dto.getPlayerId()))
                .toList();

        List<TeamMember> entities = validMembers.stream()
                .map(dto -> new TeamMember(null, team, players.get(dto.getPlayerId())))
                .toList();

        List<TeamMember> saved = teamMemberRepository.saveAll(entities);

        for (int i = 0; i < saved.size(); i++) {
            var moves = validMembers.get(i).getMoves();
            if (moves != null) {
                matchMoveService.createMatchMoves(saved.get(i), moves);
            }
        }
    }

    public List<TeamMemberDto> buildTeamMemberDtos(List<TeamDto> teams) {
        List<String> teamIds = teams.stream().map(TeamDto::getId).toList();

        return teamMemberRepository.findByTeamIdIn(teamIds)
                .stream()
                .map(teamMemberMapper::teamMemberToTeamMemberDto)
                .toList();
    }
}
