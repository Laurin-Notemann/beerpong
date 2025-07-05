package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.RuleMapper;
import pro.beerpong.api.model.dao.Rule;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.RuleCreateDto;
import pro.beerpong.api.model.dto.RuleDto;
import pro.beerpong.api.repository.RuleRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@Service
public class RuleService {
    private static final List<Rule> DEFAULT_RULES = List.of(
            buildRule("Teams", "The two teams can have any size, and they don't have to have the same number of players."),
            buildRule("Cup Setup", "Ten cups per side are to be arranged in a pyramid pointing towards the opponent. The back row must be no further from the table edge than one cup diameter. All cups are to be filled with the same amount of liquid, preferably halfway full."),
            buildRule("Number of Balls", "Each side throws at least two balls. If there are three or more players per side, increase the ball count by one per extra player."),
            buildRule("Turn Order", "All players on one team throw their balls, then all players on the other team, alternating back and forth. Within a team, there's no fixed order."),
            buildRule("Guest Throws", "At any point, any player may allow anyone to use their turn, and throw a ball for their team. This includes non-players, players of their own team, or even the opponent."),
            buildRule("Elbow Rule", "Your elbow must be behind the edge of the table when you throw a ball."),
            buildRule("Rearranging", "Each team can tell their opponent to rearrange their cups exactly once a match, into any shape they’d like. The formation must not be longer than four cups in a line, otherwise the cups would be too close to the opponent."),
            buildRule("Blowing", "You may blow spinning balls out of your own cups, without touching the ball. In order to count, the ball must not have touched the liquid, and opponents may inspect it to confirm that it's dry."),
            buildRule("Rebounds", "Balls that bounce off opponent cups may be caught by the throwing side and re-thrown, provided the ball hasn't hit the floor and you haven't stepped around the table edge to catch it."),
            buildRule("Special Rules for ≤ 3 Cups", "Any special rules for bouncers, multiple hits, or balls back apply only when at least 4 cups remain at the start of the round—not when 3 cups are left for re-racking."),
            buildRule("Bouncers", "Balls may bounce on the table any number of times. A ball that bounces once and is then caught or swatted does not count. A successful \"bouncer\" counts as two hits, and you choose one extra cup for the opponent to remove. If the ball hits anything other than a player, cup, or table, it doesn't count at all."),
            buildRule("Multiple Hits in One Cup", "If two or more balls land in the same cup, you may select one additional cup per extra ball to count as hit. Only applies if ≥ 4 cups remained at the start of the round and follows any balls back. With ≤ 3 cups at start, each ball must hit its own cup."),
            buildRule("Balls Back", "(1) If you hit with every ball in a round, you earn “balls back” and throw again—multiple times per round if you keep clearing.\n  (2) You may combine bouncers and balls back; cups to drink are cumulative.\n  (3) If balls back leaves 6, 3, or another racking number of cups, re-racking waits until the next round start."),
            buildRule("Ring of Death", "If you hit only the three corner cups plus the center cup, that's a “Ring of Death.” The defender drinks every cup and loses immediately—no extra throws. Only possible with an even number of pyramid rows (e.g., 10 or 21 cups).\n  (1) No re-rolls after a Ring of Death. If achieved on extra throws, the opponent must drink 6 cups, then play a sudden-death overtime with 1 cup each."),
            buildRule("Distractions", "You may distract opponents by moving beside, behind, or over the cups—but must stop as the throw happens. If you distract over the table and hit an opponent's body, you assign a penalty cup for them to drink. If the ball touches a defender then hits a cup, that cup is drunk (bouncer rules apply). A rebound off a defender behind the table that hits a cup is not a penalty—only the cup is drunk (with bouncer rules)."),
            buildRule("Knocking Over Your Own Cup", "If you knock over your own cup, it always counts as a hit."),
            buildRule("Hitting Your Own Cup", "If you hit your own cup or a rebound off an opponent hits your cup you drink it, even if the ball bounced outside the table first. If it bounced on the table before rebounding, it counts as a bouncer."),
            buildRule("Knocking Over a Opponent's Cup", "If an opponent's cup is knocked over but still contains liquid, they may place it back. It does not count as hit, even if the ball is inside. Only a fully emptied cup counts as hit."),
            buildRule("Saves", "When a team's last cup is hit, this is not a game over! They have one last full turn to hit all of their opponent's cups in return. If they are successful, both teams place one cup back on the table, and the game continues.")
    );

    private final SubscriptionHandler subscriptionHandler;
    private final RuleRepository ruleRepository;

    private final RuleMapper ruleMapper;

    @Autowired
    public RuleService(SubscriptionHandler subscriptionHandler, RuleRepository matchRepository, RuleMapper ruleMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.ruleRepository = matchRepository;
        this.ruleMapper = ruleMapper;
    }

    @Transactional
    public List<RuleDto> writeRules(String groupId, Season season, List<RuleCreateDto> rules) {
        ruleRepository.deleteBySeasonId(season.getId());

        return rules.stream()
                .map(dto -> {
                    var rule = ruleMapper.ruleCreateDtoToRule(dto);
                    rule.setSeason(season);
                    return rule;
                })
                .filter(dto -> dto.getSeason().getId().equals(season.getId()) &&
                        dto.getSeason().getGroupId().equals(groupId))
                .map(rule -> ruleMapper.ruleToRuleDto(ruleRepository.save(rule)))
                .toList();
    }

    public void copyRulesFromOldSeason(Season oldSeason, Season newSeason) {
        if (oldSeason == null || newSeason == null || !oldSeason.getGroupId().equals(newSeason.getGroupId())) {
            return;
        }

        ruleRepository.findBySeasonId(oldSeason.getId()).forEach(oldRule -> {
            var ruleMove = new Rule();

            ruleMove.setTitle(oldRule.getTitle());
            ruleMove.setDescription(oldRule.getDescription());
            ruleMove.setSeason(newSeason);

            ruleRepository.save(ruleMove);
        });
    }

    public List<RuleDto> getAllRules(String seasonId) {
        return ruleRepository.findBySeasonId(seasonId)
                .stream()
                .map(ruleMapper::ruleToRuleDto)
                .toList();
    }

    public void createDefaultRules(Season season) {
        DEFAULT_RULES.stream()
                .map(rule -> {
                    var rle = rule.clone();
                    rle.setSeason(season);
                    return rle;
                })
                .forEach(ruleRepository::save);
    }

    private static Rule buildRule(String title, String description) {
        var rule = new Rule();

        rule.setTitle(title);
        rule.setDescription(description);

        return rule;
    }
}