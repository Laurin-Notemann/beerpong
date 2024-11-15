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
        }
        export interface ResponseEnvelopeString {
            status?: "OK" | "ERROR";
            httpCode?: number; // int32
            data?: string;
            error?: ErrorDetails;
        }
    }
}
declare namespace Paths {
    namespace CreateGroup {
        export type RequestBody = Components.Schemas.GroupCreateDto;
        namespace Responses {
            export type $200 = Components.Schemas.GroupDto;
        }
    }
    namespace GetAllGroups {
        namespace Responses {
            export type $200 = Components.Schemas.GroupDto[];
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
            export type $200 = Components.Schemas.GroupDto;
        }
    }
    namespace GetHealthcheck {
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
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
            export type $200 = Components.Schemas.GroupDto;
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
   * getHealthcheck
   */
  'getHealthcheck'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetHealthcheck.Responses.$200>
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
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>

export type ErrorDetails = Components.Schemas.ErrorDetails;
export type GroupCreateDto = Components.Schemas.GroupCreateDto;
export type GroupDto = Components.Schemas.GroupDto;
export type ResponseEnvelopeString = Components.Schemas.ResponseEnvelopeString;
