package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;
import pro.beerpong.api.model.dto.matches.MatchCreateDto;
import pro.beerpong.api.model.dto.matches.MatchDto;
import pro.beerpong.api.model.dto.matches.MatchDtoExtended;
import pro.beerpong.api.model.dto.matches.MatchOverviewDto;
import pro.beerpong.api.model.dto.teams.TeamCreateDto;
import pro.beerpong.api.model.dto.teams.TeamDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.repository.MatchRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.repository.TeamRepository;
import pro.beerpong.api.service.MatchService;
import pro.beerpong.api.service.SeasonService;
import pro.beerpong.api.service.TeamService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/matches")
public class MatchController {
    // currently we only support games played with exactly 2 teams
    private static final int MIN_TEAM_AMOUNT = 2;
    private static final int MAX_TEAM_AMOUNT = 2;

    private final SubscriptionHandler subscriptionHandler;

    private final MatchRepository matchRepository;
    private final SeasonRepository seasonRepository;
    private final TeamRepository teamRepository;

    private final MatchService matchService;
    private final SeasonService seasonService;
    private final TeamService teamService;

    @PostMapping
    public ResponseEntity<ResponseEnvelope<MatchDto>> createMatch(@PathVariable String groupId, @PathVariable String seasonId,
                                                                  @RequestBody MatchCreateDto matchCreateDto,
                                                                  @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        var response = seasonService.validateActiveSeason(groupId, seasonId, true);

        if (response.isError()) {
            return ResponseEnvelope.notOk(response.getErrorCode());
        }

        var pair = response.getData();

        if (matchService.hasWrongTeamSizes(pair.getSecond(), matchCreateDto)) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
        }

        if (matchCreateDto.getTeams().size() < MIN_TEAM_AMOUNT || matchCreateDto.getTeams().size() > MAX_TEAM_AMOUNT) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);
        }

        var match = matchService.createNewMatch(pair.getFirst(), pair.getSecond().getId(), matchCreateDto, user);

        if (match.isOk()) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_CREATE, groupId, match.getData()));

            return ResponseEnvelope.ok(match.getData());
        } else {
            return ResponseEnvelope.notOk(match.getErrorCode());
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<MatchDto>>> getAllMatches(@PathVariable String groupId, @PathVariable String seasonId) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(matchService.getMatchesInSeason(seasonId));
    }

    @GetMapping("/extended")
    public ResponseEntity<ResponseEnvelope<List<MatchDtoExtended>>> getAllMatchesExtended(@PathVariable String groupId, @PathVariable String seasonId) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(matchService.getFullMatchesBySeasonId(seasonId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<MatchDto>> getMatchById(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var match = matchService.getMatchById(id);

        if (match != null) {
            if (match.getSeasonId().equals(seasonId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(ErrorCodes.MATCH_GROUP_OR_SEASON_ID_DONT_MATCH);
            }
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_NOT_FOUND);
        }
    }

    @GetMapping("/{id}/extended")
    public ResponseEntity<ResponseEnvelope<MatchDtoExtended>> getMatchByIdExtended(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var match = matchService.getFullMatchById(id);

        if (match != null) {
            if (match.getSeasonId().equals(seasonId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(ErrorCodes.MATCH_GROUP_OR_SEASON_ID_DONT_MATCH);
            }
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_NOT_FOUND);
        }
    }

    @GetMapping("/overview")
    public ResponseEntity<ResponseEnvelope<List<MatchOverviewDto>>> getAllMatchOverviews(@PathVariable String groupId, @PathVariable String seasonId) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(matchService.getAllMatchOverviews(seasonId));
    }

    @GetMapping("/{id}/overview")
    public ResponseEntity<ResponseEnvelope<MatchOverviewDto>> getMatchOverviewById(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var match = matchService.getMatchOverviewById(id);

        if (match != null) {
            if (match.getSeasonId().equals(seasonId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(ErrorCodes.MATCH_GROUP_OR_SEASON_ID_DONT_MATCH);
            }
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<MatchDto>> updateMatch(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id,
                                                                  @RequestBody MatchCreateDto matchCreateDto) {
        var response = seasonService.validateActiveSeason(groupId, seasonId);

        if (response.isError()) {
            return ResponseEnvelope.notOk(response.getErrorCode());
        }

        var pair = response.getData();

        if (matchService.hasWrongTeamSizes(pair.getSecond(), matchCreateDto)) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
        }

        if (matchCreateDto.getTeams().size() < MIN_TEAM_AMOUNT || matchCreateDto.getTeams().size() > MAX_TEAM_AMOUNT) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);
        }

        if (matchCreateDto.getTeams().stream().anyMatch(teamCreateDto -> teamCreateDto.getExistingTeamId() == null)) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_CREATE_DTO_NEEDS_IDS);
        }

        if (matchCreateDto.getTeams().stream()
                .map(TeamCreateDto::getExistingTeamId)
                .distinct()
                .count() != matchCreateDto.getTeams().size()) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_TEAM_NOT_UNIQUE);
        }

        if (teamRepository.countValidIds(matchCreateDto.getTeams().stream()
                .map(TeamCreateDto::getExistingTeamId)
                .toList()) != matchCreateDto.getTeams().size()) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_TEAM_NOT_FOUND);
        }

        if (!matchRepository.existsByIdAndSeasonId(id, seasonId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        } else if (matchService.invalidCreateDto(pair.getSecond().getId(), matchCreateDto)) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
        }

        var res = matchService.updateMatch(pair.getFirst().getId(), id, matchCreateDto);

        if (res.isError()) {
            return ResponseEnvelope.notOk(response.getErrorCode());
        }

        return ResponseEnvelope.ok(res.getData());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<String>> deleteMatchById(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        var error = matchService.deleteMatch(id, seasonId, groupId);

        if (error.isOk()) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_DELETE, groupId, id));

            return ResponseEnvelope.ok("OK");
        } else {
            return ResponseEnvelope.notOk(error.getErrorCode());
        }
    }

    @PutMapping("/{id}/photos/{teamId}")
    public ResponseEntity<ResponseEnvelope<AssetUploadResponse>> setPhoto(@PathVariable String groupId, @PathVariable String teamId, @PathVariable String id, @PathVariable String seasonId) {
        if (!matchRepository.existsByIdAndSeasonId(id, seasonId)) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_NOT_FOUND);
        }

        if (!teamRepository.existsByIdAndMatchId(teamId, id)) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_NO_TEAM_FOUND);
        }

        var dto = matchService.saveMatchPhoto(teamId);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_TEAM_PHOTO_SET, id, dto));

        return ResponseEnvelope.ok(dto);
    }

    @DeleteMapping("/{id}/photos/{teamId}")
    public ResponseEntity<ResponseEnvelope<TeamDto>> deletePhoto(@PathVariable String groupId, @PathVariable String teamId, @PathVariable String id, @PathVariable String seasonId) {
        if (!matchRepository.existsByIdAndSeasonId(id, seasonId)) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_NOT_FOUND);
        }

        if (!teamRepository.existsByIdAndMatchId(teamId, id)) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_NO_TEAM_FOUND);
        }

        var dto = matchService.deleteMatchPhoto(teamId);

        if (dto == null) {
            return ResponseEnvelope.notOk(ErrorCodes.MATCH_TEAM_HAS_NO_PHOTO);
        }

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_TEAM_PHOTO_DELETE, id, dto));

        return ResponseEnvelope.ok(dto);
    }
}