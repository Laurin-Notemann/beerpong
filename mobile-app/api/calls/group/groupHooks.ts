import { useQuery } from 'react-query';

import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { Paths } from '@/openapi/openapi';

export const useGroup = (id: ApiId) => {
    const { api } = useApi();

    return useQuery<Paths.GetGroupById.Responses.$200 | undefined>(['group', id], async () => {
        const res = await api?.getGroupById(id);
        return res?.data;
    });
};
