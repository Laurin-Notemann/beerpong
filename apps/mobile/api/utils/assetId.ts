/** the asset id an asset's URL ends in (the API's file name for it), or '' without a URL */
export const assetIdOf = (url: string | null | undefined) =>
    url ? (new URL(url).pathname.split('/').pop() ?? '') : '';
