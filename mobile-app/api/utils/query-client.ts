import { QueryClient } from 'react-query'
import { minutes } from '@/utils/time'

// --- QUERY CLIENT ---

export const createQueryClient = () => {
    const qc = new QueryClient()

    qc.setDefaultOptions({
        queries: {
            staleTime: minutes(2),
            retry: false,
        },
        mutations: {
            retry: false,
        },
    })

    return qc
}
