package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.leaderboard.LeaderboardDto;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.service.GroupService;
import pro.beerpong.api.service.LeaderboardService;

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
        var group = groupService.getGroupById(groupId);

        if (group == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        } else if (!scope.equals("season") && !scope.equals("today") && !scope.equals("all-time")) {
            return ResponseEnvelope.notOk(ErrorCodes.LEADERBOARD_SCOPE_NOT_FOUND);
        } else if (scope.equals("season") && seasonId == null) {
            return ResponseEnvelope.notOk(ErrorCodes.LEADERBOARD_SEASON_NOT_FOUND);
        } else if (scope.equals("season") && !seasonRepository.existsById(seasonId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        } else if (scope.equals("season") && !seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var leaderboard = leaderboardService.generateLeaderboard(group, scope, seasonId);

        if (leaderboard.isError()) {
            return ResponseEnvelope.notOk(leaderboard.getErrorCode());
        }

        return ResponseEnvelope.ok(leaderboard.getData());
    }
}