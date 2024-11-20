package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.MatchMoveMapper;
import pro.beerpong.api.mapping.PlayerMapper;
import pro.beerpong.api.model.dao.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.*;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;
import pro.beerpong.api.util.DailyLeaderboard;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.stream.IntStream;
import java.util.stream.Stream;

@Service
public class MatchService {
    private final SubscriptionHandler subscriptionHandler;

    private final MatchRepository matchRepository;
    private final TeamMemberService teamMemberService;
    private final PlayerRepository playerRepository;
    private final MatchMoveService matchMoveService; // new field
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final MatchMoveRepository matchMoveRepository;
    private final RuleMoveRepository ruleMoveRepository;
    private final MatchMoveMapper matchMoveMapper;

    private final TeamService teamService;
    private final SeasonRepository seasonRepository;
    private final RuleMoveService ruleMoveService;
    private final PlayerMapper playerMapper;

    @Autowired
    public MatchService(SubscriptionHandler subscriptionHandler,
                        MatchRepository matchRepository,
                        TeamMemberService teamMemberService,
                        PlayerRepository playerRepository,
                        MatchMoveService matchMoveService,
                        TeamRepository teamRepository,
                        TeamMemberRepository teamMemberRepository,
                        MatchMoveRepository matchMoveRepository,
                        RuleMoveRepository ruleMoveRepository,
                        MatchMoveMapper matchMoveMapper,
                        TeamService teamService, SeasonRepository seasonRepository, RuleMoveService ruleMoveService, PlayerMapper playerMapper) {
        this.subscriptionHandler = subscriptionHandler;

        this.matchRepository = matchRepository;
        this.teamMemberService = teamMemberService;
        this.playerRepository = playerRepository;
        this.matchMoveService = matchMoveService;
        this.teamRepository = teamRepository;
        this.matchMoveRepository = matchMoveRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.ruleMoveRepository = ruleMoveRepository;
        this.matchMoveMapper = matchMoveMapper;

        this.teamService = teamService;
        this.seasonRepository = seasonRepository;
        this.ruleMoveService = ruleMoveService;
        this.playerMapper = playerMapper;
    }

    public boolean invalidCreateDto(String groupId, String seasonId, MatchCreateDto dto) {
        return !dto.getTeams().stream().allMatch(teamCreateDto ->
                teamCreateDto.getTeamMembers().stream().allMatch(memberDto -> {
                    var player = playerRepository.findById(memberDto.getPlayerId());

                    if (player.isEmpty() || !player.get().getSeason().getId().equals(seasonId) || !player.get().getSeason().getGroupId().equals(groupId)) {
                        return false;
                    }

                    return memberDto.getMoves().stream().allMatch(matchMoveDto -> {
                        var move = ruleMoveRepository.findById(matchMoveDto.getMoveId());

                        return move.isPresent() && move.get().getSeason().getId().equals(seasonId) && move.get().getSeason().getGroupId().equals(groupId);
                    });
                })) ||
                dto.getTeams().stream()
                        .flatMap(teamCreateDto -> teamCreateDto.getTeamMembers().stream())
                        .flatMap(memberCreateDto -> memberCreateDto.getMoves().stream())
                        .filter(matchMoveDto -> ruleMoveService.isFinish(matchMoveDto.getMoveId()) && matchMoveDto.getCount() == 1)
                        .count() != 1;
    }

