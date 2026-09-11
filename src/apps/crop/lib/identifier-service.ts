type Run = { start: number; end: number };

class IdentifierService {
  public findPhotoBounds({
    runs,
    minPhotoHeight = 200,
  }: {
    runs: Run[];
    minPhotoHeight?: number;
  }) {
    let best:
      | {
          top: number;
          bottom: number;
          height: number;
        }
      | undefined;

    for (let i = 0; i < runs.length - 1; i++) {
      const top = runs[i].end + 1;
      const bottom = runs[i + 1].start;

      const candidateHeight = bottom - top;

      if (candidateHeight < minPhotoHeight) {
        continue;
      }

      if (!best || candidateHeight > best.height) {
        best = {
          top,
          bottom,
          height: candidateHeight,
        };
      }
    }

    return best;
  }

  public identifyBorders({
    data,
    width,
    height,
    channels,
    minRunLength = 2,
  }: {
    data: Buffer;
    width: number;
    height: number;
    channels: number;
    minRunLength?: number;
  }) {
    const rows = Array.from({ length: height }, (_, y) =>
      this.isBorderRow({ data, y, width, channels }),
    );

    const runs: Run[] = [];

    let start: number | null = null;

    for (let y = 0; y < height; y++) {
      if (rows[y]) {
        start ??= y;
      } else if (start !== null) {
        const end = y - 1;

        if (end - start + 1 >= minRunLength) {
          runs.push({ start, end });
        }

        start = null;
      }
    }

    if (start !== null) {
      const end = height - 1;

      if (end - start + 1 >= minRunLength) {
        runs.push({ start, end });
      }
    }

    return runs;
  }

  public isBorderRow({
    data,
    y,
    width,
    step = 5,
    channels,
    tolerance = 8,
    requiredFraction = 0.995,
  }: {
    data: Buffer;
    y: number;
    width: number;
    step?: number;
    channels: number;
    tolerance?: number;
    requiredFraction?: number;
  }) {
    let black = 0;
    let white = 0;
    let samples = 0;

    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * channels;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r <= tolerance && g <= tolerance && b <= tolerance) {
        black++;
      }

      if (
        r >= 255 - tolerance &&
        g >= 255 - tolerance &&
        b >= 255 - tolerance
      ) {
        white++;
      }

      samples++;
    }

    return (
      black / samples >= requiredFraction || white / samples >= requiredFraction
    );
  }
}

export const identifierService = new IdentifierService();
