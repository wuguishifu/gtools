/**
 * Replaced at build time by `--define process.env.GTOOLS_BUILD_VERSION`, so both the
 * npm bundle and the compiled binary report the released version. Running from
 * source (pnpm dev) leaves the fallback in place.
 */
export const VERSION = process.env.GTOOLS_BUILD_VERSION ?? '0.0.0-dev';
