/**
 * A profile's score clips, oldest first. A profile cached before there could be several only has
 * `scoreClipUrl`.
 */
export const scoreClipsOf = (
    profile:
        | { scoreClipUrls?: string[]; scoreClipUrl?: string | null }
        | null
        | undefined
) =>
    profile?.scoreClipUrls ??
    (profile?.scoreClipUrl ? [profile.scoreClipUrl] : []);

/** one of the profile's score clips at random, like Versus TV picks one for every score */
export function randomScoreClip(
    profile: Parameters<typeof scoreClipsOf>[0]
): string | undefined {
    const clips = scoreClipsOf(profile);
    return clips[Math.floor(Math.random() * clips.length)];
}
