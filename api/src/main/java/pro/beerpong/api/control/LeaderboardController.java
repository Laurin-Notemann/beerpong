package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.service.GroupService;
import pro.beerpong.api.service.LeaderboardService;
import pro.beerpong.api.service.SeasonService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}")
public class LeaderboardController {
    private final LeaderboardService leaderboardService;
    private final GroupService groupService;
    private final SeasonRepository seasonRepository;

    @Autowired
    public LeaderboardController(LeaderboardService leaderboardService, GroupService groupService, SeasonRepository seasonRepository) {
        this.leaderboardService = leaderboardService;
        this.groupService = groupService;
        this.seasonRepository = seasonRepository;
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<ResponseEnvelope<LeaderboardDto>> getLeaderboard(@PathVariable String groupId, @RequestParam String scope, @RequestParam(required = false) @Nullable String seasonId) {
        var group = groupService.getRawGroupById(groupId);

        if (group == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        } else if (!scope.equals("season") && !scope.equals("today") && !scope.equals("all-time")) {
            return ResponseEnvelope.notOk(HttpStatus.BAD_REQUEST, ErrorCodes.LEADERBOARD_SCOPE_NOT_FOUND);
        } else if (scope.equals("season") && seasonId == null) {
            return ResponseEnvelope.notOk(HttpStatus.BAD_REQUEST, ErrorCodes.LEADERBOARD_SEASON_NOT_FOUND);
        } else if (scope.equals("season") && !seasonRepository.existsById(seasonId)) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        } else if (scope.equals("season") && !seasonRepository.findById(seasonId).orElseThrow().getGroupId().equals(groupId)) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var leaderboard = leaderboardService.generateLeaderboard(group, scope, seasonId);

        if (leaderboard == null) {
            return ResponseEnvelope.notOk(HttpStatus.BAD_REQUEST, ErrorCodes.LEADERBOARD_SEASON_NOT_FOUND);
        }

        return ResponseEnvelope.ok(leaderboard);
    }
}