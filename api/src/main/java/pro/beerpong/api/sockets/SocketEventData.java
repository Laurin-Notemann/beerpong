package pro.beerpong.api.sockets;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import pro.beerpong.api.model.dto.*;

@Getter
@RequiredArgsConstructor
public class SocketEventData<T> {
    // a group create event is not needed because it is impossible for any client to receive this event.
    // the event is called before a client receives the id for the neewly created group
    // but the client needs to subscribe to events for this group id to receive a create event
    public static final SocketEventData<GroupDto> GROUP_UPDATE = new SocketEventData<>(GroupDto.class, SocketEventType.GROUPS, "groupUpdate");

    public static final SocketEventData<MatchDto> MATCH_CREATE = new SocketEventData<>(MatchDto.class, SocketEventType.MATCHES, "matchCreate");
    public static final SocketEventData<MatchDto> MATCH_UPDATE = new SocketEventData<>(MatchDto.class, SocketEventType.MATCHES, "matchUpdate");

    public static final SocketEventData<PlayerDto> PLAYER_CREATE = new SocketEventData<>(PlayerDto.class, SocketEventType.PLAYERS, "playerCreate");
    public static final SocketEventData<PlayerDto> PLAYER_DELETE = new SocketEventData<>(PlayerDto.class, SocketEventType.PLAYERS, "playerDelete");

    public static final SocketEventData<RuleDto[]> RULES_WRITE = new SocketEventData<>(RuleDto[].class, SocketEventType.RULES, "rulesWrite");

    public static final SocketEventData<RuleMoveDto> RULE_MOVE_CREATE = new SocketEventData<>(RuleMoveDto.class, SocketEventType.RULE_MOVES, "ruleMovesCreate");
    public static final SocketEventData<RuleMoveDto> RULE_MOVE_UPDATE = new SocketEventData<>(RuleMoveDto.class, SocketEventType.RULE_MOVES, "ruleMovesUpdate");
    public static final SocketEventData<RuleMoveDto> RULE_MOVE_DELETE = new SocketEventData<>(RuleMoveDto.class, SocketEventType.RULE_MOVES, "ruleMovesDelete");

    public static final SocketEventData<SeasonStartDto> SEASON_START = new SocketEventData<>(SeasonStartDto.class, SocketEventType.SEASONS, "seasonStart");
    public static final SocketEventData<SeasonDto> SEASON_UPDATE = new SocketEventData<>(SeasonDto.class, SocketEventType.SEASONS, "seasonUpdate");

    public static final SocketEventData<ProfileDto> PROFILE_AVATAR_SET = new SocketEventData<>(ProfileDto.class, SocketEventType.ASSETS, "profileAvatarSet");
    public static final SocketEventData<AssetMetadataDto> GROUP_WALLPAPER_SET = new SocketEventData<>(AssetMetadataDto.class, SocketEventType.ASSETS, "groupWallpaperSet");

    public static final SocketEventData<ProfileDto> PROFILE_CREATE = new SocketEventData<>(ProfileDto.class, SocketEventType.PROFILES, "profileCreate");
    public static final SocketEventData<ProfileDto> PROFILE_UPDATE = new SocketEventData<>(ProfileDto.class, SocketEventType.PROFILES, "profileUpdate");

    private final Class<T> bodyClass;
    private final SocketEventType eventType;
    private final String scope;
}
