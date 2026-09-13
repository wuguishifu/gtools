export type BackendName = 'sharp' | 'vips';

export type RawImage = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
  source?: string;
};

export type ExtractRegion = {
  input: string;
  output: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ImageBackend = {
  name: BackendName;
  /** Human readable description of the underlying engine, for diagnostics. */
  description: string;
  /** Decodes an image to raw pixels with any alpha channel dropped. */
  readRaw: (input: string) => Promise<RawImage>;
  /** Writes a rectangular region of the input to a new file. */
  extract: (region: ExtractRegion) => Promise<void>;
};
