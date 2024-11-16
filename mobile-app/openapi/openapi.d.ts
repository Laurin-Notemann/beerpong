import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios';

declare namespace Components {
    namespace Schemas {
        export interface ErrorDetails {
            code?: string;
            description?: string;
        }
        export interface GroupCreateDto {
            name?: string;
        }
        export interface GroupDto {
            id?: string;
            name?: string;
            inviteCode?: string;
            groupSettings?: GroupSettings;
            activeSeason?: Season;
        }
        export interface GroupSettings {
            id?: string;
            settingValue?: string;
        }
        export interface MatchDto {
            id?: string;
            date?: string; // date-time
            season?: Season;
        }
        export interface ProfileCreateDto {
            name?: string;
        }
        export interface ProfileDto {
            id?: string;
            name?: string;
            groupId?: string;
        }
        export interface ResponseEnvelopeGroupDto {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: GroupDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListGroupDto {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: GroupDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListMatchDto {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: MatchDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListProfileDto {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: ProfileDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeListSeasonDto {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: SeasonDto[];
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeMatchDto {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: MatchDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeProfileDto {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: ProfileDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeSeasonDto {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: SeasonDto;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeString {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: string;
            error?: ErrorDetails;
        }
        export interface ResponseEnvelopeVoid {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: {
                [key: string]: any;
            };
            error?: ErrorDetails;
        }
        export interface Season {
            id?: string;
            name?: string;
            startDate?: string; // date-time
            endDate?: string; // date-time
            groupId?: string;
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
    namespace DeleteProfile {
        namespace Parameters {
            export type GroupId = string;
            export type Id = string;
        }
        export interface PathParameters {
            groupId: Parameters.GroupId;
            id: Parameters.Id;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeVoid;
        }
    }
    namespace GetAllGroups {
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeListGroupDto;
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
            export type $200 = Components.Schemas.ResponseEnvelopeListProfileDto;
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
}

export interface OperationMethods {
  /**
   * getGroupById
   */
  'getGroupById'(
    parameters?: Parameters<Paths.GetGroupById.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetGroupById.Responses.$200>
  /**
   * updateGroup
   */
  'updateGroup'(
    parameters?: Parameters<Paths.UpdateGroup.PathParameters> | null,
    data?: Paths.UpdateGroup.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateGroup.Responses.$200>
  /**
   * createMatch
   */
  'createMatch'(
    parameters?: Parameters<Paths.CreateMatch.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateMatch.Responses.$200>
  /**
   * getProfileById
   */
  'getProfileById'(
    parameters?: Parameters<Paths.GetProfileById.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetProfileById.Responses.$200>
  /**
   * updateProfile
   */
  'updateProfile'(
    parameters?: Parameters<Paths.UpdateProfile.PathParameters> | null,
    data?: Paths.UpdateProfile.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateProfile.Responses.$200>
  /**
   * deleteProfile
   */
  'deleteProfile'(
    parameters?: Parameters<Paths.DeleteProfile.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteProfile.Responses.$200>
  /**
   * startNewSeason
   */
  'startNewSeason'(
    parameters?: Parameters<Paths.StartNewSeason.PathParameters> | null,
    data?: Paths.StartNewSeason.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.StartNewSeason.Responses.$200>
  /**
   * getAllGroups
   */
  'getAllGroups'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAllGroups.Responses.$200>
  /**
   * createGroup
   */
  'createGroup'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.CreateGroup.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateGroup.Responses.$200>
  /**
   * listAllProfiles
   */
  'listAllProfiles'(
    parameters?: Parameters<Paths.ListAllProfiles.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListAllProfiles.Responses.$200>
  /**
   * createProfile
   */
  'createProfile'(
    parameters?: Parameters<Paths.CreateProfile.PathParameters> | null,
    data?: Paths.CreateProfile.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateProfile.Responses.$200>
  /**
   * getHealthcheck
   */
  'getHealthcheck'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetHealthcheck.Responses.$200>
  /**
   * getAllSeasons
   */
  'getAllSeasons'(
    parameters?: Parameters<Paths.GetAllSeasons.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAllSeasons.Responses.$200>
  /**
   * getAllMatches
   */
  'getAllMatches'(
    parameters?: Parameters<Paths.GetAllMatches.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAllMatches.Responses.$200>
  /**
   * getMatchById
   */
  'getMatchById'(
    parameters?: Parameters<Paths.GetMatchById.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetMatchById.Responses.$200>
  /**
   * getSeasonById
   */
  'getSeasonById'(
    parameters?: Parameters<Paths.GetSeasonById.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetSeasonById.Responses.$200>
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
    ): OperationResponse<Paths.GetGroupById.Responses.$200>
    /**
     * updateGroup
     */
    'put'(
      parameters?: Parameters<Paths.UpdateGroup.PathParameters> | null,
      data?: Paths.UpdateGroup.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateGroup.Responses.$200>
  }
  ['/groups/{groupId}/seasons/{seasonId}/new-match']: {
    /**
     * createMatch
     */
    'put'(
      parameters?: Parameters<Paths.CreateMatch.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateMatch.Responses.$200>
  }
  ['/groups/{groupId}/profiles/{id}']: {
    /**
     * getProfileById
     */
    'get'(
      parameters?: Parameters<Paths.GetProfileById.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetProfileById.Responses.$200>
    /**
     * updateProfile
     */
    'put'(
      parameters?: Parameters<Paths.UpdateProfile.PathParameters> | null,
      data?: Paths.UpdateProfile.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateProfile.Responses.$200>
    /**
     * deleteProfile
     */
    'delete'(
      parameters?: Parameters<Paths.DeleteProfile.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteProfile.Responses.$200>
  }
  ['/groups/{groupId}/active-season']: {
    /**
     * startNewSeason
     */
    'put'(
      parameters?: Parameters<Paths.StartNewSeason.PathParameters> | null,
      data?: Paths.StartNewSeason.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.StartNewSeason.Responses.$200>
  }
  ['/groups']: {
    /**
     * getAllGroups
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAllGroups.Responses.$200>
    /**
     * createGroup
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.CreateGroup.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateGroup.Responses.$200>
  }
  ['/groups/{groupId}/profiles']: {
    /**
     * listAllProfiles
     */
    'get'(
      parameters?: Parameters<Paths.ListAllProfiles.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListAllProfiles.Responses.$200>
    /**
     * createProfile
     */
    'post'(
      parameters?: Parameters<Paths.CreateProfile.PathParameters> | null,
      data?: Paths.CreateProfile.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateProfile.Responses.$200>
  }
  ['/healthcheck']: {
    /**
     * getHealthcheck
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetHealthcheck.Responses.$200>
  }
  ['/groups/{groupId}/seasons']: {
    /**
     * getAllSeasons
     */
    'get'(
      parameters?: Parameters<Paths.GetAllSeasons.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAllSeasons.Responses.$200>
  }
  ['/groups/{groupId}/seasons/{seasonId}/matches']: {
    /**
     * getAllMatches
     */
    'get'(
      parameters?: Parameters<Paths.GetAllMatches.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAllMatches.Responses.$200>
  }
  ['/groups/{groupId}/seasons/{seasonId}/matches/{id}']: {
    /**
     * getMatchById
     */
    'get'(
      parameters?: Parameters<Paths.GetMatchById.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetMatchById.Responses.$200>
  }
  ['/groups/{groupId}/seasons/{id}']: {
    /**
     * getSeasonById
     */
    'get'(
      parameters?: Parameters<Paths.GetSeasonById.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetSeasonById.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>

export type ErrorDetails = Components.Schemas.ErrorDetails;
export type GroupCreateDto = Components.Schemas.GroupCreateDto;
export type GroupDto = Components.Schemas.GroupDto;
export type GroupSettings = Components.Schemas.GroupSettings;
export type MatchDto = Components.Schemas.MatchDto;
export type ProfileCreateDto = Components.Schemas.ProfileCreateDto;
export type ProfileDto = Components.Schemas.ProfileDto;
export type ResponseEnvelopeGroupDto = Components.Schemas.ResponseEnvelopeGroupDto;
export type ResponseEnvelopeListGroupDto = Components.Schemas.ResponseEnvelopeListGroupDto;
export type ResponseEnvelopeListMatchDto = Components.Schemas.ResponseEnvelopeListMatchDto;
export type ResponseEnvelopeListProfileDto = Components.Schemas.ResponseEnvelopeListProfileDto;
export type ResponseEnvelopeListSeasonDto = Components.Schemas.ResponseEnvelopeListSeasonDto;
export type ResponseEnvelopeMatchDto = Components.Schemas.ResponseEnvelopeMatchDto;
export type ResponseEnvelopeProfileDto = Components.Schemas.ResponseEnvelopeProfileDto;
export type ResponseEnvelopeSeasonDto = Components.Schemas.ResponseEnvelopeSeasonDto;
export type ResponseEnvelopeString = Components.Schemas.ResponseEnvelopeString;
export type ResponseEnvelopeVoid = Components.Schemas.ResponseEnvelopeVoid;
export type Season = Components.Schemas.Season;
export type SeasonCreateDto = Components.Schemas.SeasonCreateDto;
export type SeasonDto = Components.Schemas.SeasonDto;
