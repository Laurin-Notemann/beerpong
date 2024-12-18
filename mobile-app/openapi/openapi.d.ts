import type {
    AxiosRequestConfig,
    OpenAPIClient,
    OperationResponse,
    Parameters,
    UnknownParamsObject,
} from 'openapi-client-axios';

declare namespace Components {
    namespace Schemas {
        export interface AssetMetadataDto {
            id?: string;
            url?: string;
            mediaType?: string;
            uploadedAt?: string; // date-time
        }
        export interface ErrorDetails {
            code?: string;
            description?: string;
        }
        export interface GroupCreateDto {
            name?: string;
            profileNames?: string[];
        }
        export interface GroupDto {
            id?: string;
            name?: string;
            inviteCode?: string;
            activeSeason?: Season;
            wallpaperAsset?: AssetMetadataDto;
            numberOfPlayers?: number; // int32
            numberOfMatches?: number; // int32
            numberOfSeasons?: number; // int32
        }
        export interface LeaderboardDto {
            entries?: LeaderboardEntryDto[];
        }
        export interface LeaderboardEntryDto {
            playerDto?: PlayerDto;
            totalPoints?: number; // int32
            totalGames?: number; // int32
            totalMoves?: number; // int32
            totalTeamSize?: number; // int32
            averagePointsPerMatch?: number; // double
            averageTeamSize?: number; // double
            elo?: number; // double
            rankBy?: {
                [name: string]: number; // int32
            };
        }
        export interface MatchCreateDto {
            teams?: TeamCreateDto[];
        }
        export interface MatchDto {
            id?: string;
            date?: string; // date-time
            season?: Season;
            teams?: TeamDto[];
            teamMembers?: TeamMemberDto[];
            matchMoves?: MatchMoveDtoComplete[];
        }
        export interface MatchMoveDto {
            moveId?: string;
            count?: number; // int32
        }
        export interface MatchMoveDtoComplete {
            id?: string;
            value?: number; // int32
            teamMemberId?: string;
            moveId?: string;
        }
        export interface MatchOverviewDto {
            id?: string;
            date?: string; // date-time
            season?: Season;
            blueTeam?: MatchOverviewTeamDto;
            redTeam?: MatchOverviewTeamDto;
        }
        export interface MatchOverviewTeamDto {
            points?: number; // int32
            members?: MatchOverviewTeamMemberDto[];
        }
        export interface MatchOverviewTeamMemberDto {
            playerId?: string;
            points?: number; // int32
            moves?: MatchMoveDto[];
        }
        export interface PlayerDto {
            id?: string;
            profile?: ProfileDto;
            season?: SeasonDto;
            statistics?: PlayerStatisticsDto;
        }
        export interface PlayerStatisticsDto {
            points?: number; // int64
            matches?: number; // int64
        }
        export interface ProfileCreateDto {
            name?: string;
        }
        export interface ProfileDto {
            id?: string;
            name?: string;
            avatarAsset?: AssetMetadataDto;
            groupId?: string;
        }
        export interface ResponseEnvelopeAssetMetadataDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: AssetMetadataDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeGroupDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: GroupDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeLeaderboardDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: LeaderboardDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListMatchDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListMatchOverviewDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchOverviewDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListPlayerDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: PlayerDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListProfileDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: ProfileDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListRuleDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: RuleDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListRuleMoveDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: RuleMoveDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListSeasonDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: SeasonDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeMatchDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeMatchOverviewDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchOverviewDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeProfileDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: ProfileDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeRuleMoveDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: RuleMoveDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeSeasonDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: SeasonDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeString {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: string;
            error?: ErrorDetails;
        }
        export interface RuleCreateDto {
            title?: string;
            description?: string;
        }
        export interface RuleDto {
            id?: string;
            title?: string;
            description?: string;
            season?: Season;
        }
        export interface RuleMoveCreateDto {
            name?: string;
            pointsForTeam?: number; // int32
            pointsForScorer?: number; // int32
            finishingMove?: boolean;
        }
        export interface RuleMoveDto {
            id?: string;
            name?: string;
            pointsForTeam?: number; // int32
            pointsForScorer?: number; // int32
            finishingMove?: boolean;
            season?: Season;
        }
        export interface Season {
            id?: string;
            name?: string;
            startDate?: string; // date-time
            endDate?: string; // date-time
            groupId?: string;
            seasonSettings?: SeasonSettings;
        }
        export interface SeasonCreateDto {
            oldSeasonName?: string;
        }
        export interface SeasonDto {
            id?: string;
            name?: string;
            startDate?: string; // date-time
            endDate?: string; // date-time
            groupId?: string;
            seasonSettings?: SeasonSettings;
        }
        export interface SeasonSettings {
            id?: string;
            minMatchesToQualify?: number; // int32
            minTeamSize?: number; // int32
            maxTeamSize?: number; // int32
            rankingAlgorithm?: 'AVERAGE' | 'ELO';
            dailyLeaderboard?:
                | 'RESET_AT_MIDNIGHT'
                | 'WAKE_TIME'
                | 'LAST_24_HOURS';
            wakeTimeHour?: number; // int32
        }
        export interface SeasonUpdateDto {
            seasonSettings: SeasonSettings;
        }
        export interface TeamCreateDto {
            teamMembers?: TeamMemberCreateDto[];
        }
        export interface TeamDto {
            id?: string;
            matchId?: string;
        }
        export interface TeamMemberCreateDto {
            playerId?: string;
            moves?: MatchMoveDto[];
        }
        export interface TeamMemberDto {
            id?: string;
            teamId?: string;
            playerId?: string;
        }
    }
}
declare namespace Paths {
    namespace CreateGroup {
        export type RequestBody = Components.Schemas.GroupCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeGroupDto;
        }
    }
    namespace CreateMatch {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        export type RequestBody = Components.Schemas.MatchCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeMatchDto;
        }
    }
    namespace CreateProfile {
        namespace Parameters {
            export type GroupId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
        }
        export type RequestBody = Components.Schemas.ProfileCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeProfileDto;
        }
    }
    namespace CreateRuleMove {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        export type RequestBody = Components.Schemas.RuleMoveCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeRuleMoveDto;
        }
    }
    namespace DeleteMatchById {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
        }
    }
    namespace DeletePlayer {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
        }
    }
    namespace DeleteRuleMove {
        namespace Parameters {
            export type GroupId = string;
            export type RuleMoveId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
            ruleMoveId: Parameters.RuleMoveId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
        }
    }
    namespace FetchData {
        namespace Parameters {
            export type Id = string;
        }
        export interface PathParameters {
            id: Parameters.Id;
        }
        namespace Responses {
            export interface $200 {}
        }
    }
    namespace FindGroupByInviteCode {
        namespace Parameters {
            export type InviteCode = string;
        }
        export interface QueryParameters {
            inviteCode: Parameters.InviteCode;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeGroupDto;
        }
    }
    namespace GetAllMatchOverviews {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeListMatchOverviewDto;
        }
    }
    namespace GetAllMatches {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeListMatchDto;
        }
    }
    namespace GetAllRuleMoves {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeListRuleMoveDto;
        }
    }
    namespace GetAllSeasons {
        namespace Parameters {
            export type GroupId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeListSeasonDto;
        }
    }
    namespace GetAsset {
        namespace Parameters {
            export type Id = string;
        }
        export interface PathParameters {
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeAssetMetadataDto;
        }
    }
    namespace GetGroupById {
        namespace Parameters {
            export type Id = string;
        }
        export interface PathParameters {
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeGroupDto;
        }
    }
    namespace GetHealthcheck {
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
        }
    }
    namespace GetLeaderboard {
        namespace Parameters {
            export type GroupId = string;
            export type Scope = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
        }
        export interface QueryParameters {
            scope: Parameters.Scope;
            seasonId?: Parameters.SeasonId;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeLeaderboardDto;
        }
    }
    namespace GetMatchById {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeMatchDto;
        }
    }
    namespace GetMatchOverviewById {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeMatchOverviewDto;
        }
    }
    namespace GetPlayers {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeListPlayerDto;
        }
    }
    namespace GetProfileById {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeProfileDto;
        }
    }
    namespace GetRules {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeListRuleDto;
        }
    }
    namespace GetSeasonById {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeSeasonDto;
        }
    }
    namespace ListAllProfiles {
        namespace Parameters {
            export type GroupId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeListProfileDto;
        }
    }
    namespace SetAvatar {
        namespace Parameters {
            export type GroupId = string;
            export type ProfileId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            profileId: Parameters.ProfileId;
        }
        export type RequestBody = string; // byte
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeProfileDto;
        }
    }
    namespace SetWallpaper {
        namespace Parameters {
            export type GroupId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
        }
        export type RequestBody = string; // byte
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeAssetMetadataDto;
        }
    }
    namespace StartNewSeason {
        namespace Parameters {
            export type GroupId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
        }
        export type RequestBody = Components.Schemas.SeasonCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeSeasonDto;
        }
    }
    namespace UpdateGroup {
        namespace Parameters {
            export type Id = string;
        }
        export interface PathParameters {
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.GroupCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeGroupDto;
        }
    }
    namespace UpdateMatch {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.MatchCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeMatchDto;
        }
    }
    namespace UpdateProfile {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.ProfileCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeProfileDto;
        }
    }
    namespace UpdateRuleMove {
        namespace Parameters {
            export type GroupId = string;
            export type RuleMoveId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
            ruleMoveId: Parameters.RuleMoveId;
        }
        export type RequestBody = Components.Schemas.RuleMoveCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeRuleMoveDto;
        }
    }
    namespace UpdateSeasonById {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.SeasonUpdateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeSeasonDto;
        }
    }
    namespace WriteRules {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        export type RequestBody = Components.Schemas.RuleCreateDto[];
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeListRuleDto;
        }
    }
}