    @Transactional
    public MatchDto createNewMatch(@NotNull Group group, @NotNull Season season, MatchCreateDto matchCreateDto) {
        if (!group.getActiveSeason().getId().equals(season.getId()) ||
                invalidCreateDto(group.getId(), season.getId(), matchCreateDto)) {
            return null;
        }

        var match = new Match();

        match.setDate(ZonedDateTime.now());
        match.setSeason(season);

        match = matchRepository.save(match);

        teamService.createTeamsForMatch(match, matchCreateDto.getTeams());

        var dto = matchToMatchDto(match);

        if (dto.getSeason().getGroupId().equals(group.getId())) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_CREATE, group.getId(), dto));
        }

        return dto;
    }

    public MatchDto updateMatch(Group group, Match match, MatchCreateDto matchCreateDto) {
        if (match == null || matchCreateDto == null || group == null) {
            return null;
        }

        // Step 1: Find all teams associated with the match
        List<Team> teams = teamRepository.findAllByMatchId(match.getId());

        // Step 2: Loop through each team
        for (Team team : teams) {
            String teamId = team.getId();

            // Step 3: Find all team members associated with the team

            List<TeamMember> teamMembers = teamMemberRepository.findAllByTeamId(teamId);

            // Step 4: Loop through each team member
            for (TeamMember teamMember : teamMembers) {
                String teamMemberId = teamMember.getId();

                // Step 5: Find all match moves associated with the team member
                List<MatchMove> matchMoves = matchMoveRepository.findAllByTeamMemberId(teamMemberId);

                // Step 6: Delete all match moves
                matchMoveRepository.deleteAll(matchMoves);
            }

            // Step 7: Delete all team members
            teamMemberRepository.deleteAll(teamMembers);
        }

        // Step 8: Delete all teams
        teamRepository.deleteAll(teams);

        MatchDto updatedDto = matchToEmptyMatchDto(match);

        teamService.createTeamsForMatch(match, matchCreateDto.getTeams());

        loadMatchInfo(match, updatedDto);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_UPDATE, group.getId(), updatedDto));

        return updatedDto;

    }

    public Stream<MatchDto> streamAllMatches(GroupDto group) {
        return seasonRepository.findByGroupId(group.getId()).stream()
                .flatMap(season -> matchRepository.findBySeasonId(season.getId()).stream())
                .map(this::matchToMatchDto);
    }

    public Stream<PlayerDto> streamAllPlayers(GroupDto group) {
        return seasonRepository.findByGroupId(group.getId()).stream()
                .flatMap(season -> playerRepository.findAllBySeasonId(season.getId()).stream())
                .map(playerMapper::playerToPlayerDto);
    }

    public Stream<MatchDto> streamAllMatchesInSeason(String seasonId) {
        return matchRepository.findBySeasonId(seasonId).stream()
                .map(this::matchToMatchDto);
    }

    public Stream<PlayerDto> streamAllPlayersInSeason(String seasonId) {
        return playerRepository.findAllBySeasonId(seasonId).stream()
                .map(playerMapper::playerToPlayerDto);
    }

    public Stream<MatchDto> streamAllMatchesToday(GroupDto group, Season season) {
        var now = ZonedDateTime.now();

        Predicate<Match> predicate = switch (season.getSeasonSettings().getDailyLeaderboard()) {
            case WAKE_TIME -> match -> match.getDate().isAfter(getWakeTime(now, season.getSeasonSettings().getWakeTimeHour()));
            case LAST_24_HOURS -> (match) -> !match.getDate().isAfter(now) && Duration.between(match.getDate(), now).toHours() < 24;
            case RESET_AT_MIDNIGHT -> (match) -> match.getDate().toLocalDate().equals(now.toLocalDate());
        };

        return matchRepository.findBySeasonId(group.getActiveSeason().getId())
                .stream()
                .filter(predicate)
                .map(this::matchToMatchDto);
    }

    private ZonedDateTime getWakeTime(ZonedDateTime now, int wakeTimeHour) {
        var wakeTimeToday = now.withHour(wakeTimeHour).withMinute(0).withSecond(0).withNano(0);

        if (now.isBefore(wakeTimeToday)) {
            wakeTimeToday = wakeTimeToday.minusDays(1);
        }

        return wakeTimeToday;
    }

    public MatchDto getMatchById(String id) {
        return matchRepository.findById(id)
                .map(this::matchToMatchDto)
                .orElse(null);
    }

    public List<MatchOverviewDto> getAllMatchOverviews(String seasonId) {
        return streamAllMatchesInSeason(seasonId)
                .map(this::getMatchOverviewByMatch)
                .toList();
    }

    public MatchOverviewDto getMatchOverviewById(String id) {
        var match = getMatchById(id);

        if (match == null || match.getTeams().size() < 2) {
            return null;
        }

        return getMatchOverviewByMatch(match);
    }

    public MatchOverviewDto getMatchOverviewByMatch(MatchDto match) {
        if (match == null || match.getTeams().size() < 2) {
            return null;
        }

        var bluePlayers = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(match.getTeams().getFirst().getId()))
                .toList();
        var redPlayers = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(match.getTeams().get(1).getId()))
                .toList();

        var dto = new MatchOverviewDto();

        dto.setId(match.getId());
        dto.setDate(match.getDate());
        dto.setSeason(match.getSeason());

        dto.setBlueTeam(buildOverviewTeam(
                bluePlayers,
                match.getMatchMoves().stream()
                        .filter(matchMoveDto -> bluePlayers.stream().anyMatch(teamMemberDto -> matchMoveDto.getTeamMemberId().equals(teamMemberDto.getId())))
                        .toList()
        ));

        dto.setRedTeam(buildOverviewTeam(
                redPlayers,
                match.getMatchMoves().stream()
                        .filter(matchMoveDto -> redPlayers.stream().anyMatch(teamMemberDto -> matchMoveDto.getTeamMemberId().equals(teamMemberDto.getId())))
                        .toList()
        ));

        return dto;
    }

    public boolean hasWrongTeamSizes(Season season, MatchCreateDto dto) {
        var settings = Optional.ofNullable(season.getSeasonSettings()).orElse(new SeasonSettings());

        return !dto.getTeams().stream().allMatch(teamCreateDto ->
                teamCreateDto.getTeamMembers().size() >= settings.getMinTeamSize() &&
                        teamCreateDto.getTeamMembers().size() <= settings.getMaxTeamSize());
    }

    public Match getRawMatchById(String id) {
        return matchRepository.findById(id).orElse(null);
    }

    private MatchDto matchToEmptyMatchDto(Match match) {
        var dto = new MatchDto();

        dto.setId(match.getId());
        dto.setDate(match.getDate());
        dto.setSeason(match.getSeason());

        return dto;
    }

    private MatchDto matchToMatchDto(Match match) {
        var dto = new MatchDto();

        dto.setId(match.getId());
        dto.setDate(match.getDate());
        dto.setSeason(match.getSeason());

        loadMatchInfo(match, dto);

        return dto;
    }

    private void loadMatchInfo(Match match, MatchDto dto) {
        var teams = teamService.buildTeamDtos(match);
        dto.setTeams(teams);

        var teamMembers = teamMemberService.buildTeamMemberDtos(teams);
        dto.setTeamMembers(teamMembers);

        dto.setMatchMoves(matchMoveService.buildMatchMoveDtos(teamMembers));
    }

    private MatchOverviewTeamDto buildOverviewTeam(List<TeamMemberDto> members, List<MatchMoveDtoComplete> moves) {
        var team = new MatchOverviewTeamDto();

        team.setPoints(countPoints(moves.stream()
                .map(matchMoveMapper::matchMoveDtoCompleteToMatchMoveDto)
                .toList(), members.size()));

        team.setMembers(members.stream()
                .map(teamMemberDto -> {
                    var teamDto = new MatchOverviewTeamMemberDto();

                    teamDto.setPlayerId(teamMemberDto.getPlayerId());
                    teamDto.setMoves(moves.stream()
                            .filter(moveDto -> moveDto.getTeamMemberId().equals(teamMemberDto.getId()))
                            .map(matchMoveMapper::matchMoveDtoCompleteToMatchMoveDto)
                            .toList());
                    teamDto.setPoints(countPoints(teamDto.getMoves(), 1));

                    return teamDto;
                })
                .toList());

        return team;
    }

    private int countPoints(List<MatchMoveDto> moves, int multiplier) {
        return moves.stream()
                .flatMap(moveDto -> {
                    var ruleMove = ruleMoveRepository.findById(moveDto.getMoveId()).orElse(null);

                    if (ruleMove != null) {
                        return IntStream.range(0, moveDto.getCount())
                                .mapToObj(i -> ruleMove);
                    } else {
                        return IntStream.empty().mapToObj(i -> null);
                    }
                })
                .filter(Objects::nonNull)
                //TODO should the pointsForTeam count only once?
                .map(ruleMove -> ruleMove.getPointsForScorer() + (multiplier * ruleMove.getPointsForTeam()))
                .reduce(Integer::sum)
                .orElse(0);
    }
}