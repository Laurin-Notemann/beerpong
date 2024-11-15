import OpenAPIClientAxios from 'openapi-client-axios';

import { Client as BeerPongClient } from './openapi';

const api = new OpenAPIClientAxios({
    definition: '../../openapi/openapi.yaml',
});
api.init();

async function createPet() {
    const client = await api.getClient<BeerPongClient>();
    const res = await client.getHealthcheck();
    const huher = res.data;

    console.log('Pet created', res.data);
}
