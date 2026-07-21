// The default dealership shot list. Data-defined so the guided capture, the
// project dashboard, and the publish manifest all share one source of truth.
import type { Locale } from '@/lib/i18n';

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

export type Trilingual = { label: string; labelFr: string; labelAr: string };

export type ShotSlot = Trilingual & {
  id: string;
  group: ShotGroup;
  needsCutout: boolean;
  guide: GuideId;
  audio?: boolean;
};

/** Pick the label for the active locale (English is the fallback). */
export function localizedLabel(entry: Trilingual, locale: Locale): string {
  return locale === 'ar' ? entry.labelAr : locale === 'fr' ? entry.labelFr : entry.label;
}

export const GROUP_ORDER: ShotGroup[] = ['exterior', 'wheels', 'interior', 'docs', 'engine'];

export const GROUP_LABELS: Record<ShotGroup, Trilingual> = {
  exterior: { label: 'Exterior', labelFr: 'Extérieur', labelAr: 'الخارج' },
  wheels: { label: 'Wheels', labelFr: 'Pneus', labelAr: 'الإطارات' },
  interior: { label: 'Interior', labelFr: 'Intérieur', labelAr: 'الداخل' },
  docs: { label: 'Documents', labelFr: 'Documents', labelAr: 'الوثائق' },
  engine: { label: 'Engine', labelFr: 'Moteur', labelAr: 'المحرك' },
};

export const SHOT_TEMPLATE: ShotSlot[] = [
  // Exterior — the 8-angle walk-around (cut out for clean backgrounds)
  { id: 'ext-front', group: 'exterior', label: 'Front', labelFr: 'Avant', labelAr: 'الأمام', needsCutout: true, guide: 'front' },
  { id: 'ext-front-right', group: 'exterior', label: 'Front right ¾', labelFr: 'Avant droit ¾', labelAr: 'أمامي يمين ¾', needsCutout: true, guide: 'front34r' },
  { id: 'ext-right', group: 'exterior', label: 'Right side', labelFr: 'Côté droit', labelAr: 'الجانب الأيمن', needsCutout: true, guide: 'sideR' },
  { id: 'ext-rear-right', group: 'exterior', label: 'Rear right ¾', labelFr: 'Arrière droit ¾', labelAr: 'خلفي يمين ¾', needsCutout: true, guide: 'rear34r' },
  { id: 'ext-rear', group: 'exterior', label: 'Rear', labelFr: 'Arrière', labelAr: 'الخلف', needsCutout: true, guide: 'rear' },
  { id: 'ext-rear-left', group: 'exterior', label: 'Rear left ¾', labelFr: 'Arrière gauche ¾', labelAr: 'خلفي يسار ¾', needsCutout: true, guide: 'rear34l' },
  { id: 'ext-left', group: 'exterior', label: 'Left side', labelFr: 'Côté gauche', labelAr: 'الجانب الأيسر', needsCutout: true, guide: 'sideL' },
  { id: 'ext-front-left', group: 'exterior', label: 'Front left ¾', labelFr: 'Avant gauche ¾', labelAr: 'أمامي يسار ¾', needsCutout: true, guide: 'front34l' },

  // Wheels ×4
  { id: 'wheel-fl', group: 'wheels', label: 'Front-left wheel', labelFr: 'Pneu avant gauche', labelAr: 'العجلة الأمامية اليسرى', needsCutout: false, guide: 'wheel' },
  { id: 'wheel-fr', group: 'wheels', label: 'Front-right wheel', labelFr: 'Pneu avant droit', labelAr: 'العجلة الأمامية اليمنى', needsCutout: false, guide: 'wheel' },
  { id: 'wheel-rl', group: 'wheels', label: 'Rear-left wheel', labelFr: 'Pneu arrière gauche', labelAr: 'العجلة الخلفية اليسرى', needsCutout: false, guide: 'wheel' },
  { id: 'wheel-rr', group: 'wheels', label: 'Rear-right wheel', labelFr: 'Pneu arrière droit', labelAr: 'العجلة الخلفية اليمنى', needsCutout: false, guide: 'wheel' },

  // Interior
  { id: 'int-dashboard', group: 'interior', label: 'Dashboard', labelFr: 'Tableau de bord', labelAr: 'لوحة القيادة', needsCutout: false, guide: 'interior' },
  { id: 'int-cluster', group: 'interior', label: 'Instrument cluster', labelFr: 'Compteur', labelAr: 'لوحة العدادات', needsCutout: false, guide: 'detail' },
  { id: 'int-gear', group: 'interior', label: 'Gear shifter', labelFr: 'Boîte de vitesse', labelAr: 'ناقل الحركة', needsCutout: false, guide: 'detail' },
  { id: 'int-seats-front', group: 'interior', label: 'Front seats', labelFr: 'Sièges avant', labelAr: 'المقاعد الأمامية', needsCutout: false, guide: 'interior' },
  { id: 'int-seats-rear', group: 'interior', label: 'Rear seats', labelFr: 'Sièges arrière', labelAr: 'المقاعد الخلفية', needsCutout: false, guide: 'interior' },
  { id: 'int-boot', group: 'interior', label: 'Boot / trunk', labelFr: 'Coffre', labelAr: 'صندوق الأمتعة', needsCutout: false, guide: 'interior' },
  { id: 'int-infotainment', group: 'interior', label: 'Infotainment', labelFr: 'Écran multimédia', labelAr: 'شاشة الوسائط', needsCutout: false, guide: 'detail' },
  { id: 'int-odometer', group: 'interior', label: 'Odometer', labelFr: 'Kilométrage', labelAr: 'عدّاد المسافات', needsCutout: false, guide: 'detail' },

  // Documents & identity
  { id: 'doc-vin', group: 'docs', label: 'VIN plate', labelFr: 'Numéro de série (VIN)', labelAr: 'رقم الهيكل (VIN)', needsCutout: false, guide: 'detail' },
  { id: 'doc-registration', group: 'docs', label: 'Registration', labelFr: 'Carte grise', labelAr: 'بطاقة التسجيل', needsCutout: false, guide: 'detail' },
  { id: 'doc-keys', group: 'docs', label: 'Keys', labelFr: 'Clés', labelAr: 'المفاتيح', needsCutout: false, guide: 'detail' },

  // Engine (photo + engine sound)
  { id: 'engine', group: 'engine', label: 'Engine bay', labelFr: 'Moteur', labelAr: 'حجرة المحرك', needsCutout: false, guide: 'engine', audio: true },
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
