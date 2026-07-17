// Shared helpers for the remote-capture Edge Functions.
// NOTE: the slot list mirrors src/features/capture/shotTemplate.ts — keep the
// ids/sections/positions in sync when the template changes.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type CaptureSlot = {
  id: string;
  section: string;
  position: number;
  label: string;
  labelFr: string;
  guide: string;
};

export const CAPTURE_SLOTS: CaptureSlot[] = [
  { id: 'ext-front', section: 'exterior', position: 0, label: 'Front', labelFr: 'Avant', guide: 'front' },
  { id: 'ext-front-right', section: 'exterior', position: 1, label: 'Front right ¾', labelFr: 'Avant droit ¾', guide: 'front34r' },
  { id: 'ext-right', section: 'exterior', position: 2, label: 'Right side', labelFr: 'Côté droit', guide: 'sideR' },
  { id: 'ext-rear-right', section: 'exterior', position: 3, label: 'Rear right ¾', labelFr: 'Arrière droit ¾', guide: 'rear34r' },
  { id: 'ext-rear', section: 'exterior', position: 4, label: 'Rear', labelFr: 'Arrière', guide: 'rear' },
  { id: 'ext-rear-left', section: 'exterior', position: 5, label: 'Rear left ¾', labelFr: 'Arrière gauche ¾', guide: 'rear34l' },
  { id: 'ext-left', section: 'exterior', position: 6, label: 'Left side', labelFr: 'Côté gauche', guide: 'sideL' },
  { id: 'ext-front-left', section: 'exterior', position: 7, label: 'Front left ¾', labelFr: 'Avant gauche ¾', guide: 'front34l' },
  { id: 'wheel-fl', section: 'wheels', position: 8, label: 'Front-left wheel', labelFr: 'Pneu avant gauche', guide: 'wheel' },
  { id: 'wheel-fr', section: 'wheels', position: 9, label: 'Front-right wheel', labelFr: 'Pneu avant droit', guide: 'wheel' },
  { id: 'wheel-rl', section: 'wheels', position: 10, label: 'Rear-left wheel', labelFr: 'Pneu arrière gauche', guide: 'wheel' },
  { id: 'wheel-rr', section: 'wheels', position: 11, label: 'Rear-right wheel', labelFr: 'Pneu arrière droit', guide: 'wheel' },
  { id: 'int-dashboard', section: 'interior', position: 12, label: 'Dashboard', labelFr: 'Tableau de bord', guide: 'interior' },
  { id: 'int-cluster', section: 'interior', position: 13, label: 'Instrument cluster', labelFr: 'Compteur', guide: 'detail' },
  { id: 'int-gear', section: 'interior', position: 14, label: 'Gear shifter', labelFr: 'Boîte de vitesse', guide: 'detail' },
  { id: 'int-seats-front', section: 'interior', position: 15, label: 'Front seats', labelFr: 'Sièges avant', guide: 'interior' },
  { id: 'int-seats-rear', section: 'interior', position: 16, label: 'Rear seats', labelFr: 'Sièges arrière', guide: 'interior' },
  { id: 'int-boot', section: 'interior', position: 17, label: 'Boot / trunk', labelFr: 'Coffre', guide: 'interior' },
  { id: 'int-infotainment', section: 'interior', position: 18, label: 'Infotainment', labelFr: 'Écran multimédia', guide: 'detail' },
  { id: 'int-odometer', section: 'interior', position: 19, label: 'Odometer', labelFr: 'Kilométrage', guide: 'detail' },
  { id: 'doc-vin', section: 'docs', position: 20, label: 'VIN plate', labelFr: 'Numéro de série (VIN)', guide: 'detail' },
  { id: 'doc-registration', section: 'docs', position: 21, label: 'Registration', labelFr: 'Carte grise', guide: 'detail' },
  { id: 'doc-keys', section: 'docs', position: 22, label: 'Keys', labelFr: 'Clés', guide: 'detail' },
  { id: 'engine', section: 'engine', position: 23, label: 'Engine bay', labelFr: 'Moteur', guide: 'engine' },
];

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

export type CaptureLinkRow = {
  id: string;
  project_id: string;
  user_id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
};

/** Look up a token and enforce expiry/revocation. Returns null when invalid. */
export async function validCaptureLink(
  supabase: SupabaseClient,
  token: string
): Promise<CaptureLinkRow | null> {
  const { data } = await supabase
    .from('capture_links')
    .select('id, project_id, user_id, token, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (!data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as CaptureLinkRow;
}
