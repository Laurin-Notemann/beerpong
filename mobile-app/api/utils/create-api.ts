import axios from "axios"

// Might make sense to make a hook for this if we implment tokens and add a interceptor

export const createApi = () => {
    const api = axios.create({
        baseURL: process.env.API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
        },
    })

    return api
}
