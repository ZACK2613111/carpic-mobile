# Plan 10 jours — CarStudio (objectif : app solide pour lancement septembre, Algérie)

> **Instructions pour la session Claude quotidienne**
> 1. Lis ce fichier en entier, puis `CLAUDE.md` et `docs/ROADMAP.md`.
> 2. Prends le **premier jour non coché** ci-dessous. Ne saute pas de jour sans raison écrite ici.
> 3. Chaque jour a des **critères d'acceptation** : le jour n'est coché que quand ils passent tous,
>    typecheck (`npx tsc --noEmit`) + lint (`npx eslint src plugins --max-warnings 0`) + tests (`npx jest`) verts inclus.
> 4. En fin de session : coche le jour, note en une ligne ce qui reste/a dévié (section *Journal* en bas),
>    et propose un commit à l'utilisateur (ne pas commiter sans son accord).
> 5. Si un jour est trop gros pour une session, découpe-le, note le reste dans le Journal, et continue le lendemain.
> 6. Les tâches marquées **[TOI]** demandent une action manuelle de l'utilisateur (comptes, dashboard Supabase,
>    téléphone) — Claude prépare tout, guide pas à pas, et vérifie le résultat.

**Contexte marché (ne pas oublier) :** lancement en Algérie → devices Android bas de gamme (1–2 Go RAM),
réseau 3G instable, data mobile chère, distribution APK directe probable (hors Play Store). Chaque décision
technique se juge à l'aune de : *mémoire, poids, data, offline*.

---

## ☐ Jour 1 — Faire tourner l'app pour la première fois (setup complet)

L'app n'a **jamais été exécutée**. Objectif du jour : CarStudio installé et fonctionnel sur un vrai téléphone Android.
Suivre `docs/GETTING_STARTED.md` — Claude guide et vérifie chaque étape.

- **[TOI]** Créer le projet Supabase (§2 du guide) : compte → New project → exécuter `supabase/schema.sql`,
  `schema_v2.sql`, `schema_v3.sql` dans l'ordre → uploader `web/viewer.html` à la racine du bucket `viewer`
  → désactiver "Confirm email" → récupérer Project URL + publishable key.
- **[TOI]** Créer `.env` (copier `.env.example`) et coller les deux clés.
- **[TOI]** Compte Expo + `npm i -g eas-cli` + `eas login`.
- Claude : `npm install`, `npx expo-doctor`, `npx tsc --noEmit` — tout doit être vert avant de builder.
- **[TOI]** `eas build --profile development --platform android` (~15 min cloud) → installer l'APK sur le téléphone.
- **[TOI]** `npx expo start --dev-client` → ouvrir l'app → créer un compte → **parcours complet** (§7 du guide) :
  créer une voiture → capture guidée → cut out → fond → hotspots → 360 → publish → ouvrir le lien web.
- Claude : recueillir TOUS les problèmes rencontrés (crash, détourage raté, lenteur) et les noter dans le Journal —
  c'est la matière première des jours suivants.

**Acceptation :** l'app tourne sur téléphone, un projet complet a été créé et publié, le lien web s'ouvre.
**⚠️ Point de vigilance :** premier build avec R8 activé (minification) — si le détourage ou la caméra casse
en build, vérifier les règles ProGuard dans `app.json` (`expo-build-properties`).

---

## ☐ Jour 2 — Offline-first 1/3 : file d'upload persistée (outbox)

Aujourd'hui un upload raté = travail perdu. Construire la brique centrale de l'offline.

- Créer `src/lib/uploadQueue.ts` : file persistée (AsyncStorage) d'items `{ id, kind, projectId, localUri, remotePath, contentType, attempts, createdAt }`.
  - `enqueue()` copie d'abord le fichier local dans `FileSystem.documentDirectory + 'outbox/'` (les URIs du cache caméra sont volatiles).
  - Boucle de drain : backoff exponentiel + jitter, une seule boucle globale, déclenchée au lancement, à la reconnexion et après chaque `enqueue`.
  - Supprimer le fichier outbox local après upload réussi ; garder + re-tenter sinon (cap de tentatives élevé, jamais de perte silencieuse).
