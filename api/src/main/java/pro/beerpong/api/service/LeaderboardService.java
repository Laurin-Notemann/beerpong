package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.SeasonMapper;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;
import pro.beerpong.api.util.NullablePair;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class LeaderboardService {
    private final SubscriptionHandler subscriptionHandler;
    private final SeasonRepository seasonRepository;
    private final GroupRepository groupRepository;
    private final PlayerService playerService;
    private final RuleMoveService ruleMoveService;
    private final RuleService ruleService;
    private final SeasonMapper seasonMapper;

    @Autowired
    public LeaderboardService(SubscriptionHandler subscriptionHandler,
                              SeasonRepository seasonRepository,
                              GroupRepository groupRepository,
                              PlayerService playerService,
                              RuleMoveService ruleMoveService,
                              RuleService ruleService,
                              SeasonMapper seasonMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.seasonRepository = seasonRepository;
        this.groupRepository = groupRepository;
        this.playerService = playerService;
        this.ruleMoveService = ruleMoveService;
        this.ruleService = ruleService;
        this.seasonMapper = seasonMapper;
    }


}