export interface OperationMethods {
    /**
     * getGroupById
     */
    'getGroupById'(
        parameters?: Parameters<Paths.GetGroupById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetGroupById.Responses.$200>;
    /**
     * updateGroup
     */
    'updateGroup'(
        parameters?: Parameters<Paths.UpdateGroup.PathParameters> | null,
        data?: Paths.UpdateGroup.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateGroup.Responses.$200>;
    /**
     * setWallpaper
     */
    'setWallpaper'(
        parameters?: Parameters<Paths.SetWallpaper.PathParameters> | null,
        data?: Paths.SetWallpaper.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.SetWallpaper.Responses.$200>;
    /**
     * getRules
     */
    'getRules'(
        parameters?: Parameters<Paths.GetRules.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetRules.Responses.$200>;
    /**
     * writeRules
     */
    'writeRules'(
        parameters?: Parameters<Paths.WriteRules.PathParameters> | null,
        data?: Paths.WriteRules.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.WriteRules.Responses.$200>;
    /**
     * updateRuleMove
     */
    'updateRuleMove'(
        parameters?: Parameters<Paths.UpdateRuleMove.PathParameters> | null,
        data?: Paths.UpdateRuleMove.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateRuleMove.Responses.$200>;
    /**
     * deleteRuleMove
     */
    'deleteRuleMove'(
        parameters?: Parameters<Paths.DeleteRuleMove.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeleteRuleMove.Responses.$200>;
    /**
     * getMatchById
     */
    'getMatchById'(
        parameters?: Parameters<Paths.GetMatchById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetMatchById.Responses.$200>;
    /**
     * updateMatch
     */
    'updateMatch'(
        parameters?: Parameters<Paths.UpdateMatch.PathParameters> | null,
        data?: Paths.UpdateMatch.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateMatch.Responses.$200>;
    /**
     * deleteMatchById
     */
    'deleteMatchById'(
        parameters?: Parameters<Paths.DeleteMatchById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeleteMatchById.Responses.$200>;
    /**
     * getSeasonById
     */
    'getSeasonById'(
        parameters?: Parameters<Paths.GetSeasonById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetSeasonById.Responses.$200>;
    /**
     * updateSeasonById
     */
    'updateSeasonById'(
        parameters?: Parameters<Paths.UpdateSeasonById.PathParameters> | null,
        data?: Paths.UpdateSeasonById.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateSeasonById.Responses.$200>;
    /**
     * setAvatar
     */
    'setAvatar'(
        parameters?: Parameters<Paths.SetAvatar.PathParameters> | null,
        data?: Paths.SetAvatar.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.SetAvatar.Responses.$200>;
    /**
     * getProfileById
     */
    'getProfileById'(
        parameters?: Parameters<Paths.GetProfileById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetProfileById.Responses.$200>;
    /**
     * updateProfile
     */
    'updateProfile'(
        parameters?: Parameters<Paths.UpdateProfile.PathParameters> | null,
        data?: Paths.UpdateProfile.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateProfile.Responses.$200>;
    /**
     * startNewSeason
     */
    'startNewSeason'(
        parameters?: Parameters<Paths.StartNewSeason.PathParameters> | null,
        data?: Paths.StartNewSeason.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.StartNewSeason.Responses.$200>;
    /**
     * findGroupByInviteCode
     */
    'findGroupByInviteCode'(
        parameters?: Parameters<Paths.FindGroupByInviteCode.QueryParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.FindGroupByInviteCode.Responses.$200>;
    /**
     * createGroup
     */
    'createGroup'(
        parameters?: Parameters<UnknownParamsObject> | null,
        data?: Paths.CreateGroup.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateGroup.Responses.$200>;
    /**
     * getAllRuleMoves
     */
    'getAllRuleMoves'(
        parameters?: Parameters<Paths.GetAllRuleMoves.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllRuleMoves.Responses.$200>;
    /**
     * createRuleMove
     */
    'createRuleMove'(
        parameters?: Parameters<Paths.CreateRuleMove.PathParameters> | null,
        data?: Paths.CreateRuleMove.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateRuleMove.Responses.$200>;
    /**
     * getAllMatches
     */
    'getAllMatches'(
        parameters?: Parameters<Paths.GetAllMatches.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllMatches.Responses.$200>;
    /**
     * createMatch
     */
    'createMatch'(
        parameters?: Parameters<Paths.CreateMatch.PathParameters> | null,
        data?: Paths.CreateMatch.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateMatch.Responses.$200>;
    /**
     * listAllProfiles
     */
    'listAllProfiles'(
        parameters?: Parameters<Paths.ListAllProfiles.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.ListAllProfiles.Responses.$200>;
    /**
     * createProfile
     */
    'createProfile'(
        parameters?: Parameters<Paths.CreateProfile.PathParameters> | null,
        data?: Paths.CreateProfile.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateProfile.Responses.$200>;
    /**
     * getHealthcheck
     */
    'getHealthcheck'(
        parameters?: Parameters<UnknownParamsObject> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetHealthcheck.Responses.$200>;
    /**
     * getAllSeasons
     */
    'getAllSeasons'(
        parameters?: Parameters<Paths.GetAllSeasons.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllSeasons.Responses.$200>;
    /**
     * getPlayers
     */
    'getPlayers'(
        parameters?: Parameters<Paths.GetPlayers.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetPlayers.Responses.$200>;
    /**
     * getMatchOverviewById
     */
    'getMatchOverviewById'(
        parameters?: Parameters<Paths.GetMatchOverviewById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetMatchOverviewById.Responses.$200>;
    /**
     * getAllMatchOverviews
     */
    'getAllMatchOverviews'(
        parameters?: Parameters<Paths.GetAllMatchOverviews.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllMatchOverviews.Responses.$200>;
    /**
     * getLeaderboard
     */
    'getLeaderboard'(
        parameters?: Parameters<
            Paths.GetLeaderboard.QueryParameters &
                Paths.GetLeaderboard.PathParameters
        > | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetLeaderboard.Responses.$200>;
    /**
     * getAsset
     */
    'getAsset'(
        parameters?: Parameters<Paths.GetAsset.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAsset.Responses.$200>;
    /**
     * fetchData
     */
    'fetchData'(
        parameters?: Parameters<Paths.FetchData.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.FetchData.Responses.$200>;
    /**
     * deletePlayer
     */
    'deletePlayer'(
        parameters?: Parameters<Paths.DeletePlayer.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeletePlayer.Responses.$200>;
}

export interface PathsDictionary {
    ['/groups/{id}']: {
        /**
         * getGroupById
         */
        'get'(
            parameters?: Parameters<Paths.GetGroupById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetGroupById.Responses.$200>;
        /**
         * updateGroup
         */
        'put'(
            parameters?: Parameters<Paths.UpdateGroup.PathParameters> | null,
            data?: Paths.UpdateGroup.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateGroup.Responses.$200>;
    };
    ['/groups/{groupId}/wallpaper']: {
        /**
         * setWallpaper
         */
        'put'(
            parameters?: Parameters<Paths.SetWallpaper.PathParameters> | null,
            data?: Paths.SetWallpaper.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.SetWallpaper.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/rules']: {
        /**
         * getRules
         */
        'get'(
            parameters?: Parameters<Paths.GetRules.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetRules.Responses.$200>;
        /**
         * writeRules
         */
        'put'(
            parameters?: Parameters<Paths.WriteRules.PathParameters> | null,
            data?: Paths.WriteRules.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.WriteRules.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/rule-moves/{ruleMoveId}']: {
        /**
         * updateRuleMove
         */
        'put'(
            parameters?: Parameters<Paths.UpdateRuleMove.PathParameters> | null,
            data?: Paths.UpdateRuleMove.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateRuleMove.Responses.$200>;
        /**
         * deleteRuleMove
         */
        'delete'(
            parameters?: Parameters<Paths.DeleteRuleMove.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeleteRuleMove.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/{id}']: {
        /**
         * getMatchById
         */
        'get'(
            parameters?: Parameters<Paths.GetMatchById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetMatchById.Responses.$200>;
        /**
         * updateMatch
         */
        'put'(
            parameters?: Parameters<Paths.UpdateMatch.PathParameters> | null,
            data?: Paths.UpdateMatch.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateMatch.Responses.$200>;
        /**
         * deleteMatchById
         */
        'delete'(
            parameters?: Parameters<Paths.DeleteMatchById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeleteMatchById.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{id}']: {
        /**
         * getSeasonById
         */
        'get'(
            parameters?: Parameters<Paths.GetSeasonById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetSeasonById.Responses.$200>;
        /**
         * updateSeasonById
         */
        'put'(
            parameters?: Parameters<Paths.UpdateSeasonById.PathParameters> | null,
            data?: Paths.UpdateSeasonById.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateSeasonById.Responses.$200>;
    };
    ['/groups/{groupId}/profiles/{profileId}/avatar']: {
        /**
         * setAvatar
         */
        'put'(
            parameters?: Parameters<Paths.SetAvatar.PathParameters> | null,
            data?: Paths.SetAvatar.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.SetAvatar.Responses.$200>;
    };
    ['/groups/{groupId}/profiles/{id}']: {
        /**
         * getProfileById
         */
        'get'(
            parameters?: Parameters<Paths.GetProfileById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetProfileById.Responses.$200>;
        /**
         * updateProfile
         */
        'put'(
            parameters?: Parameters<Paths.UpdateProfile.PathParameters> | null,
            data?: Paths.UpdateProfile.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateProfile.Responses.$200>;
    };
    ['/groups/{groupId}/active-season']: {
        /**
         * startNewSeason
         */
        'put'(
            parameters?: Parameters<Paths.StartNewSeason.PathParameters> | null,
            data?: Paths.StartNewSeason.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.StartNewSeason.Responses.$200>;
    };
    ['/groups']: {
        /**
         * findGroupByInviteCode
         */
        'get'(
            parameters?: Parameters<Paths.FindGroupByInviteCode.QueryParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.FindGroupByInviteCode.Responses.$200>;
        /**
         * createGroup
         */
        'post'(
            parameters?: Parameters<UnknownParamsObject> | null,
            data?: Paths.CreateGroup.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateGroup.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/rule-moves']: {
        /**
         * getAllRuleMoves
         */
        'get'(
            parameters?: Parameters<Paths.GetAllRuleMoves.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllRuleMoves.Responses.$200>;
        /**
         * createRuleMove
         */
        'post'(
            parameters?: Parameters<Paths.CreateRuleMove.PathParameters> | null,
            data?: Paths.CreateRuleMove.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateRuleMove.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches']: {
        /**
         * getAllMatches
         */
        'get'(
            parameters?: Parameters<Paths.GetAllMatches.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllMatches.Responses.$200>;
        /**
         * createMatch
         */
        'post'(
            parameters?: Parameters<Paths.CreateMatch.PathParameters> | null,
            data?: Paths.CreateMatch.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateMatch.Responses.$200>;
    };
    ['/groups/{groupId}/profiles']: {
        /**
         * listAllProfiles
         */
        'get'(
            parameters?: Parameters<Paths.ListAllProfiles.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.ListAllProfiles.Responses.$200>;
        /**
         * createProfile
         */
        'post'(
            parameters?: Parameters<Paths.CreateProfile.PathParameters> | null,
            data?: Paths.CreateProfile.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateProfile.Responses.$200>;
    };
    ['/healthcheck']: {
        /**
         * getHealthcheck
         */
        'get'(
            parameters?: Parameters<UnknownParamsObject> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetHealthcheck.Responses.$200>;
    };
    ['/groups/{groupId}/seasons']: {
        /**
         * getAllSeasons
         */
        'get'(
            parameters?: Parameters<Paths.GetAllSeasons.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllSeasons.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/players']: {
        /**
         * getPlayers
         */
        'get'(
            parameters?: Parameters<Paths.GetPlayers.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetPlayers.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/{id}/overview']: {
        /**
         * getMatchOverviewById
         */
        'get'(
            parameters?: Parameters<Paths.GetMatchOverviewById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetMatchOverviewById.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/overview']: {
        /**
         * getAllMatchOverviews
         */
        'get'(
            parameters?: Parameters<Paths.GetAllMatchOverviews.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllMatchOverviews.Responses.$200>;
    };
    ['/groups/{groupId}/leaderboard']: {
        /**
         * getLeaderboard
         */
        'get'(
            parameters?: Parameters<
                Paths.GetLeaderboard.QueryParameters &
                    Paths.GetLeaderboard.PathParameters
            > | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetLeaderboard.Responses.$200>;
    };
    ['/assets/{id}']: {
        /**
         * getAsset
         */
        'get'(
            parameters?: Parameters<Paths.GetAsset.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAsset.Responses.$200>;
    };
    ['/assets/{id}/data']: {
        /**
         * fetchData
         */
        'get'(
            parameters?: Parameters<Paths.FetchData.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.FetchData.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/players/{id}']: {
        /**
         * deletePlayer
         */
        'delete'(
            parameters?: Parameters<Paths.DeletePlayer.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeletePlayer.Responses.$200>;
    };
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>;

export type AssetMetadataDto = Components.Schemas.AssetMetadataDto;
export type ErrorDetails = Components.Schemas.ErrorDetails;
export type GroupCreateDto = Components.Schemas.GroupCreateDto;
export type GroupDto = Components.Schemas.GroupDto;
export type LeaderboardDto = Components.Schemas.LeaderboardDto;
export type LeaderboardEntryDto = Components.Schemas.LeaderboardEntryDto;
export type MatchCreateDto = Components.Schemas.MatchCreateDto;
export type MatchDto = Components.Schemas.MatchDto;
export type MatchMoveDto = Components.Schemas.MatchMoveDto;
export type MatchMoveDtoComplete = Components.Schemas.MatchMoveDtoComplete;
export type MatchOverviewDto = Components.Schemas.MatchOverviewDto;
export type MatchOverviewTeamDto = Components.Schemas.MatchOverviewTeamDto;
export type MatchOverviewTeamMemberDto =
    Components.Schemas.MatchOverviewTeamMemberDto;
export type PlayerDto = Components.Schemas.PlayerDto;
export type PlayerStatisticsDto = Components.Schemas.PlayerStatisticsDto;
export type ProfileCreateDto = Components.Schemas.ProfileCreateDto;
export type ProfileDto = Components.Schemas.ProfileDto;
export type ResponseEnvelopeAssetMetadataDto =
    Components.Schemas.ResponseEnvelopeAssetMetadataDto;
export type ResponseEnvelopeGroupDto =
    Components.Schemas.ResponseEnvelopeGroupDto;
export type ResponseEnvelopeLeaderboardDto =
    Components.Schemas.ResponseEnvelopeLeaderboardDto;
export type ResponseEnvelopeListMatchDto =
    Components.Schemas.ResponseEnvelopeListMatchDto;
export type ResponseEnvelopeListMatchOverviewDto =
    Components.Schemas.ResponseEnvelopeListMatchOverviewDto;
export type ResponseEnvelopeListPlayerDto =
    Components.Schemas.ResponseEnvelopeListPlayerDto;
export type ResponseEnvelopeListProfileDto =
    Components.Schemas.ResponseEnvelopeListProfileDto;
export type ResponseEnvelopeListRuleDto =
    Components.Schemas.ResponseEnvelopeListRuleDto;
export type ResponseEnvelopeListRuleMoveDto =
    Components.Schemas.ResponseEnvelopeListRuleMoveDto;
export type ResponseEnvelopeListSeasonDto =
    Components.Schemas.ResponseEnvelopeListSeasonDto;
export type ResponseEnvelopeMatchDto =
    Components.Schemas.ResponseEnvelopeMatchDto;
export type ResponseEnvelopeMatchOverviewDto =
    Components.Schemas.ResponseEnvelopeMatchOverviewDto;
export type ResponseEnvelopeProfileDto =
    Components.Schemas.ResponseEnvelopeProfileDto;
export type ResponseEnvelopeRuleMoveDto =
    Components.Schemas.ResponseEnvelopeRuleMoveDto;
export type ResponseEnvelopeSeasonDto =
    Components.Schemas.ResponseEnvelopeSeasonDto;
export type ResponseEnvelopeString = Components.Schemas.ResponseEnvelopeString;
export type RuleCreateDto = Components.Schemas.RuleCreateDto;
export type RuleDto = Components.Schemas.RuleDto;
export type RuleMoveCreateDto = Components.Schemas.RuleMoveCreateDto;
export type RuleMoveDto = Components.Schemas.RuleMoveDto;
export type Season = Components.Schemas.Season;
export type SeasonCreateDto = Components.Schemas.SeasonCreateDto;
export type SeasonDto = Components.Schemas.SeasonDto;
export type SeasonSettings = Components.Schemas.SeasonSettings;
export type SeasonUpdateDto = Components.Schemas.SeasonUpdateDto;
export type TeamCreateDto = Components.Schemas.TeamCreateDto;
export type TeamDto = Components.Schemas.TeamDto;
export type TeamMemberCreateDto = Components.Schemas.TeamMemberCreateDto;
export type TeamMemberDto = Components.Schemas.TeamMemberDto;
