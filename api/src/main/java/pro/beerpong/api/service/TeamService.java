package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.TeamMapper;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.TeamCreateDto;
import pro.beerpong.api.model.dto.TeamDto;
import pro.beerpong.api.repository.TeamRepository;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class TeamService {
    private final TeamRepository teamRepository;
    private final TeamMemberService teamMemberService;
    private final TeamMapper teamMapper;

    @Autowired
    public TeamService(TeamRepository teamRepository, TeamMemberService teamMemberService, TeamMapper teamMapper) {
        this.teamRepository = teamRepository;
        this.teamMemberService = teamMemberService;
        this.teamMapper = teamMapper;
    }

    public void createTeamsForMatch(Match match, List<TeamCreateDto> teams) {
        teams.forEach(teamCreateDto -> {
            Team team = new Team();
            team.setMatch(match);
            Team savedTeam = teamRepository.save(team);

            // Erstelle TeamMembers für das Team
            teamMemberService.createTeamMembersForTeam(savedTeam, teamCreateDto.getTeamMembers());
        });
    }

    public List<TeamDto> buildTeamDtos(Match match) {
        return teamRepository.findAllByMatchId(match.getId()).stream()
                .map(this.teamMapper::teamToTeamDto)
                .toList();
    }
}
