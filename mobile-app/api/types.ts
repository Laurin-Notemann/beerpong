export type ApiId = string;

export type ScreenState<Props> = {
    props: Props | null;
    isLoading: boolean;
    error: unknown;
};