- Brancher `@react-native-community/netinfo` (à installer, nécessite un **rebuild dev**) : `onlineManager.setEventListener`
  de React Query + trigger du drain de la queue.
- Intégrer dans la capture guidée (`src/app/capture/[id].tsx`) : `onUse` → enqueue + `upsertShot` optimiste local →
  avancer immédiatement, même sans réseau. L'écran projet montre un badge "en attente d'envoi" sur les shots non synchronisés.
- Tests unitaires de la queue (persistance, retry, drain, dédup).

**Acceptation :** mode avion pendant la capture guidée → toutes les photos passent, badge "pending" visible,
retour du réseau → tout s'uploade seul. Tests queue verts.

---

## ☐ Jour 3 — Offline-first 2/3 : spin 360 fiable

Le pire scénario actuel : coupure à la frame 12/24 → photos perdues + `frameCount` menteur → viewer avec images cassées.

- `src/app/capture/spin/[id].tsx` : passer les frames par la queue du Jour 2 (copie locale immédiate → plus de perte possible).
- `saveSpin` avec le **frameCount réel confirmé** ; stocker aussi l'état par frame si besoin (`uploaded: boolean[]` dans le doc spin ou déduit de la queue).
- Écran spin (`src/app/spin/[id].tsx`) : si des frames manquent → bandeau "X frames en attente/échouées" + bouton re-tenter (relance le drain).
- Cutout 360 : reprendre uniquement les frames sans cutout au retry (aujourd'hui on refait tout).
- `getSpinFrameUrls` : ne pas signer des chemins inexistants (vérifier contre l'état d'upload).

**Acceptation :** capture 360 en coupant le réseau à mi-parcours → aucune frame perdue, l'app affiche l'état
réel, reconnexion → spin complet et viewer sans image cassée.

---

## ☐ Jour 4 — Offline-first 3/3 : édition qui ne perd jamais rien

- Extraire `useDebouncedAutosave` (`src/lib/` ) : debounce + retry backoff + statut `saving/saved/failed` + **flush au blur/`beforeRemove`**
  (aujourd'hui quitter l'écran avant le debounce = perte). Brancher l'éditeur ET l'écran spin dessus (l'éditeur a déjà retry, le spin n'a rien).
- Persister `editorStore` (zustand `persist`, AsyncStorage) : app tuée en pleine édition → les hotspots survivent.
- Garder les originaux/cutouts en local (`documentDirectory`) au moment de la capture/cutout et hydrater l'éditeur
  **local d'abord**, URL signée en secours → éditer un shot ne re-télécharge plus l'image, et marche offline.
- `AuthProvider` : ne pas wiper le cache sur un échec de refresh token transitoire (distinguer révocation réelle de panne réseau).

**Acceptation :** éditer des hotspots en mode avion → tuer l'app → rouvrir : rien n'est perdu, tout se synchronise au retour du réseau.

---

## ☐ Jour 5 — Qualité studio : ombre synthétique + bords du masque

C'est ce qui fait passer un rendu de "collé" à "pro" — la différence visible avec CarCutter.

- `StudioCanvas.tsx` : ombre portée synthétique sous la voiture quand un cutout est affiché — ellipse floutée
  (Skia `Blur` + `Oval`) ancrée au bas du bounding box non-transparent du cutout, intensité/offset paramétrés par fond.
- Feathering léger des bords du cutout (Skia : léger blur du canal alpha à la frontière) pour casser l'effet "découpé aux ciseaux".
- Appliquer aussi au 360 (le viewer natif + le rendu à l'export) et au viewer web publié (ombre CSS sous l'image, plus simple).
- Toggle "Ombre" dans la strip de l'éditeur (défaut : activé sur les fonds non transparents).

**Acceptation :** comparaison avant/après sur 3 vraies photos — l'ombre suit la largeur de la voiture,
pas d'artefacts sur les bords ; export et lien publié incluent l'ombre.

---

## ☐ Jour 6 — Plaque d'immatriculation : masquage v1

Demande standard du marché. V1 pragmatique (pas de modèle de détection custom) :

- Nouvel objet "plaque" dans l'éditeur : un rectangle draggable/redimensionnable (coordonnées normalisées, comme les hotspots)
  rendu en flou ou en plaque brandée (logo/couleur au choix), aplati à l'export via Skia.
- Auto-suggestion best-effort : ML Kit Text Recognition (via une lib RN existante, ou heuristique sur le cutout)
  pour pré-positionner le rectangle sur la zone de texte la plus "plaque-like" (ratio ~4.5:1, moitié basse de l'image).
  Si rien trouvé → l'utilisateur pose le rectangle à la main. Ne PAS sur-investir la détection auto aujourd'hui.
- Persistance dans `doc` (comme les hotspots), rendu dans le viewer web publié.

**Acceptation :** poser/déplacer/styler un cache-plaque dans l'éditeur, il apparaît dans l'export ET le lien publié.

---

## ☐ Jour 7 — Architecture + fluidité gestes

Refactor pour que tout le reste aille plus vite (l'éditeur fait 641 lignes) + perf sur bas de gamme.

- Découper `editor/[id].tsx` en hooks : `useCanvasGestures` (toNorm, findHit, 4 gestures, zoom), `useShotHydration`,
  `useCanvasExport`, `useCoachMarks` — cible ~150 lignes de composition.
- Unifier le spin sur le store : `editorStore` générique (factory) ou `spinStore` sur les mêmes primitives →
  undo/redo aussi sur le spin, suppression du modèle dupliqué en `useState`.
- Créer `features/spin/useSpin.ts` (`spinKeys`, `useSpinFrames`, `useSaveSpin`) — plus de queries inline dans l'écran.
- Gestes : drag des pins et rotation 360 via `useSharedValue` Reanimated (commit au store en fin de geste seulement) —
  supprime les re-renders JS par frame de drag.
- `hotspotGeometry.ts` partagé (hit-test + numérotation), constantes uniques.
- Étendre les tests (store générique, autosave, géométrie).

**Acceptation :** typecheck/lint/tests verts, aucun changement de comportement visible, drag fluide sur device réel,
undo/redo fonctionne sur le spin.

---

## ☐ Jour 8 — Capture à distance 1/2 : backend + liens

**La** feature différenciante : envoyer un lien au propriétaire du véhicule pour qu'il prenne les photos
lui-même (quand on n'a pas encore le véhicule). V1 = page web mobile, zéro app à installer.

- SQL `supabase/schema_v4.sql` : table `capture_links` (`id`, `project_id`, `token` aléatoire, `expires_at`,
  `used_at`, RLS : le propriétaire gère ses liens) + policy Storage permettant l'upload **anonyme scoped par token**
  → passer par une **Edge Function** Supabase `capture-upload` qui valide le token et écrit dans
  `projects/{uid}/{projectId}/shots/...` (le client anonyme n'écrit jamais directement).
- App : bouton "Demander les photos" sur le dashboard projet → crée le lien → share sheet (WhatsApp est roi en Algérie).
- Edge Function `capture-manifest` : renvoie au navigateur la liste des slots du template (labels FR + guides) pour le token donné.
- Révocation + expiration (7 jours par défaut).

**Acceptation :** un lien créé depuis l'app, testable via `curl`/navigateur : le token valide liste les slots,
un upload test atterrit dans le bon dossier du bucket, token expiré → 403.

---

## ☐ Jour 9 — Capture à distance 2/2 : page web de capture

- `web/capture.html` (même approche que `viewer.html` : un seul fichier, uploadé une fois dans le bucket `viewer`) :
  - mobile-first, FR simple, liste des photos à prendre avec silhouette/guide par slot,
  - `<input type="file" accept="image/*" capture="environment">` par slot (pas d'API caméra exotique — compat max),
  - resize côté navigateur (canvas, ~2000px) avant upload — même règle data que l'app,
  - barre de progression, reprise slot par slot, état "envoyé ✓".
- Côté app : le dashboard projet reflète les photos reçues (realtime Supabase ou refetch au focus) —
  badge "reçues via lien" ; l'utilisateur peut ensuite les traiter normalement (cutout, fonds, publish).
- Sécurité : mêmes contraintes MIME/taille que le reste, le token n'expose jamais d'autres données du projet.

**Acceptation :** scénario complet réel — envoyer le lien à un 2e téléphone, prendre 3 photos depuis le navigateur,
les voir arriver dans l'app, les détourer et publier.

---

## ☐ Jour 10 — Solidification + préparation release

- **Sentry** (`@sentry/react-native`) : crashes + temps de détourage/export par device (savoir OÙ ça casse en vrai). Rebuild dev.
- **Build preview EAS** (`eas build --profile preview -p android`) : tester le vrai APK release — R8, taille du binaire
  (viser < 60 Mo), perf sur le device le plus faible disponible.
- QA systématique : la checklist des Jours 1–9 rejouée sur build release + mode avion partout.
- Décisions produit à trancher avec l'utilisateur : i18n (FR seul ? + arabe ?), nom/icône finaux, politique de
  confidentialité (obligatoire Play Store), distribution (Play Store vs APK direct vs les deux).
- Mettre à jour `README.md`/`ROADMAP.md` ; lister le backlog d'août : mode concession (batch multi-véhicules),
  templates de fonds par marque, analytics du viewer, vidéo auto-générée, intérieur 360.

**Acceptation :** APK release installable et fluide sur device bas de gamme, Sentry reçoit les événements,
backlog d'août écrit.

---

## Journal (rempli par les sessions quotidiennes)

- 2026-07-17 — Plan créé. Lot 1 de l'audit déjà appliqué (resize avant upload, getSession, fix token ML Kit,
  R8, ErrorBoundary, prefetch paresseux, cutout tout-ou-rien, publish validé, keep-awake) — non commité.
- 2026-07-17 — **Jour 2 : code terminé** (fait avant le Jour 1 pour que le premier build embarque NetInfo).
  Livré : `src/lib/uploadQueue/` (core pur + binding AsyncStorage/FileSystem, outbox dans documentDirectory),
  `src/lib/network.ts` (NetInfo→onlineManager), `src/features/uploads/` (handler 'shot', `enqueueShotUpload`,
  `usePendingUploads`, `initUploads` appelé dans `_layout`), capture guidée offline-first (enqueue + avance
  immédiate), dashboard : tuiles avec photo locale + badge "uploading" + bannière d'attente, `openSlot` guard.
  6 tests queue (38/38 verts), typecheck/lint OK. `@react-native-community/netinfo@12.0.1` installé (natif →
  inclus dans le build du Jour 1). **Reste pour cocher le Jour 2 :** validation mode avion sur téléphone réel
  (impossible avant le Jour 1). Jour 3 peut réutiliser la queue telle quelle (kind 'spin-frame').
- 2026-07-17 — **Jour 3 : code terminé.** Frames 360 via la queue (kind 'spin-frame', dédup par frame),
  capture : `finish` n'attend plus que le stash local (rapide, marche offline), `saveSpin` best-effort avec
  convergence par `ensureSpinFrameCount` à chaque frame synchronisée (spin.api). Écran spin : frames locales
  affichées depuis l'outbox tant que non uploadées (spin visible offline), `frameCount` adopté depuis la queue
  si le save offline a échoué, bouton cutout désactivé tant que des frames sont en attente ("Uploading X frames…").
  38/38 verts. **Edge connu (noté, non traité) :** re-capturer un spin offline par-dessus un ancien spin peut
  mélanger anciennes/nouvelles frames jusqu'à la synchro — le vrai fix est un id de session de capture dans le
  chemin des frames (à considérer au Jour 7). **Reste pour cocher :** validation mode avion sur device (Jour 1),
  et "cutout ne refait que les frames manquantes au retry" (différé, optimisation).
- 2026-07-17 — **Jour 4 : cœur terminé.** `src/lib/useDebouncedAutosave.ts` (hook partagé : baseline
  d'hydratation, debounce, retry 5s, follow-up save si édits pendant le save, **flush au démontage** — quitter
  l'écran ne perd plus la dernière édition). Branché sur l'éditeur (remplace ~50 lignes de machinerie locale,
  statut UI pending/saving/failed) ET l'écran spin (qui n'avait aucun retry). AuthProvider : le cache offline
  n'est plus vidé que sur déconnexion explicite ou changement de compte (guard `LAST_USER_KEY` au SIGNED_IN) —
  plus de wipe sur pépin de refresh 3G. 38/38 verts. **Différés volontairement (à reprendre si besoin après
  tests device) :** persist zustand de l'editorStore (residuel : kill de l'app pendant la fenêtre de retry ;
  demande une logique de réconciliation DB/local à valider sur device) et hydratation locale d'abord des
  images de l'éditeur (gros gain data, à faire avec le Jour 7 ou en session dédiée). Pas de test unitaire du
  hook (nécessiterait @testing-library — à ajouter au Jour 7 avec le refactor).
- 2026-07-17 — **Jour 5 : code terminé.** `groundShadow.ts` (module pur : ellipse, défaut par fond,
  opacité 0.12→0.34 selon la luminance du sol — bug de coefficients Rec.709/601 mélangés attrapé par les
  tests et corrigé). Rendu : Skia `Oval`+`Blur` dans StudioCanvas (+ feathering des bords du cutout via
  `Group layer` + `Blur`), approximation RN dans SpinViewer, ombre CSS dans le viewer web (opacité calculée
  par le même modèle). Toggle "Shadow" dans l'éditeur ET l'écran spin (override persisté dans `doc.shadow` /
  `spin.shadow`, undo/redo-able, transporté par le manifest publié). 43/43 verts. **Décision utilisateur :
  pas de device Android disponible, émulateur écarté → la validation visuelle se fait sur une préviz web
  (viewer.html + démo) au lieu du téléphone ; l'acceptation "3 vraies photos" reste ouverte jusqu'au Jour 1.
- 2026-07-17 — **Jour 6 : code terminé.** Cache-plaque v1 : `plateMask.ts` (rectangle normalisé, défauts
  "plate-like" bas-centre, hit-test corps + poignée resize, move/resize clampés — pur, 9 tests),
  `doc.plate` (+ validation `coerceDoc`), store (setPlate/patchPlate/movePlateTo/resizePlateTo, undo/redo,
  drag = 1 étape), rendu Skia dans StudioCanvas (flou 12px via re-draw clippé de l'image, ou plaque colorée
  arrondie ; stroke + poignée quand sélectionné, masqués à l'export), gestes de l'éditeur (tap sélectionne,
  drag déplace, poignée redimensionne, priorité aux pins), chips UI "Plate mask" + row Blur/Branded/couleurs/
  suppression, manifest publié + rendu viewer web (`backdrop-filter`). 52/52 verts. Préviz web mise à jour
  (masque draggable). **Différés assumés :** auto-détection ML Kit Text Recognition (lib native → build ;
  le défaut heuristique suffit pour v1) et plaques sur les frames du spin (à évaluer après usage réel).
- 2026-07-17 — **Jour 7 : découpage architecture terminé.** Éditeur 789 → 454 lignes de composition.
  Extraits : `useCanvasGestures` (zoom + 4 gestes + hit-testing pins/plaque, tout passe par le store),
  `useShotHydration`, `useCanvasExport`, `lib/useCoachMarks` (générique), composants `NudgePad` et
  `PlateControls`, `ToggleChip` local. La sélection de plaque est montée dans le store (`plateSelected` +
  `selectPlate` — plaque et pins partagent UNE sélection, invariant testé ; `addHotspot` corrigé au passage :
  il ne libérait pas la sélection plaque). `features/spin/useSpin.ts` (spinKeys + useSpinFrames +
  invalidateSpinFrames) remplace les clés magiques inline de l'écran spin. 53/53 verts.
  **Différés avec justification :** unification du spin sur un store avec undo/redo et drag des pins en
  shared values Reanimated (commit fin de geste) — les deux changent le COMPORTEMENT tactile et ne peuvent
  pas se valider sans device ; à faire dans la foulée du Jour 1. Le découpage d'aujourd'hui les rend faciles :
  le spin pourra consommer `useCanvasGestures` presque tel quel.
