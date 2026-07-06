// The default dealership shot list. Data-defined so the guided capture, the
// project dashboard, and the publish manifest all share one source of truth.

export type ShotGroup = 'exterior' | 'wheels' | 'interior' | 'docs' | 'engine';

// Guide overlay to render over the camera preview for each slot.
export type GuideId =
  | 'front'
  | 'front34l'
  | 'front34r'
  | 'sideL'
  | 'sideR'
  | 'rear'
  | 'rear34l'
  | 'rear34r'
  | 'wheel'
  | 'detail'
  | 'interior'
  | 'engine';

export type ShotSlot = {
  id: string;
  group: ShotGroup;
  label: string;
  labelFr: string;
  needsCutout: boolean;
  guide: GuideId;
  audio?: boolean;
};

export const GROUP_ORDER: ShotGroup[] = ['exterior', 'wheels', 'interior', 'docs', 'engine'];

export const GROUP_LABELS: Record<ShotGroup, { label: string; labelFr: string }> = {
  exterior: { label: 'Exterior', labelFr: 'Extérieur' },
  wheels: { label: 'Wheels', labelFr: 'Pneus' },
  interior: { label: 'Interior', labelFr: 'Intérieur' },
  docs: { label: 'Documents', labelFr: 'Documents' },
  engine: { label: 'Engine', labelFr: 'Moteur' },
};

export const SHOT_TEMPLATE: ShotSlot[] = [
  // Exterior — the 8-angle walk-around (cut out for clean backgrounds)
  { id: 'ext-front', group: 'exterior', label: 'Front', labelFr: 'Avant', needsCutout: true, guide: 'front' },
  { id: 'ext-front-right', group: 'exterior', label: 'Front right ¾', labelFr: 'Avant droit ¾', needsCutout: true, guide: 'front34r' },
  { id: 'ext-right', group: 'exterior', label: 'Right side', labelFr: 'Côté droit', needsCutout: true, guide: 'sideR' },
  { id: 'ext-rear-right', group: 'exterior', label: 'Rear right ¾', labelFr: 'Arrière droit ¾', needsCutout: true, guide: 'rear34r' },
  { id: 'ext-rear', group: 'exterior', label: 'Rear', labelFr: 'Arrière', needsCutout: true, guide: 'rear' },
  { id: 'ext-rear-left', group: 'exterior', label: 'Rear left ¾', labelFr: 'Arrière gauche ¾', needsCutout: true, guide: 'rear34l' },
  { id: 'ext-left', group: 'exterior', label: 'Left side', labelFr: 'Côté gauche', needsCutout: true, guide: 'sideL' },
  { id: 'ext-front-left', group: 'exterior', label: 'Front left ¾', labelFr: 'Avant gauche ¾', needsCutout: true, guide: 'front34l' },

  // Wheels ×4
  { id: 'wheel-fl', group: 'wheels', label: 'Front-left wheel', labelFr: 'Pneu avant gauche', needsCutout: false, guide: 'wheel' },
  { id: 'wheel-fr', group: 'wheels', label: 'Front-right wheel', labelFr: 'Pneu avant droit', needsCutout: false, guide: 'wheel' },
  { id: 'wheel-rl', group: 'wheels', label: 'Rear-left wheel', labelFr: 'Pneu arrière gauche', needsCutout: false, guide: 'wheel' },
  { id: 'wheel-rr', group: 'wheels', label: 'Rear-right wheel', labelFr: 'Pneu arrière droit', needsCutout: false, guide: 'wheel' },

  // Interior
  { id: 'int-dashboard', group: 'interior', label: 'Dashboard', labelFr: 'Tableau de bord', needsCutout: false, guide: 'interior' },
  { id: 'int-cluster', group: 'interior', label: 'Instrument cluster', labelFr: 'Compteur', needsCutout: false, guide: 'detail' },
  { id: 'int-gear', group: 'interior', label: 'Gear shifter', labelFr: 'Boîte de vitesse', needsCutout: false, guide: 'detail' },
  { id: 'int-seats-front', group: 'interior', label: 'Front seats', labelFr: 'Sièges avant', needsCutout: false, guide: 'interior' },
  { id: 'int-seats-rear', group: 'interior', label: 'Rear seats', labelFr: 'Sièges arrière', needsCutout: false, guide: 'interior' },
  { id: 'int-boot', group: 'interior', label: 'Boot / trunk', labelFr: 'Coffre', needsCutout: false, guide: 'interior' },
  { id: 'int-infotainment', group: 'interior', label: 'Infotainment', labelFr: 'Écran multimédia', needsCutout: false, guide: 'detail' },
  { id: 'int-odometer', group: 'interior', label: 'Odometer', labelFr: 'Kilométrage', needsCutout: false, guide: 'detail' },

  // Documents & identity
  { id: 'doc-vin', group: 'docs', label: 'VIN plate', labelFr: 'Numéro de série (VIN)', needsCutout: false, guide: 'detail' },
  { id: 'doc-registration', group: 'docs', label: 'Registration', labelFr: 'Carte grise', needsCutout: false, guide: 'detail' },
  { id: 'doc-keys', group: 'docs', label: 'Keys', labelFr: 'Clés', needsCutout: false, guide: 'detail' },

  // Engine (photo + engine sound)
  { id: 'engine', group: 'engine', label: 'Engine bay', labelFr: 'Moteur', needsCutout: false, guide: 'engine', audio: true },
];

export const TEMPLATE_INDEX: Record<string, number> = Object.fromEntries(
  SHOT_TEMPLATE.map((s, i) => [s.id, i])
);

export function getSlot(id: string): ShotSlot | undefined {
  return SHOT_TEMPLATE.find((s) => s.id === id);
}

export function slotPosition(id: string): number {
  return TEMPLATE_INDEX[id] ?? 0;
}
