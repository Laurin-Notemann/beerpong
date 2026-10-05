import type {
    AxiosRequestConfig,
    OpenAPIClient,
    OperationResponse,
    Parameters,
    UnknownParamsObject,
} from 'openapi-client-axios';

declare namespace Components {
    namespace Schemas {
        export interface AssetCropDto {
            offsetX?: number; // double
            offsetY?: number; // double
            zoom?: number; // double
        }
        export interface AssetMetadataDto {
            id?: string;
            url?: string;
            type?: 'GROUP_WALLPAPER' | 'PROFILE_AVATAR' | 'TEAM_PHOTO';
            offsetX?: number; // double
            offsetY?: number; // double
            zoom?: number; // double
        }
        export interface AssetUploadResponse {
            id?: string;
            url?: string;
            type?: 'GROUP_WALLPAPER' | 'PROFILE_AVATAR' | 'TEAM_PHOTO';
            offsetX?: number; // double
            offsetY?: number; // double
            zoom?: number; // double
            singleUploadUrl?: string;
        }
        export interface AuthRefreshDto {
            refreshToken?: string;
        }
        export interface AuthSignupDto {
            installationType?: 'IOS' | 'ANDROID';
            deviceId?: string;
        }
        export interface AuthTokenDto {
            token?: string;
            type?: 'ACCESS' | 'REFRESH';
        }
        export interface CupPositionDto {
            x?: number; // int32
            y?: number; // int32
        }
        export interface EloGameDto {
            matchId: string;
            date: string; // date-time
            gap: number; // double
            scale: number; // double
            teamPoints: number; // double
            finisher: string;
            finishMove: string;
            teams: EloTeamDto[];
        }
        export interface EloMoveDto {
            name: string;
            count: number; // int32
        }
        export interface EloParamsDto {
            k: number; // double
            marginWeight: number; // double
            perPoint: number; // double
            topWeight: number; // double
        }
        export interface EloPlayerDto {
            profileId: string;
            name: string;
            points: number; // int64
            own: number; // int64
            before: number; // double
            after: number; // double
            result: number; // double
            hitting: number; // double
            expected: number; // double
            moves: EloMoveDto[];
        }
        export interface EloPredictionDto {
            params: EloScoreDto;
            defaults: EloScoreDto;
        }
        export interface EloScoreDto {
            logLoss: number; // double
            correct: number; // double
            called: number; // int32
            games: number; // int32
        }
        export interface EloSearchDto {
            params: EloParamsDto;
            prediction: EloScoreDto;
            tried: number; // int32
        }
        export interface EloSeasonDto {
            id: string;
            name?: string;
            numMatches: number; // int32
        }
        export interface EloSimulationDto {
            groupId: string;
            groupName?: string;
            defaults: EloParamsDto;
            params: EloParamsDto;
            seasons: EloSeasonDto[];
            seasonId?: string;
            standings: EloStandingDto[];
            games: EloGameDto[];
            prediction: EloPredictionDto;
        }
        export interface EloStandingDto {
            profileId: string;
            name: string;
            elo: number; // double
            defaultElo: number; // double
            defaultRank: number; // int32
            matches: number; // int64
            wins: number; // int64
            points: number; // int64
            result: number; // double
            hitting: number; // double
        }
        export interface EloTeamDto {
            won: boolean;
            rating: number; // double
            winChance: number; // double
            points: number; // int64
            avgPoints: number; // double
            cups: number; // int64
            players: EloPlayerDto[];
        }
        export interface ErrorDetails {
            code?: string;
            description?: string;
        }
        export interface FormationDto {
            id?: string;
            groupId?: string;
            name?: string;
            cups?: CupPositionDto[];
            updatedAt?: string; // date-time
        }
        export interface FormationSaveDto {
            name?: string;
            cups?: CupPositionDto[];
        }
        export interface GroupCreateDto {
            name?: string;
            profileNames?: string[];
            sportPreset?: string;
            customSportName?: string;
        }
        export interface GroupDto {
            id?: string;
            name?: string;
            inviteCode?: string;
            activeSeasonId?: string;
            assetIdWallpaper?: string;
            createdById?: string;
            createdAt?: string; // date-time
            sportPreset?: GroupPreset;
            customSportName?: string;
            numberOfPlayers?: number; // int64
            numberOfMatches?: number; // int64
            numberOfSeasons?: number; // int64
        }
        export interface GroupPreset {
            id?: string;
            title?: string;
            imageUrl?: string;
        }
        export interface LeaderboardDto {
            numPlayers?: number; // int64
            numMatches?: number; // int64
            startedAt?: string; // date-time
            entries?: PlayerDtoExtended[];
        }
        export interface LiveMatchCreateDto {
            seasonId?: string;
            ops?: LiveMatchOpDto[];
        }
        export interface LiveMatchDto {
            id?: string;
            groupId?: string;
            seasonId?: string;
            status?: 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
            startedAt?: string; // date-time
            lastActivityAt?: string; // date-time
            endedAt?: string; // date-time
            createdByUserId?: string;
            lastSeq?: number; // int64
            resultMatchId?: string;
            ops?: LiveMatchOpDto[];
        }
        export interface LiveMatchFinishDto {
            expectedSeq?: number; // int64
            teams?: TeamCreateDto[];
        }
        export interface LiveMatchOpDto {
            id?: string;
            seq?: number; // int64
            type?:
                | 'SET_TEAMS'
                | 'SET_PLAYER_TEAM'
                | 'ADJUST_MOVE'
                | 'RECORD_CUP_HIT'
                | 'UNDO_CUP_HIT';
            createdAt?: string; // date-time
            playerId?: string;
            team?: string;
            moveId?: string;
            delta?: number; // int32
            cups?: CupPositionDto[];
            cup?: CupPositionDto;
            finishMoveId?: string;
            redPlayerIds?: string[];
            bluePlayerIds?: string[];
        }
        export interface LiveMatchOpsDto {
            ops?: LiveMatchOpDto[];
        }
        export interface LiveMatchOpsResultDto {
            lastSeq?: number; // int64
            ops?: LiveMatchOpDto[];
        }
        export interface MatchCreateDto {
            teams?: TeamCreateDto[];
        }
        export interface MatchDto {
            id?: string;
            date?: string; // date-time
            seasonId?: string;
            createdById?: string;
            photoUploads?: TeamPhotoDto[];
        }
        export interface MatchDtoExtended {
            id?: string;
            date?: string; // date-time
            seasonId?: string;
            createdById?: string;
            photoUploads?: TeamPhotoDto[];
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
            seasonId?: string;
            blueTeam?: MatchOverviewTeamDto;
            redTeam?: MatchOverviewTeamDto;
        }
        export interface MatchOverviewTeamDto {
            points?: number; // int32
            teamId?: string;
            assetPhotoId?: string;
            members?: MatchOverviewTeamMemberDto[];
        }
        export interface MatchOverviewTeamMemberDto {
            playerId?: string;
            points?: number; // int32
            moves?: MatchMoveDto[];
        }
        export interface PlayerDto {
            id?: string;
            profileId?: string;
            seasonId?: string;
            activeThisSeason?: boolean;
            statisticsId?: string;
        }
        export interface PlayerDtoExtended {
            id?: string;
            profileId?: string;
            season?: SeasonDto;
            activeThisSeason?: boolean;
            statistics?: PlayerStatisticsDto;
        }
        export interface PlayerStatisticsDto {
            id?: string;
            points?: number; // int64
            matches?: number; // int64
            wins?: number; // int64
            moves?: number; // int64
            totalTeamSize?: number; // int64
            avgPointsPerMatch?: number; // double
            avgTeamSize?: number; // double
            elo?: number; // double
        }
        export interface ProfileCreateDto {
            name?: string;
        }
        export interface ProfileCreatedDto {
            id?: string;
            name?: string;
            assetIdAvatar?: string;
            groupId?: string;
            createdById?: string;
            reactivated?: boolean;
            lastActiveSeasonId?: string;
        }
        export interface ProfileDto {
            id?: string;
            name?: string;
            assetIdAvatar?: string;
            groupId?: string;
            createdById?: string;
        }
        export interface ResponseEnvelopeAssetMetadataDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: AssetMetadataDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeAssetUploadResponse {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: AssetUploadResponse;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeAuthTokenDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: AuthTokenDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeEloSearchDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: EloSearchDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeEloSimulationDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: EloSimulationDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeFormationDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: FormationDto;
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
        export interface ResponseEnvelopeListFormationDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: FormationDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListGroupDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: GroupDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListGroupPreset {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: GroupPreset[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListLiveMatchDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: LiveMatchDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListMatchDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListMatchDtoExtended {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchDtoExtended[];
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
        export interface ResponseEnvelopeListPlayerDtoExtended {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: PlayerDtoExtended[];
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
        export interface ResponseEnvelopeLiveMatchDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: LiveMatchDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeLiveMatchOpsResultDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: LiveMatchOpsResultDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeMatchDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeMatchDtoExtended {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchDtoExtended;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeMatchOverviewDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: MatchOverviewDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeProfileCreatedDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: ProfileCreatedDto;
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
        export interface ResponseEnvelopeTeamDto {
            status?: 'OK' | 'ERROR';
            httpCode?: number; // int32
            data?: TeamDto;
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
            createdById?: string;
            seasonId?: string;
        }
        export interface RuleMoveCreateDto {
            name?: string;
            pointsForTeam?: number; // int32
            pointsForScorer?: number; // int32
            finishingMove?: boolean;
            cups?: number; // int32
        }
        export interface RuleMoveDto {
            id?: string;
            name?: string;
            seasonId?: string;
            pointsForTeam?: number; // int32
            pointsForScorer?: number; // int32
            finishingMove?: boolean;
            cups?: number; // int32
        }
        export interface SeasonCreateDto {
            oldSeasonName?: string;
            ruleMoves?: RuleMoveCreateDto[];
        }
        export interface SeasonDto {
            id?: string;
            name?: string;
            startDate?: string; // date-time
            endDate?: string; // date-time
            groupId?: string;
            seasonSettings?: SeasonSettingsDto;
            createdById?: string;
        }
        export interface SeasonSettingsDto {
            minMatchesToQualify?: number; // int32
            minTeamSize?: number; // int32
            maxTeamSize?: number; // int32
            rankingAlgorithm?: 'AVERAGE' | 'ELO';
            dailyLeaderboard?:
                'RESET_AT_MIDNIGHT' | 'WAKE_TIME' | 'LAST_24_HOURS';
            wakeTime?: string;
        }
        export interface SeasonUpdateDto {
            seasonSettings: SeasonSettingsDto;
        }
        export interface TeamCreateDto {
            existingTeamId?: string;
            savePhoto?: boolean;
            teamMembers?: TeamMemberCreateDto[];
        }
        export interface TeamDto {
            id?: string;
            matchId?: string;
            photoAssetId?: string;
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
        export interface TeamPhotoDto {
            teamId?: string;
            teamPhoto?: AssetUploadResponse;
        }
    }
}
declare namespace Paths {
    namespace AbandonLiveMatch {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeLiveMatchDto;
        }
    }
    namespace AppendOps {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.LiveMatchOpsDto;
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeLiveMatchOpsResultDto;
        }
    }
    namespace CreateGroup {
        export type RequestBody = Components.Schemas.GroupCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeGroupDto;
        }
    }
    namespace CreateLiveMatch {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.LiveMatchCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeLiveMatchDto;
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
            export type $200 =
                Components.Schemas.ResponseEnvelopeProfileCreatedDto;
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
    namespace DeleteAvatar {
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
    namespace DeleteFormation {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
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
    namespace DeletePhoto {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
            export type SeasonId = string;
            export type TeamId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            teamId: Parameters.TeamId;
            id: Parameters.Id;
            seasonId: Parameters.SeasonId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeTeamDto;
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
    namespace DeleteWallpaper {
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
    namespace FindUserGroups {
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeListGroupDto;
        }
    }
    namespace FinishLiveMatch {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.LiveMatchFinishDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeLiveMatchDto;
        }
    }
    namespace GetActiveLiveMatches {
        namespace Parameters {
            export type GroupId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeListLiveMatchDto;
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
    namespace GetAllMatchesExtended {
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
                Components.Schemas.ResponseEnvelopeListMatchDtoExtended;
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
    namespace GetEloSimulation {
        namespace Parameters {
            export type InviteCode = string;
            export type K = number; // double
            export type MarginWeight = number; // double
            export type PerPoint = number; // double
            export type SeasonId = string;
            export type TopWeight = number; // double
        }
        export interface QueryParameters {
            inviteCode: Parameters.InviteCode;
            seasonId?: Parameters.SeasonId;
            k?: Parameters.K /* double */;
            marginWeight?: Parameters.MarginWeight /* double */;
            perPoint?: Parameters.PerPoint /* double */;
            topWeight?: Parameters.TopWeight /* double */;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeEloSimulationDto;
        }
    }
    namespace GetFormations {
        namespace Parameters {
            export type GroupId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeListFormationDto;
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
    namespace GetLiveMatch {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeLiveMatchDto;
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
    namespace GetMatchByIdExtended {
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
                Components.Schemas.ResponseEnvelopeMatchDtoExtended;
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
            export type ShowInactive = boolean;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        export interface QueryParameters {
            showInactive?: Parameters.ShowInactive;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeListPlayerDto;
        }
    }
    namespace GetPlayersExtended {
        namespace Parameters {
            export type GroupId = string;
            export type SeasonId = string;
            export type ShowInactive = boolean;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            seasonId: Parameters.SeasonId;
        }
        export interface QueryParameters {
            showInactive?: Parameters.ShowInactive;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeListPlayerDtoExtended;
        }
    }
    namespace GetPresets {
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeListGroupPreset;
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
    namespace JoinGroup {
        namespace Parameters {
            export type Id = string;
        }
        export interface PathParameters {
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
        }
    }
    namespace LeaveGroup {
        namespace Parameters {
            export type Id = string;
        }
        export interface PathParameters {
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
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
    namespace RefreshAuth {
        export type RequestBody = Components.Schemas.AuthRefreshDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeAuthTokenDto;
        }
    }
    namespace SaveFormation {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.FormationSaveDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeFormationDto;
        }
    }
    namespace SearchEloWeights {
        namespace Parameters {
            export type InviteCode = string;
        }
        export interface QueryParameters {
            inviteCode: Parameters.InviteCode;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeEloSearchDto;
        }
    }
    namespace SetAvatar {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.AssetCropDto;
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeAssetUploadResponse;
        }
    }
    namespace SetPhoto {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
            export type SeasonId = string;
            export type TeamId = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            teamId: Parameters.TeamId;
            id: Parameters.Id;
            seasonId: Parameters.SeasonId;
        }
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeAssetUploadResponse;
        }
    }
    namespace SetWallpaper {
        namespace Parameters {
            export type Id = string;
        }
        export interface PathParameters {
            id: Parameters.Id;
        }
        export type RequestBody = Components.Schemas.AssetCropDto;
        namespace Responses {
            export type $200 =
                Components.Schemas.ResponseEnvelopeAssetUploadResponse;
        }
    }
    namespace Signup {
        export type RequestBody = Components.Schemas.AuthSignupDto;
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeAuthTokenDto;
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
     * getEloSimulation - A group's season computed by the leaderboard's Elo with other weights, every game's breakdown, and how well the ratings predict the next game over all seasons. Weights left out stay at the default; without seasonId the running season.
     */
    getEloSimulation(
        parameters?: Parameters<Paths.GetEloSimulation.QueryParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetEloSimulation.Responses.$200>;
    /**
     * searchEloWeights - Tries a grid of Elo weights on all of a group's seasons and returns the one that predicts its games best.
     */
    searchEloWeights(
        parameters?: Parameters<Paths.SearchEloWeights.QueryParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.SearchEloWeights.Responses.$200>;
    /**
     * getGroupById
     */
    getGroupById(
        parameters?: Parameters<Paths.GetGroupById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetGroupById.Responses.$200>;
    /**
     * updateGroup
     */
    updateGroup(
        parameters?: Parameters<Paths.UpdateGroup.PathParameters> | null,
        data?: Paths.UpdateGroup.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateGroup.Responses.$200>;
    /**
     * setWallpaper
     */
    setWallpaper(
        parameters?: Parameters<Paths.SetWallpaper.PathParameters> | null,
        data?: Paths.SetWallpaper.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.SetWallpaper.Responses.$200>;
    /**
     * deleteWallpaper
     */
    deleteWallpaper(
        parameters?: Parameters<Paths.DeleteWallpaper.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeleteWallpaper.Responses.$200>;
    /**
     * getRules
     */
    getRules(
        parameters?: Parameters<Paths.GetRules.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetRules.Responses.$200>;
    /**
     * writeRules
     */
    writeRules(
        parameters?: Parameters<Paths.WriteRules.PathParameters> | null,
        data?: Paths.WriteRules.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.WriteRules.Responses.$200>;
    /**
     * updateRuleMove
     */
    updateRuleMove(
        parameters?: Parameters<Paths.UpdateRuleMove.PathParameters> | null,
        data?: Paths.UpdateRuleMove.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateRuleMove.Responses.$200>;
    /**
     * getMatchById
     */
    getMatchById(
        parameters?: Parameters<Paths.GetMatchById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetMatchById.Responses.$200>;
    /**
     * updateMatch
     */
    updateMatch(
        parameters?: Parameters<Paths.UpdateMatch.PathParameters> | null,
        data?: Paths.UpdateMatch.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateMatch.Responses.$200>;
    /**
     * deleteMatchById
     */
    deleteMatchById(
        parameters?: Parameters<Paths.DeleteMatchById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeleteMatchById.Responses.$200>;
    /**
     * setPhoto
     */
    setPhoto(
        parameters?: Parameters<Paths.SetPhoto.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.SetPhoto.Responses.$200>;
    /**
     * deletePhoto
     */
    deletePhoto(
        parameters?: Parameters<Paths.DeletePhoto.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeletePhoto.Responses.$200>;
    /**
     * getSeasonById
     */
    getSeasonById(
        parameters?: Parameters<Paths.GetSeasonById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetSeasonById.Responses.$200>;
    /**
     * updateSeasonById
     */
    updateSeasonById(
        parameters?: Parameters<Paths.UpdateSeasonById.PathParameters> | null,
        data?: Paths.UpdateSeasonById.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateSeasonById.Responses.$200>;
    /**
     * getProfileById
     */
    getProfileById(
        parameters?: Parameters<Paths.GetProfileById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetProfileById.Responses.$200>;
    /**
     * updateProfile
     */
    updateProfile(
        parameters?: Parameters<Paths.UpdateProfile.PathParameters> | null,
        data?: Paths.UpdateProfile.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.UpdateProfile.Responses.$200>;
    /**
     * setAvatar
     */
    setAvatar(
        parameters?: Parameters<Paths.SetAvatar.PathParameters> | null,
        data?: Paths.SetAvatar.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.SetAvatar.Responses.$200>;
    /**
     * deleteAvatar
     */
    deleteAvatar(
        parameters?: Parameters<Paths.DeleteAvatar.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeleteAvatar.Responses.$200>;
    /**
     * startNewSeason
     */
    startNewSeason(
        parameters?: Parameters<Paths.StartNewSeason.PathParameters> | null,
        data?: Paths.StartNewSeason.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.StartNewSeason.Responses.$200>;
    /**
     * findGroupByInviteCode
     */
    findGroupByInviteCode(
        parameters?: Parameters<Paths.FindGroupByInviteCode.QueryParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.FindGroupByInviteCode.Responses.$200>;
    /**
     * createGroup
     */
    createGroup(
        parameters?: Parameters<UnknownParamsObject> | null,
        data?: Paths.CreateGroup.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateGroup.Responses.$200>;
    /**
     * leaveGroup
     */
    leaveGroup(
        parameters?: Parameters<Paths.LeaveGroup.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.LeaveGroup.Responses.$200>;
    /**
     * joinGroup
     */
    joinGroup(
        parameters?: Parameters<Paths.JoinGroup.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.JoinGroup.Responses.$200>;
    /**
     * getAllRuleMoves
     */
    getAllRuleMoves(
        parameters?: Parameters<Paths.GetAllRuleMoves.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllRuleMoves.Responses.$200>;
    /**
     * createRuleMove
     */
    createRuleMove(
        parameters?: Parameters<Paths.CreateRuleMove.PathParameters> | null,
        data?: Paths.CreateRuleMove.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateRuleMove.Responses.$200>;
    /**
     * getAllMatches
     */
    getAllMatches(
        parameters?: Parameters<Paths.GetAllMatches.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllMatches.Responses.$200>;
    /**
     * createMatch
     */
    createMatch(
        parameters?: Parameters<Paths.CreateMatch.PathParameters> | null,
        data?: Paths.CreateMatch.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateMatch.Responses.$200>;
    /**
     * listAllProfiles
     */
    listAllProfiles(
        parameters?: Parameters<Paths.ListAllProfiles.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.ListAllProfiles.Responses.$200>;
    /**
     * createProfile
     */
    createProfile(
        parameters?: Parameters<Paths.CreateProfile.PathParameters> | null,
        data?: Paths.CreateProfile.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateProfile.Responses.$200>;
    /**
     * signup
     */
    signup(
        parameters?: Parameters<UnknownParamsObject> | null,
        data?: Paths.Signup.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.Signup.Responses.$200>;
    /**
     * refreshAuth
     */
    refreshAuth(
        parameters?: Parameters<UnknownParamsObject> | null,
        data?: Paths.RefreshAuth.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.RefreshAuth.Responses.$200>;
    /**
     * getHealthcheck
     */
    getHealthcheck(
        parameters?: Parameters<UnknownParamsObject> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetHealthcheck.Responses.$200>;
    /**
     * getAllSeasons
     */
    getAllSeasons(
        parameters?: Parameters<Paths.GetAllSeasons.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllSeasons.Responses.$200>;
    /**
     * getPlayers
     */
    getPlayers(
        parameters?: Parameters<
            Paths.GetPlayers.QueryParameters & Paths.GetPlayers.PathParameters
        > | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetPlayers.Responses.$200>;
    /**
     * getPlayersExtended
     */
    getPlayersExtended(
        parameters?: Parameters<
            Paths.GetPlayersExtended.QueryParameters &
                Paths.GetPlayersExtended.PathParameters
        > | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetPlayersExtended.Responses.$200>;
    /**
     * getMatchOverviewById
     */
    getMatchOverviewById(
        parameters?: Parameters<Paths.GetMatchOverviewById.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetMatchOverviewById.Responses.$200>;
    /**
     * getMatchByIdExtended
     */
    getMatchByIdExtended(
        parameters?: Parameters<Paths.GetMatchByIdExtended.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetMatchByIdExtended.Responses.$200>;
    /**
     * getAllMatchOverviews
     */
    getAllMatchOverviews(
        parameters?: Parameters<Paths.GetAllMatchOverviews.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllMatchOverviews.Responses.$200>;
    /**
     * getAllMatchesExtended
     */
    getAllMatchesExtended(
        parameters?: Parameters<Paths.GetAllMatchesExtended.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAllMatchesExtended.Responses.$200>;
    /**
     * getLeaderboard
     */
    getLeaderboard(
        parameters?: Parameters<
            Paths.GetLeaderboard.QueryParameters &
                Paths.GetLeaderboard.PathParameters
        > | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetLeaderboard.Responses.$200>;
    /**
     * findUserGroups
     */
    findUserGroups(
        parameters?: Parameters<UnknownParamsObject> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.FindUserGroups.Responses.$200>;
    /**
     * getPresets
     */
    getPresets(
        parameters?: Parameters<UnknownParamsObject> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetPresets.Responses.$200>;
    /**
     * getAsset
     */
    getAsset(
        parameters?: Parameters<Paths.GetAsset.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetAsset.Responses.$200>;
    /**
     * deletePlayer
     */
    deletePlayer(
        parameters?: Parameters<Paths.DeletePlayer.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeletePlayer.Responses.$200>;
    /**
     * getLiveMatch
     */
    getLiveMatch(
        parameters?: Parameters<Paths.GetLiveMatch.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetLiveMatch.Responses.$200>;
    /**
     * createLiveMatch
     */
    createLiveMatch(
        parameters?: Parameters<Paths.CreateLiveMatch.PathParameters> | null,
        data?: Paths.CreateLiveMatch.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateLiveMatch.Responses.$200>;
    /**
     * abandonLiveMatch
     */
    abandonLiveMatch(
        parameters?: Parameters<Paths.AbandonLiveMatch.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.AbandonLiveMatch.Responses.$200>;
    /**
     * finishLiveMatch
     */
    finishLiveMatch(
        parameters?: Parameters<Paths.FinishLiveMatch.PathParameters> | null,
        data?: Paths.FinishLiveMatch.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.FinishLiveMatch.Responses.$200>;
    /**
     * appendOps
     */
    appendOps(
        parameters?: Parameters<Paths.AppendOps.PathParameters> | null,
        data?: Paths.AppendOps.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.AppendOps.Responses.$200>;
    /**
     * getFormations
     */
    getFormations(
        parameters?: Parameters<Paths.GetFormations.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetFormations.Responses.$200>;
    /**
     * saveFormation
     */
    saveFormation(
        parameters?: Parameters<Paths.SaveFormation.PathParameters> | null,
        data?: Paths.SaveFormation.RequestBody,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.SaveFormation.Responses.$200>;
    /**
     * deleteFormation
     */
    deleteFormation(
        parameters?: Parameters<Paths.DeleteFormation.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.DeleteFormation.Responses.$200>;
    /**
     * getActiveLiveMatches
     */
    getActiveLiveMatches(
        parameters?: Parameters<Paths.GetActiveLiveMatches.PathParameters> | null,
        data?: any,
        config?: AxiosRequestConfig
    ): OperationResponse<Paths.GetActiveLiveMatches.Responses.$200>;
}

export interface PathsDictionary {
    ['/elo-simulation']: {
        /**
         * getEloSimulation - A group's season computed by the leaderboard's Elo with other weights, every game's breakdown, and how well the ratings predict the next game over all seasons. Weights left out stay at the default; without seasonId the running season.
         */
        get(
            parameters?: Parameters<Paths.GetEloSimulation.QueryParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetEloSimulation.Responses.$200>;
    };
    ['/elo-simulation/search']: {
        /**
         * searchEloWeights - Tries a grid of Elo weights on all of a group's seasons and returns the one that predicts its games best.
         */
        get(
            parameters?: Parameters<Paths.SearchEloWeights.QueryParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.SearchEloWeights.Responses.$200>;
    };
    ['/groups/{id}']: {
        /**
         * getGroupById
         */
        get(
            parameters?: Parameters<Paths.GetGroupById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetGroupById.Responses.$200>;
        /**
         * updateGroup
         */
        put(
            parameters?: Parameters<Paths.UpdateGroup.PathParameters> | null,
            data?: Paths.UpdateGroup.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateGroup.Responses.$200>;
    };
    ['/groups/{id}/wallpaper']: {
        /**
         * setWallpaper
         */
        put(
            parameters?: Parameters<Paths.SetWallpaper.PathParameters> | null,
            data?: Paths.SetWallpaper.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.SetWallpaper.Responses.$200>;
        /**
         * deleteWallpaper
         */
        delete(
            parameters?: Parameters<Paths.DeleteWallpaper.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeleteWallpaper.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/rules']: {
        /**
         * getRules
         */
        get(
            parameters?: Parameters<Paths.GetRules.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetRules.Responses.$200>;
        /**
         * writeRules
         */
        put(
            parameters?: Parameters<Paths.WriteRules.PathParameters> | null,
            data?: Paths.WriteRules.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.WriteRules.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/rule-moves/{ruleMoveId}']: {
        /**
         * updateRuleMove
         */
        put(
            parameters?: Parameters<Paths.UpdateRuleMove.PathParameters> | null,
            data?: Paths.UpdateRuleMove.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateRuleMove.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/{id}']: {
        /**
         * getMatchById
         */
        get(
            parameters?: Parameters<Paths.GetMatchById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetMatchById.Responses.$200>;
        /**
         * updateMatch
         */
        put(
            parameters?: Parameters<Paths.UpdateMatch.PathParameters> | null,
            data?: Paths.UpdateMatch.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateMatch.Responses.$200>;
        /**
         * deleteMatchById
         */
        delete(
            parameters?: Parameters<Paths.DeleteMatchById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeleteMatchById.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/{id}/photos/{teamId}']: {
        /**
         * setPhoto
         */
        put(
            parameters?: Parameters<Paths.SetPhoto.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.SetPhoto.Responses.$200>;
        /**
         * deletePhoto
         */
        delete(
            parameters?: Parameters<Paths.DeletePhoto.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeletePhoto.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{id}']: {
        /**
         * getSeasonById
         */
        get(
            parameters?: Parameters<Paths.GetSeasonById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetSeasonById.Responses.$200>;
        /**
         * updateSeasonById
         */
        put(
            parameters?: Parameters<Paths.UpdateSeasonById.PathParameters> | null,
            data?: Paths.UpdateSeasonById.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateSeasonById.Responses.$200>;
    };
    ['/groups/{groupId}/profiles/{id}']: {
        /**
         * getProfileById
         */
        get(
            parameters?: Parameters<Paths.GetProfileById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetProfileById.Responses.$200>;
        /**
         * updateProfile
         */
        put(
            parameters?: Parameters<Paths.UpdateProfile.PathParameters> | null,
            data?: Paths.UpdateProfile.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.UpdateProfile.Responses.$200>;
    };
    ['/groups/{groupId}/profiles/{id}/avatar']: {
        /**
         * setAvatar
         */
        put(
            parameters?: Parameters<Paths.SetAvatar.PathParameters> | null,
            data?: Paths.SetAvatar.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.SetAvatar.Responses.$200>;
        /**
         * deleteAvatar
         */
        delete(
            parameters?: Parameters<Paths.DeleteAvatar.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeleteAvatar.Responses.$200>;
    };
    ['/groups/{groupId}/active-season']: {
        /**
         * startNewSeason
         */
        put(
            parameters?: Parameters<Paths.StartNewSeason.PathParameters> | null,
            data?: Paths.StartNewSeason.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.StartNewSeason.Responses.$200>;
    };
    ['/groups']: {
        /**
         * findGroupByInviteCode
         */
        get(
            parameters?: Parameters<Paths.FindGroupByInviteCode.QueryParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.FindGroupByInviteCode.Responses.$200>;
        /**
         * createGroup
         */
        post(
            parameters?: Parameters<UnknownParamsObject> | null,
            data?: Paths.CreateGroup.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateGroup.Responses.$200>;
    };
    ['/groups/{id}/leave']: {
        /**
         * leaveGroup
         */
        post(
            parameters?: Parameters<Paths.LeaveGroup.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.LeaveGroup.Responses.$200>;
    };
    ['/groups/{id}/join']: {
        /**
         * joinGroup
         */
        post(
            parameters?: Parameters<Paths.JoinGroup.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.JoinGroup.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/rule-moves']: {
        /**
         * getAllRuleMoves
         */
        get(
            parameters?: Parameters<Paths.GetAllRuleMoves.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllRuleMoves.Responses.$200>;
        /**
         * createRuleMove
         */
        post(
            parameters?: Parameters<Paths.CreateRuleMove.PathParameters> | null,
            data?: Paths.CreateRuleMove.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateRuleMove.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches']: {
        /**
         * getAllMatches
         */
        get(
            parameters?: Parameters<Paths.GetAllMatches.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllMatches.Responses.$200>;
        /**
         * createMatch
         */
        post(
            parameters?: Parameters<Paths.CreateMatch.PathParameters> | null,
            data?: Paths.CreateMatch.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateMatch.Responses.$200>;
    };
    ['/groups/{groupId}/profiles']: {
        /**
         * listAllProfiles
         */
        get(
            parameters?: Parameters<Paths.ListAllProfiles.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.ListAllProfiles.Responses.$200>;
        /**
         * createProfile
         */
        post(
            parameters?: Parameters<Paths.CreateProfile.PathParameters> | null,
            data?: Paths.CreateProfile.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateProfile.Responses.$200>;
    };
    ['/auth/signup']: {
        /**
         * signup
         */
        post(
            parameters?: Parameters<UnknownParamsObject> | null,
            data?: Paths.Signup.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.Signup.Responses.$200>;
    };
    ['/auth/refresh']: {
        /**
         * refreshAuth
         */
        post(
            parameters?: Parameters<UnknownParamsObject> | null,
            data?: Paths.RefreshAuth.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.RefreshAuth.Responses.$200>;
    };
    ['/healthcheck']: {
        /**
         * getHealthcheck
         */
        get(
            parameters?: Parameters<UnknownParamsObject> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetHealthcheck.Responses.$200>;
    };
    ['/groups/{groupId}/seasons']: {
        /**
         * getAllSeasons
         */
        get(
            parameters?: Parameters<Paths.GetAllSeasons.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllSeasons.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/players']: {
        /**
         * getPlayers
         */
        get(
            parameters?: Parameters<
                Paths.GetPlayers.QueryParameters &
                    Paths.GetPlayers.PathParameters
            > | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetPlayers.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/players/extended']: {
        /**
         * getPlayersExtended
         */
        get(
            parameters?: Parameters<
                Paths.GetPlayersExtended.QueryParameters &
                    Paths.GetPlayersExtended.PathParameters
            > | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetPlayersExtended.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/{id}/overview']: {
        /**
         * getMatchOverviewById
         */
        get(
            parameters?: Parameters<Paths.GetMatchOverviewById.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetMatchOverviewById.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/{id}/extended']: {
        /**
         * getMatchByIdExtended
         */
        get(
            parameters?: Parameters<Paths.GetMatchByIdExtended.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetMatchByIdExtended.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/overview']: {
        /**
         * getAllMatchOverviews
         */
        get(
            parameters?: Parameters<Paths.GetAllMatchOverviews.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllMatchOverviews.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/matches/extended']: {
        /**
         * getAllMatchesExtended
         */
        get(
            parameters?: Parameters<Paths.GetAllMatchesExtended.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAllMatchesExtended.Responses.$200>;
    };
    ['/groups/{groupId}/leaderboard']: {
        /**
         * getLeaderboard
         */
        get(
            parameters?: Parameters<
                Paths.GetLeaderboard.QueryParameters &
                    Paths.GetLeaderboard.PathParameters
            > | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetLeaderboard.Responses.$200>;
    };
    ['/groups/user']: {
        /**
         * findUserGroups
         */
        get(
            parameters?: Parameters<UnknownParamsObject> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.FindUserGroups.Responses.$200>;
    };
    ['/group-presets']: {
        /**
         * getPresets
         */
        get(
            parameters?: Parameters<UnknownParamsObject> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetPresets.Responses.$200>;
    };
    ['/assets/{id}']: {
        /**
         * getAsset
         */
        get(
            parameters?: Parameters<Paths.GetAsset.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetAsset.Responses.$200>;
    };
    ['/groups/{groupId}/seasons/{seasonId}/players/{id}']: {
        /**
         * deletePlayer
         */
        delete(
            parameters?: Parameters<Paths.DeletePlayer.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeletePlayer.Responses.$200>;
    };
    ['/groups/{groupId}/live-matches/{id}']: {
        /**
         * getLiveMatch
         */
        get(
            parameters?: Parameters<Paths.GetLiveMatch.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetLiveMatch.Responses.$200>;
        /**
         * createLiveMatch
         */
        put(
            parameters?: Parameters<Paths.CreateLiveMatch.PathParameters> | null,
            data?: Paths.CreateLiveMatch.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.CreateLiveMatch.Responses.$200>;
        /**
         * abandonLiveMatch
         */
        delete(
            parameters?: Parameters<Paths.AbandonLiveMatch.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.AbandonLiveMatch.Responses.$200>;
    };
    ['/groups/{groupId}/live-matches/{id}/finish']: {
        /**
         * finishLiveMatch
         */
        post(
            parameters?: Parameters<Paths.FinishLiveMatch.PathParameters> | null,
            data?: Paths.FinishLiveMatch.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.FinishLiveMatch.Responses.$200>;
    };
    ['/groups/{groupId}/live-matches/{id}/ops']: {
        /**
         * appendOps
         */
        post(
            parameters?: Parameters<Paths.AppendOps.PathParameters> | null,
            data?: Paths.AppendOps.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.AppendOps.Responses.$200>;
    };
    ['/groups/{groupId}/formations']: {
        /**
         * getFormations
         */
        get(
            parameters?: Parameters<Paths.GetFormations.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetFormations.Responses.$200>;
    };
    ['/groups/{groupId}/formations/{id}']: {
        /**
         * saveFormation
         */
        put(
            parameters?: Parameters<Paths.SaveFormation.PathParameters> | null,
            data?: Paths.SaveFormation.RequestBody,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.SaveFormation.Responses.$200>;
        /**
         * deleteFormation
         */
        delete(
            parameters?: Parameters<Paths.DeleteFormation.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.DeleteFormation.Responses.$200>;
    };
    ['/groups/{groupId}/live-matches']: {
        /**
         * getActiveLiveMatches
         */
        get(
            parameters?: Parameters<Paths.GetActiveLiveMatches.PathParameters> | null,
            data?: any,
            config?: AxiosRequestConfig
        ): OperationResponse<Paths.GetActiveLiveMatches.Responses.$200>;
    };
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>;

export type AssetCropDto = Components.Schemas.AssetCropDto;
export type AssetMetadataDto = Components.Schemas.AssetMetadataDto;
export type AssetUploadResponse = Components.Schemas.AssetUploadResponse;
export type AuthRefreshDto = Components.Schemas.AuthRefreshDto;
export type AuthSignupDto = Components.Schemas.AuthSignupDto;
export type AuthTokenDto = Components.Schemas.AuthTokenDto;
export type CupPositionDto = Components.Schemas.CupPositionDto;
export type EloGameDto = Components.Schemas.EloGameDto;
export type EloMoveDto = Components.Schemas.EloMoveDto;
export type EloParamsDto = Components.Schemas.EloParamsDto;
export type EloPlayerDto = Components.Schemas.EloPlayerDto;
export type EloPredictionDto = Components.Schemas.EloPredictionDto;
export type EloScoreDto = Components.Schemas.EloScoreDto;
export type EloSearchDto = Components.Schemas.EloSearchDto;
export type EloSeasonDto = Components.Schemas.EloSeasonDto;
export type EloSimulationDto = Components.Schemas.EloSimulationDto;
export type EloStandingDto = Components.Schemas.EloStandingDto;
export type EloTeamDto = Components.Schemas.EloTeamDto;
export type ErrorDetails = Components.Schemas.ErrorDetails;
export type FormationDto = Components.Schemas.FormationDto;
export type FormationSaveDto = Components.Schemas.FormationSaveDto;
export type GroupCreateDto = Components.Schemas.GroupCreateDto;
export type GroupDto = Components.Schemas.GroupDto;
export type GroupPreset = Components.Schemas.GroupPreset;
export type LeaderboardDto = Components.Schemas.LeaderboardDto;
export type LiveMatchCreateDto = Components.Schemas.LiveMatchCreateDto;
export type LiveMatchDto = Components.Schemas.LiveMatchDto;
export type LiveMatchFinishDto = Components.Schemas.LiveMatchFinishDto;
export type LiveMatchOpDto = Components.Schemas.LiveMatchOpDto;
export type LiveMatchOpsDto = Components.Schemas.LiveMatchOpsDto;
export type LiveMatchOpsResultDto = Components.Schemas.LiveMatchOpsResultDto;
export type MatchCreateDto = Components.Schemas.MatchCreateDto;
export type MatchDto = Components.Schemas.MatchDto;
export type MatchDtoExtended = Components.Schemas.MatchDtoExtended;
export type MatchMoveDto = Components.Schemas.MatchMoveDto;
export type MatchMoveDtoComplete = Components.Schemas.MatchMoveDtoComplete;
export type MatchOverviewDto = Components.Schemas.MatchOverviewDto;
export type MatchOverviewTeamDto = Components.Schemas.MatchOverviewTeamDto;
export type MatchOverviewTeamMemberDto =
    Components.Schemas.MatchOverviewTeamMemberDto;
export type PlayerDto = Components.Schemas.PlayerDto;
export type PlayerDtoExtended = Components.Schemas.PlayerDtoExtended;
export type PlayerStatisticsDto = Components.Schemas.PlayerStatisticsDto;
export type ProfileCreateDto = Components.Schemas.ProfileCreateDto;
export type ProfileCreatedDto = Components.Schemas.ProfileCreatedDto;
export type ProfileDto = Components.Schemas.ProfileDto;
export type ResponseEnvelopeAssetMetadataDto =
    Components.Schemas.ResponseEnvelopeAssetMetadataDto;
export type ResponseEnvelopeAssetUploadResponse =
    Components.Schemas.ResponseEnvelopeAssetUploadResponse;
export type ResponseEnvelopeAuthTokenDto =
    Components.Schemas.ResponseEnvelopeAuthTokenDto;
export type ResponseEnvelopeEloSearchDto =
    Components.Schemas.ResponseEnvelopeEloSearchDto;
export type ResponseEnvelopeEloSimulationDto =
    Components.Schemas.ResponseEnvelopeEloSimulationDto;
export type ResponseEnvelopeFormationDto =
    Components.Schemas.ResponseEnvelopeFormationDto;
export type ResponseEnvelopeGroupDto =
    Components.Schemas.ResponseEnvelopeGroupDto;
export type ResponseEnvelopeLeaderboardDto =
    Components.Schemas.ResponseEnvelopeLeaderboardDto;
export type ResponseEnvelopeListFormationDto =
    Components.Schemas.ResponseEnvelopeListFormationDto;
export type ResponseEnvelopeListGroupDto =
    Components.Schemas.ResponseEnvelopeListGroupDto;
export type ResponseEnvelopeListGroupPreset =
    Components.Schemas.ResponseEnvelopeListGroupPreset;
export type ResponseEnvelopeListLiveMatchDto =
    Components.Schemas.ResponseEnvelopeListLiveMatchDto;
export type ResponseEnvelopeListMatchDto =
    Components.Schemas.ResponseEnvelopeListMatchDto;
export type ResponseEnvelopeListMatchDtoExtended =
    Components.Schemas.ResponseEnvelopeListMatchDtoExtended;
export type ResponseEnvelopeListMatchOverviewDto =
    Components.Schemas.ResponseEnvelopeListMatchOverviewDto;
export type ResponseEnvelopeListPlayerDto =
    Components.Schemas.ResponseEnvelopeListPlayerDto;
export type ResponseEnvelopeListPlayerDtoExtended =
    Components.Schemas.ResponseEnvelopeListPlayerDtoExtended;
export type ResponseEnvelopeListProfileDto =
    Components.Schemas.ResponseEnvelopeListProfileDto;
export type ResponseEnvelopeListRuleDto =
    Components.Schemas.ResponseEnvelopeListRuleDto;
export type ResponseEnvelopeListRuleMoveDto =
    Components.Schemas.ResponseEnvelopeListRuleMoveDto;
export type ResponseEnvelopeListSeasonDto =
    Components.Schemas.ResponseEnvelopeListSeasonDto;
export type ResponseEnvelopeLiveMatchDto =
    Components.Schemas.ResponseEnvelopeLiveMatchDto;
export type ResponseEnvelopeLiveMatchOpsResultDto =
    Components.Schemas.ResponseEnvelopeLiveMatchOpsResultDto;
export type ResponseEnvelopeMatchDto =
    Components.Schemas.ResponseEnvelopeMatchDto;
export type ResponseEnvelopeMatchDtoExtended =
    Components.Schemas.ResponseEnvelopeMatchDtoExtended;
export type ResponseEnvelopeMatchOverviewDto =
    Components.Schemas.ResponseEnvelopeMatchOverviewDto;
export type ResponseEnvelopeProfileCreatedDto =
    Components.Schemas.ResponseEnvelopeProfileCreatedDto;
export type ResponseEnvelopeProfileDto =
    Components.Schemas.ResponseEnvelopeProfileDto;
export type ResponseEnvelopeRuleMoveDto =
    Components.Schemas.ResponseEnvelopeRuleMoveDto;
export type ResponseEnvelopeSeasonDto =
    Components.Schemas.ResponseEnvelopeSeasonDto;
export type ResponseEnvelopeString = Components.Schemas.ResponseEnvelopeString;
export type ResponseEnvelopeTeamDto =
    Components.Schemas.ResponseEnvelopeTeamDto;
export type RuleCreateDto = Components.Schemas.RuleCreateDto;
export type RuleDto = Components.Schemas.RuleDto;
export type RuleMoveCreateDto = Components.Schemas.RuleMoveCreateDto;
export type RuleMoveDto = Components.Schemas.RuleMoveDto;
export type SeasonCreateDto = Components.Schemas.SeasonCreateDto;
export type SeasonDto = Components.Schemas.SeasonDto;
export type SeasonSettingsDto = Components.Schemas.SeasonSettingsDto;
export type SeasonUpdateDto = Components.Schemas.SeasonUpdateDto;
export type TeamCreateDto = Components.Schemas.TeamCreateDto;
export type TeamDto = Components.Schemas.TeamDto;
export type TeamMemberCreateDto = Components.Schemas.TeamMemberCreateDto;
export type TeamMemberDto = Components.Schemas.TeamMemberDto;
export type TeamPhotoDto = Components.Schemas.TeamPhotoDto;
