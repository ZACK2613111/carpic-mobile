import type { ProjectDoc } from '@/features/projects/types';

export type Shot = {
  id: string;
  project_id: string;
  user_id: string;
  slot: string;
  section: string; // ShotGroup value (DB column is `section`, not the reserved word `group`)
  position: number;
  image_path: string | null;
  cutout_path: string | null;
  background_id: string;
  doc: ProjectDoc;
  audio_path: string | null;
  captured: boolean;
  created_at: string;
  updated_at: string;
};

export type ShotPatch = Partial<
  Pick<
    Shot,
    'image_path' | 'cutout_path' | 'background_id' | 'doc' | 'audio_path' | 'captured' | 'position'
  >
>;
