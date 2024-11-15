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
        export interface Group {
            id?: string;
            name?: string;
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
        export type RequestBody = Components.Schemas.Group;
        namespace Responses {
            export type $200 = Components.Schemas.Group;
        }
    }
    namespace GetHealthcheck {
        namespace Responses {
            export type $200 = Components.Schemas.ResponseEnvelopeString;
        }
    }
}

export interface OperationMethods {
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
  ['/groups']: {
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
export type Group = Components.Schemas.Group;
export type ResponseEnvelopeString = Components.Schemas.ResponseEnvelopeString;
