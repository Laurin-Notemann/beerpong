package pro.beerpong.api.service;

import com.google.api.client.util.Lists;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.*;
import pro.beerpong.api.model.DefaultServiceResponse;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ServiceResponse;
import pro.beerpong.api.model.dao.*;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;
import pro.beerpong.api.model.dto.matches.*;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDto;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDtoComplete;
import pro.beerpong.api.model.dto.player.PlayerDtoExtended;
import pro.beerpong.api.model.dto.teammembers.TeamMemberCreateDto;
import pro.beerpong.api.model.dto.teammembers.TeamMemberDto;
import pro.beerpong.api.model.dto.teams.TeamDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.repository.*;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;
import pro.beerpong.api.util.AssetType;

import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MatchService {
    /**
     * Feature flag: discuss if this should be enabled in future
     * <p>
     * If enabled, the daily leaderboard will include statistics made in matches
     * that are not part of the current season. This would happen in the 24 hours
     * following the start of a new season.
     */
    private static final boolean USE_DAILY_MATCHES_FROM_PAST_SEASONS = false;

    private final SubscriptionHandler subscriptionHandler;

    private final MatchRepository matchRepository;
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final MatchMoveRepository matchMoveRepository;
    private final RuleMoveRepository ruleMoveRepository;
    private final SeasonRepository seasonRepository;
    private final AssetRepository assetRepository;

    private final AuthService authService;
    private final TeamService teamService;
    private final AssetService assetService;

    private final MatchMoveMapper matchMoveMapper;
    private final PlayerMapper playerMapper;
    private final TeamMapper teamMapper;
    private final TeamMemberMapper teamMemberMapper;

    public boolean invalidCreateDto(@NotNull String seasonId, @NotNull MatchCreateDto dto) {
        var playerIds = dto.getTeams().stream()
                .flatMap(teamCreateDto -> teamCreateDto.getTeamMembers().stream()
                        .map(TeamMemberCreateDto::getPlayerId))
                .toList();

        var moves = dto.getTeams().stream()
                .flatMap(teamCreateDto -> teamCreateDto.getTeamMembers().stream())
                .flatMap(memberCreateDto -> memberCreateDto.getMoves().stream())
                .filter(matchMoveDto -> matchMoveDto.getCount() > 0)
                .toList();
        var ruleMoveIds = moves.stream()
                .map(MatchMoveDto::getMoveId)
                .distinct()
                .toList();

        var finishingRuleMoveIds = new HashSet<>(ruleMoveRepository.findFinishingMoveIds(ruleMoveIds));
        var finishMoves = moves.stream()
                .filter(matchMoveDto -> finishingRuleMoveIds.contains(matchMoveDto.getMoveId()))
                .toList();

        return playerIds.stream().distinct().count() != playerIds.size() ||
                finishMoves.size() != 1 ||
                finishMoves.getFirst().getCount() != 1 ||
                !ruleMoveRepository.allExistInSeason(ruleMoveIds, seasonId) ||
                //TODO fix n+1 query
                !dto.getTeams().stream().allMatch(teamCreateDto ->
                        teamCreateDto.getTeamMembers().stream().allMatch(memberDto -> {
                            var player = playerRepository.findById(memberDto.getPlayerId());

                            return player.isPresent() && player.get().getSeason().getId().equals(seasonId);
                        }));
    }

    @Transactional
    public ServiceResponse<MatchDto> createNewMatch(@NotNull Group group, @NotNull String seasonId, @NotNull MatchCreateDto matchCreateDto, @NotNull UserDto user) {
        var createdByOptional = authService.getMemberInGroup(user.getId(), group.getId());

        if (createdByOptional.isEmpty()) {
            return ServiceResponse.error(ErrorCodes.AUTH_USER_NOT_IN_GROUP);
        }

        var createdBy = createdByOptional.get();

        if (invalidCreateDto(seasonId, matchCreateDto)) {
            return ServiceResponse.error(ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
        }

        var match = new Match(
                null,
                ZonedDateTime.now(),
                seasonRepository.getReferenceById(seasonId),
                createdBy
        );

        match = matchRepository.save(match);

        List<TeamPhotoDto> teamPhotos = Lists.newArrayList();

        teamService.createTeamsForMatch(match.getId(), matchCreateDto.getTeams(), null, teamPhotos);

        var dto = matchToMatchDto(match);

        dto.setPhotoUploads(teamPhotos);

        return ServiceResponse.ok(dto);
    }

    @Transactional
    public ServiceResponse<MatchDto> updateMatch(@NotNull String groupId, @NotNull String matchId, @NotNull MatchCreateDto matchCreateDto) {
        var match = matchRepository.getMatchById(matchId);

        if (match == null) {
            return ServiceResponse.error(ErrorCodes.MATCH_NOT_FOUND);
        }

        // save old team photos to reuse them
        var teamAssets = teamRepository.findByMatchIdWithPhoto(match.getId()).stream()
                .collect(Collectors.toMap(Team::getId, Team::getPhoto));

        // delete all match moves
        matchMoveRepository.deleteByMatchId(match.getId());

        // delete all team members
        teamMemberRepository.deleteByMatchId(match.getId());

        // delete all teams
        teamRepository.deleteByMatchId(match.getId());

        List<TeamPhotoDto> teamPhotos = Lists.newArrayList();

        teamService.createTeamsForMatch(match.getId(), matchCreateDto.getTeams(), teamAssets, teamPhotos);

        var dto = matchToMatchDto(match);

        dto.setPhotoUploads(teamPhotos);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_UPDATE, groupId, dto));

        return ServiceResponse.ok(dto);
    }

    @Transactional
    public DefaultServiceResponse deleteMatch(String matchId, String seasonId, String groupId) {
        var matchOptional = matchRepository.findById(matchId);

        if (matchOptional.isEmpty()) {
            return DefaultServiceResponse.error(ErrorCodes.MATCH_NOT_FOUND);
        }

        var match = matchOptional.get();
        var seasonOptional = seasonRepository.findById(seasonId);

        if (seasonOptional.isEmpty()) {
            return DefaultServiceResponse.error(ErrorCodes.SEASON_NOT_FOUND);
        }

        var season = seasonOptional.get();

        if (!season.getGroup().getId().equals(groupId)) {
            return DefaultServiceResponse.error(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        if (season.getEndDate() == null) {
            if (match.getSeason().getId().equals(seasonId)) {
                var assetIds = teamRepository.findAssetIdsByMatch(matchId);

                // delete all match moves
                matchMoveRepository.deleteByMatchId(match.getId());

                // delete all team members
                teamMemberRepository.deleteByMatchId(match.getId());

                // delete all teams
                teamRepository.deleteByMatchId(match.getId());

                // delete match
                matchRepository.deleteById(matchId);

                // delete assets
                assetIds.forEach(assetService::deleteAsset);
                assetRepository.deleteAllById(assetIds);

                return DefaultServiceResponse.ok();
            } else {
                return DefaultServiceResponse.error(ErrorCodes.MATCH_GROUP_OR_SEASON_ID_DONT_MATCH);
            }
        } else {
            return DefaultServiceResponse.error(ErrorCodes.SEASON_ALREADY_ENDED);
        }
    }

    @Transactional
    public TeamDto deleteMatchPhoto(String teamId) {
        var team = teamRepository.findById(teamId).orElse(null);
        if (team == null) return null;

        if (team.getPhoto() != null) {
            assetService.deleteAsset(team.getPhoto().getId());
            team.setPhoto(null);
            teamRepository.save(team);

            return teamMapper.teamToTeamDto(team);
        } else {
            return null;
        }
    }

    @Transactional
    public AssetUploadResponse saveMatchPhoto(String teamId) {
        var team = teamRepository.findById(teamId).orElse(null);
        if (team == null) return null;

        String oldPhotoId = team.getPhoto() != null ? team.getPhoto().getId() : null;

        var asset = assetService.storeAsset(AssetType.TEAM_PHOTO);
        team.setPhoto(asset);
        teamRepository.save(team);

        if (oldPhotoId != null) {
            assetService.deleteAsset(oldPhotoId);
        }

        return assetService.uploadAsset(asset);
    }


    public Stream<MatchDto> streamAllMatches(@NotNull String groupId) {
        return matchRepository.findByGroupId(groupId).stream()
                .map(this::matchToMatchDto);
    }

    public List<PlayerDtoExtended> getAllPlayers(@NotNull String groupId, @Nullable List<String> playerIds) {
        Stream<Player> playerStream;

        if (playerIds == null) {
            playerStream = playerRepository.findByGroupIdWithStatistics(groupId).stream();
        } else {
            playerStream = playerRepository.findByGroupIdWithStatisticsIn(groupId, playerIds).stream();
        }

        return playerStream.map(playerMapper::playerToPlayerDtoExtended)
                .toList();
    }

    public List<PlayerDtoExtended> getAllPlayersInSeason(@NotNull String seasonId, @Nullable List<String> playerIds) {
        Stream<Player> playerStream;

        if (playerIds == null) {
            playerStream = playerRepository.findBySeasonIdWithStatistics(seasonId).stream();
        } else {
            playerStream = playerRepository.findBySeasonIdWithStatisticsIn(seasonId, playerIds).stream();
        }

        return playerStream.map(playerMapper::playerToPlayerDtoExtended)
                .toList();
    }

    public MatchDto getMatchById(@NotNull String matchId) {
        return matchRepository.findById(matchId)
                .map(this::matchToMatchDto)
                .orElse(null);
    }

    public List<MatchDto> getMatchesInSeason(@NotNull String seasonId) {
        return matchRepository.findBySeasonId(seasonId).stream()
                .map(this::matchToMatchDto)
                .toList();
    }

    public MatchDtoExtended getFullMatchById(@NotNull String matchId) {
        var match = matchRepository.findById(matchId).orElse(null);
        if (match == null) return null;
        return getFullMatch(match);
    }

    public MatchDtoExtended getFullMatch(@NotNull Match match) {
        var teams = teamRepository.findByMatchId(match.getId()).stream()
                .map(teamMapper::teamToTeamDto)
                .toList();
        var teamIds = teams.stream()
                .map(TeamDto::getId)
                .toList();

        var teamMembers = teamMemberRepository.findByTeamIdIn(teamIds).stream()
                .map(teamMemberMapper::teamMemberToTeamMemberDto)
                .toList();
        var teamMemberIds = teamMembers.stream()
                .map(TeamMemberDto::getId)
                .toList();

        var matchMoves = matchMoveRepository.findByTeamMemberIdIn(teamMemberIds).stream()
                .map(matchMoveMapper::matchMoveToMatchMoveDtoComplete)
                .toList();

        var dto = new MatchDtoExtended();

        dto.setId(match.getId());
        dto.setDate(match.getDate());
        dto.setSeasonId(match.getSeason().getId());
        dto.setCreatedById(match.getCreatedBy().getId());
        dto.setTeams(teams);
        dto.setTeamMembers(teamMembers);
        dto.setMatchMoves(matchMoves);

        return dto;
    }

    public List<MatchDtoExtended> getFullMatchesBySeasonId(@NotNull String seasonId) {
        return getFullMatchesSince(seasonId, null);
    }

    public List<MatchDtoExtended> getFullMatchesSince(@NotNull String seasonId, @Nullable ZonedDateTime since) {
        var matches = (since == null ? matchRepository.findBySeasonId(seasonId) :
                matchRepository.findBySeasonIdAndDateAfter(seasonId, since));
        var matchIds = matches.stream()
                .map(Match::getId)
                .toList();

        var teams = teamRepository.findByMatchIdIn(matchIds).stream()
                .map(teamMapper::teamToTeamDto)
                .toList();
        var teamIds = teams.stream()
                .map(TeamDto::getId)
                .toList();

        var teamMembers = teamMemberRepository.findByTeamIdIn(teamIds).stream()
                .map(teamMemberMapper::teamMemberToTeamMemberDto)
                .toList();
        var teamMemberIds = teamMembers.stream()
                .map(TeamMemberDto::getId)
                .toList();

        var matchMoves = matchMoveRepository.findByTeamMemberIdIn(teamMemberIds).stream()
                .map(matchMoveMapper::matchMoveToMatchMoveDtoComplete)
                .toList();

        return matches.stream().map(match -> {
            var dto = new MatchDtoExtended();
            dto.setId(match.getId());
            dto.setDate(match.getDate());
            dto.setSeasonId(seasonId);
            dto.setCreatedById(match.getCreatedBy().getId());

            var matchTeams = teams.stream()
                    .filter(t -> t.getMatchId().equals(match.getId()))
                    .toList();
            dto.setTeams(matchTeams);

            var matchTeamIds = matchTeams.stream()
                    .map(TeamDto::getId)
                    .collect(Collectors.toSet());
            var matchTeamMembers = teamMembers.stream()
                    .filter(tm -> matchTeamIds.contains(tm.getTeamId()))
                    .toList();
            dto.setTeamMembers(matchTeamMembers);

            var matchTeamMemberIds = matchTeamMembers.stream()
                    .map(TeamMemberDto::getId)
                    .collect(Collectors.toSet());
            var matchMatchMoves = matchMoves.stream()
                    .filter(mm -> matchTeamMemberIds.contains(mm.getTeamMemberId()))
                    .toList();
            dto.setMatchMoves(matchMatchMoves);

            return dto;
        }).toList();
    }

    public long numOfMatchesInPastSeasons(@NotNull String groupId) {
        return matchRepository.countMatchesInPastSeasons(groupId);
    }

    public Stream<MatchDto> streamAllMatchesToday(@NotNull Season season) {
        var now = ZonedDateTime.now();
        var settings = season.getSeasonSettings();

        ZonedDateTime since = switch (settings.getDailyLeaderboard()) {
            case WAKE_TIME -> getWakeTime(now, settings.getWakeTime());
            case LAST_24_HOURS -> now.minusHours(24);
            case RESET_AT_MIDNIGHT -> now.toLocalDate().atStartOfDay(now.getZone());
        };

        if (USE_DAILY_MATCHES_FROM_PAST_SEASONS) {
            // TODO implement: see comment
        }

        return matchRepository.findBySeasonIdAndDateAfter(season.getId(), since).stream()
                .map(this::matchToMatchDto);
    }

    public ZonedDateTime getWakeTime(@NotNull ZonedDateTime now, @NotNull LocalTime wakeTime) {
        var wakeTimeToday = now.withHour(wakeTime.getHour())
                .withMinute(wakeTime.getMinute())
                .withSecond(0)
                .withNano(0);

        if (now.isBefore(wakeTimeToday)) {
            wakeTimeToday = wakeTimeToday.minusDays(1);
        }

        return wakeTimeToday;
    }

    public List<MatchOverviewDto> getAllMatchOverviews(@NotNull String seasonId) {
        return getFullMatchesBySeasonId(seasonId).stream()
                .map(this::getMatchOverviewByMatch)
                .toList();
    }

    public MatchOverviewDto getMatchOverviewById(@NotNull String matchId) {
        var match = getFullMatchById(matchId);
        if (match == null) return null;
        return getMatchOverviewByMatch(match);
    }

    public MatchOverviewDto getMatchOverviewByMatch(@NotNull MatchDtoExtended match) {
        if (match.getTeams().size() != 2) {
            throw new IllegalArgumentException("Match must have exactly least 2 teams");
        }

        var blueTeam = match.getTeams().getFirst();
        var redTeam = match.getTeams().get(1);

        var blueTeamId = blueTeam.getId();
        var redTeamId = redTeam.getId();

        var bluePlayers = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(blueTeamId))
                .toList();
        var redPlayers = match.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(redTeamId))
                .toList();

        var bluePlayerIds = bluePlayers.stream().map(TeamMemberDto::getId).collect(Collectors.toSet());
        var blueMoves = match.getMatchMoves().stream()
                .filter(mm -> bluePlayerIds.contains(mm.getTeamMemberId()))
                .toList();

        var redPlayerIds = redPlayers.stream().map(TeamMemberDto::getId).collect(Collectors.toSet());
        var redMoves = match.getMatchMoves().stream()
                .filter(mm -> redPlayerIds.contains(mm.getTeamMemberId()))
                .toList();

        var dto = new MatchOverviewDto();

        dto.setId(match.getId());
        dto.setDate(match.getDate());
        dto.setSeasonId(match.getSeasonId());

        var ruleMoves = ruleMovesByIds(match.getMatchMoves().stream().map(MatchMoveDtoComplete::getMoveId).toList());

        dto.setBlueTeam(buildOverviewTeam(
                blueTeamId,
                blueTeam.getPhotoAssetId(),
                bluePlayers,
                blueMoves,
                ruleMoves
        ));
        dto.setRedTeam(buildOverviewTeam(
                redTeamId,
                redTeam.getPhotoAssetId(),
                redPlayers,
                redMoves,
                ruleMoves
        ));

        return dto;
    }

    public boolean hasWrongTeamSizes(@NotNull Season season, @NotNull MatchCreateDto dto) {
        var settings = Optional.ofNullable(season.getSeasonSettings()).orElse(SeasonSettings.createDefault());

        return dto.getTeams().stream()
                .anyMatch(teamCreateDto ->
                        teamCreateDto.getTeamMembers().size() < settings.getMinTeamSize() ||
                                teamCreateDto.getTeamMembers().size() > settings.getMaxTeamSize()
                );
    }

    public MatchDto matchToMatchDto(@NotNull Match match) {
        var dto = new MatchDto();

        dto.setId(match.getId());
        dto.setDate(match.getDate());
        dto.setSeasonId(match.getSeason().getId());
        dto.setCreatedById(match.getCreatedBy().getId());

        return dto;
    }

    private MatchOverviewTeamDto buildOverviewTeam(String teamId, @Nullable String assetPhotoId, @NotNull List<TeamMemberDto> members, @NotNull List<MatchMoveDtoComplete> moves, @NotNull Map<String, RuleMove> ruleMoves) {
        var team = new MatchOverviewTeamDto();

        team.setTeamId(teamId);
        team.setAssetPhotoId(assetPhotoId);
        team.setPoints(countPoints(
                moves.stream()
                        .map(matchMoveMapper::matchMoveDtoCompleteToMatchMoveDto)
                        .toList(),
                members.size(),
                ruleMoves
        ));

        team.setMembers(members.stream()
                .map(teamMemberDto -> {
                    var teamDto = new MatchOverviewTeamMemberDto();

                    teamDto.setPlayerId(teamMemberDto.getPlayerId());
                    teamDto.setMoves(moves.stream()
                            .filter(moveDto -> moveDto.getTeamMemberId().equals(teamMemberDto.getId()))
                            .map(matchMoveMapper::matchMoveDtoCompleteToMatchMoveDto)
                            .toList());
                    teamDto.setPoints(countPoints(teamDto.getMoves(), 1, ruleMoves));

                    return teamDto;
                })
                .toList());

        return team;
    }

    private Map<String, RuleMove> ruleMovesByIds(@NotNull List<String> moveIds) {
        return ruleMoveRepository.findByIdIn(moveIds).stream()
                .collect(Collectors.toMap(RuleMove::getId, r -> r));
    }

    private int countPoints(@NotNull List<MatchMoveDto> moves, int multiplier, @NotNull Map<String, RuleMove> ruleMoves) {
        return moves.stream()
                .map(moveDto -> {
                    var ruleMove = ruleMoves.get(moveDto.getMoveId());
                    if (ruleMove == null) return 0;
                    return moveDto.getCount() * (ruleMove.getPointsForScorer() + (multiplier * ruleMove.getPointsForTeam()));
                })
                .reduce(Integer::sum)
                .orElse(0);
    }
}