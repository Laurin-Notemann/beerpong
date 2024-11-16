import OpenAPIClientAxios from 'openapi-client-axios';

import { Client as BeerPongClient } from './openapi';

export const getOpenAPiClient = async () => {
    const api = new OpenAPIClientAxios({
        definition: '../../openapi/openapi.yaml',
    });
    await api.init();

    return api.getClient<BeerPongClient>();
};
