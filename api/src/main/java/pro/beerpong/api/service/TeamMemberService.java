package pro.beerpong.api.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dto.TeamMemberCreateDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.TeamMemberRepository;

@Service
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final PlayerRepository playerRepository;
    private final MatchMoveService matchMoveService;

    @Autowired
    public TeamMemberService(TeamMemberRepository teamMemberRepository, PlayerRepository playerRepository, MatchMoveService matchMoveService) {
        this.teamMemberRepository = teamMemberRepository;
        this.playerRepository = playerRepository;
        this.matchMoveService = matchMoveService;
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
}
