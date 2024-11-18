package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.TeamMemberMapper;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dto.TeamDto;
import pro.beerpong.api.model.dto.TeamMemberCreateDto;
import pro.beerpong.api.model.dto.TeamMemberDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.TeamMemberRepository;

import java.util.List;

@Service
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final PlayerRepository playerRepository;
    private final MatchMoveService matchMoveService;
    private final TeamMemberMapper teamMemberMapper;

    @Autowired
    public TeamMemberService(TeamMemberRepository teamMemberRepository, PlayerRepository playerRepository, MatchMoveService matchMoveService, TeamMemberMapper teamMemberMapper) {
        this.teamMemberRepository = teamMemberRepository;
        this.playerRepository = playerRepository;
        this.matchMoveService = matchMoveService;
        this.teamMemberMapper = teamMemberMapper;
    }

    public void createTeamMembersForTeam(Team team, List<TeamMemberCreateDto> teamMembers) {
        teamMembers.forEach(teamMemberCreateDto -> {
            TeamMember teamMember = new TeamMember();
            teamMember.setTeam(team);

            playerRepository.findById(teamMemberCreateDto.getPlayerId()).ifPresent(player -> {
                teamMember.setPlayer(player);
                TeamMember savedTeamMember = teamMemberRepository.save(teamMember);

                // Erstelle die MatchMoves für dieses Teammitglied
                if (teamMemberCreateDto.getMoves() != null) {
                    matchMoveService.createMatchMoves(savedTeamMember, teamMemberCreateDto.getMoves());
                }
            });
        });
    }

    public List<TeamMemberDto> buildTeamMemberDtos(List<TeamDto> teams) {
        return teams.stream()
                .flatMap(teamDto -> teamMemberRepository.findAllByTeamId(teamDto.getId()).stream().map(teamMemberMapper::teamMemberToTeamMemberDto))
                .toList();
    }
}
