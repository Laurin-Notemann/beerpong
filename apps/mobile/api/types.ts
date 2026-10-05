import { ProfileDto } from '@/openapi/openapi';

export type ApiId = string;

export type ScreenState<Props> = {
    props: Props | null;
    isLoading: boolean;
    error: unknown;
};

export interface Profile extends ProfileDto {
    avatarUrl: string | null;
}

/** a DTO that references a profile by `profileId`, with the resolved profile attached */
export type WithProfile<T extends { profileId?: string | null }> = T & {
    profile?: Profile;
};
