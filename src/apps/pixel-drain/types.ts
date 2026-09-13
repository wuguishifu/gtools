export type PixelDrainFile = {
  detail_href: string;
  description: string;
  id: string;
  name: string;
  size: number;
  date_uploaded: string;
  mime_type: string;
  thumbnail_href: string;
  hash_sha256: string;
};

export type GetListResponse = {
  success: boolean;
  id: string;
  title: string;
  date_created: string;
  file_count: number;
  files: PixelDrainFile[];
};
