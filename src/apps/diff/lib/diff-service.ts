import fs from 'fs';
import path from 'path';

import {
  DiffFile,
  DiffOptions,
  DiffSide,
  diffStoreActions,
} from './diff-store';

// OS metadata files that are noise rather than content worth syncing, so they
// stay ignored even when hidden are included.
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', 'Icon?']);

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);

  return (
    relative === '' ||
    (relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

async function assertDirectory(root: string, label: string) {
  const stats = await fs.promises.stat(root).catch(() => null);

  if (!stats) throw new Error(`${label} does not exist`);
  if (!stats.isDirectory()) throw new Error(`${label} is not a directory`);
}

type MatchKey = (relative: string) => string;

const exactKey: MatchKey = (relative) => relative;
const caseInsensitiveKey: MatchKey = (relative) => relative.toLowerCase();

/**
 * Paths relative to a root, indexed by match key. Several files can share a
 * key when names differ only in case, so each key keeps all of them rather
 * than silently dropping all but one.
 */
type Listing = {
  files: Map<string, string[]>;
  fileCount: number;
  dirs: Map<string, string>;
};

/**
 * Lists every regular file and directory under `root`. Symlinks are skipped
 * rather than followed, so a link cycle can't trap the walk. Unless hidden
 * files are included, hidden directories are skipped along with everything in
 * them.
 */
async function listFiles(
  root: string,
  toKey: MatchKey,
  includeHidden: boolean,
): Promise<Listing> {
  const files = new Map<string, string[]>();
  let fileCount = 0;
  const dirs = new Map<string, string>();
  const pending = [''];

  while (pending.length > 0) {
    const relative = pending.pop()!;
    const entries = await fs.promises.readdir(path.join(root, relative), {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (IGNORED_FILES.has(entry.name)) continue;
      if (!includeHidden && entry.name.startsWith('.')) continue;

      const child = path.join(relative, entry.name);

      if (entry.isDirectory()) {
        pending.push(child);
        dirs.set(toKey(child), child);
      } else if (entry.isFile()) {
        const key = toKey(child);
        files.set(key, [...(files.get(key) ?? []), child]);
        fileCount++;
      }
    }
  }

  return { files, fileCount, dirs };
}

async function describeMissing(
  root: string,
  listing: Listing,
  other: Listing,
): Promise<DiffFile[]> {
  const missing = [...listing.files]
    .filter(([key]) => !other.files.has(key))
    .flatMap(([, files]) => files)
    .sort();

  return Promise.all(
    missing.map(async (file) => ({
      path: file,
      size: (await fs.promises.stat(path.join(root, file))).size,
    })),
  );
}

/**
 * Rewrites the directories of `relative` to the casing they already have in
 * the destination, so a case-insensitive sync fills `photos/` rather than
 * creating a sibling `Photos/` on a case-sensitive file system.
 */
function matchDestination(
  relative: string,
  dirs: Listing['dirs'],
  toKey: MatchKey,
) {
  const segments = relative.split(path.sep);

  for (let depth = segments.length - 1; depth > 0; depth--) {
    const existing = dirs.get(toKey(path.join(...segments.slice(0, depth))));
    if (existing) return path.join(existing, ...segments.slice(depth));
  }

  return relative;
}

async function copyFile(source: string, destination: string) {
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  // EXCL so a file that appeared after the scan is never overwritten.
  await fs.promises.copyFile(source, destination, fs.constants.COPYFILE_EXCL);

  const stats = await fs.promises.stat(source);
  await fs.promises.utimes(destination, stats.atime, stats.mtime);
}

function describeError(error: unknown) {
  if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
    return 'already exists at destination';
  }

  return error instanceof Error ? error.message : String(error);
}

type CopyJob = {
  file: DiffFile;
  from: DiffSide;
  to: DiffSide;
  /** Path relative to `to.root`. */
  destination: string;
};

class DiffService {
  public async diff(leftPath: string, rightPath: string, options: DiffOptions) {
    const { mode, caseInsensitive, includeHidden } = options;
    const toKey = caseInsensitive ? caseInsensitiveKey : exactKey;
    const leftRoot = path.resolve(leftPath);
    const rightRoot = path.resolve(rightPath);

    await assertDirectory(leftRoot, leftPath);
    await assertDirectory(rightRoot, rightPath);

    if (isInside(leftRoot, rightRoot) || isInside(rightRoot, leftRoot)) {
      throw new Error('directories must not be the same or nested');
    }

    diffStoreActions.start(options);

    const [leftListing, rightListing] = await Promise.all([
      listFiles(leftRoot, toKey, includeHidden),
      listFiles(rightRoot, toKey, includeHidden),
    ]);

    const left: DiffSide = {
      label: leftPath,
      root: leftRoot,
      only: await describeMissing(leftRoot, leftListing, rightListing),
    };

    const right: DiffSide = {
      label: rightPath,
      root: rightRoot,
      only: await describeMissing(rightRoot, rightListing, leftListing),
    };

    diffStoreActions.setResult(
      left,
      right,
      leftListing.fileCount - left.only.length,
    );

    if (mode === 'apply') {
      await this.sync([
        ...left.only.map((file) => ({
          file,
          from: left,
          to: right,
          destination: matchDestination(file.path, rightListing.dirs, toKey),
        })),
        ...right.only.map((file) => ({
          file,
          from: right,
          to: left,
          destination: matchDestination(file.path, leftListing.dirs, toKey),
        })),
      ]);
    }

    diffStoreActions.finish();
  }

  private async sync(jobs: CopyJob[]) {
    if (jobs.length === 0) return;

    diffStoreActions.startCopying(
      jobs.reduce((total, job) => total + job.file.size, 0),
    );

    for (const { file, from, to, destination } of jobs) {
      diffStoreActions.setActiveFile(file.path);

      try {
        await copyFile(
          path.join(from.root, file.path),
          path.join(to.root, destination),
        );
        diffStoreActions.recordCopy(file.size);
      } catch (error) {
        diffStoreActions.recordFailure({
          file: path.join(to.label, destination),
          reason: describeError(error),
        });
      }
    }
  }
}

export const diffService = new DiffService();
