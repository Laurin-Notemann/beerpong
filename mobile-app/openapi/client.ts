import OpenAPIClientAxios, { Document } from 'openapi-client-axios';

import beerpongDefinition from '../api/generated/openapi.json';
import { Client as BeerPongClient } from './openapi';

export const getOpenAPiClient = async (baseURL: string) => {
    const api = new OpenAPIClientAxios({
        axiosConfigDefaults: {
            baseURL,
        },
        definition: beerpongDefinition as Document,
    });
    await api.init();

    return api.getClient<BeerPongClient>();
};
