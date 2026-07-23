import React from 'react';
import { type ColorValue } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName =
  | 'back'
  | 'forward'
  | 'close'
  | 'check'
  | 'plus'
  | 'camera'
  | 'image'
  | 'scissors'
  | 'share'
  | 'download'
  | 'sliders'
  | 'trash'
  | 'sparkles'
  | 'wrench'
  | 'undo'
  | 'redo'
  | 'layers'
  | 'zoomIn'
  | 'crosshair'
  | 'user'
  | 'mail'
  | 'lock'
  | 'logout'
  | 'refresh'
  | 'up'
  | 'down'
  | 'play'
  | 'pause'
  | 'mic'
  | 'grid'
  | 'bolt';

// Feather/Tabler-style 24x24 stroke icons. Children inherit stroke/fill from the
// wrapping <G>, so definitions stay color-agnostic.
const ICONS: Record<IconName, React.ReactNode> = {
  back: <Path d="M15 18l-6-6 6-6" />,
  forward: <Path d="M9 18l6-6-6-6" />,
  close: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="M6 6l12 12" />
    </>
  ),
  check: <Path d="M20 6 9 17l-5-5" />,
  plus: (
    <>
      <Path d="M12 5v14" />
      <Path d="M5 12h14" />
    </>
  ),
  camera: (
    <>
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx={12} cy={13} r={4} />
    </>
  ),
  image: (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Circle cx={8.5} cy={8.5} r={1.5} />
      <Path d="M21 15l-5-5L5 21" />
    </>
  ),
  scissors: (
    <>
      <Circle cx={6} cy={6} r={3} />
      <Circle cx={6} cy={18} r={3} />
      <Path d="M20 4 8.12 15.88" />
      <Path d="M14.47 14.48 20 20" />
      <Path d="M8.12 8.12 12 12" />
    </>
  ),
  share: (
    <>
      <Circle cx={18} cy={5} r={3} />
      <Circle cx={6} cy={12} r={3} />
      <Circle cx={18} cy={19} r={3} />
      <Path d="M8.59 13.51l6.83 3.98" />
      <Path d="M15.41 6.51l-6.82 3.98" />
    </>
  ),
  download: (
    <>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Path d="M7 10l5 5 5-5" />
      <Path d="M12 15V3" />
    </>
  ),
  sliders: (
    <>
      <Path d="M4 21v-7" />
      <Path d="M4 10V3" />
      <Path d="M12 21v-9" />
      <Path d="M12 8V3" />
      <Path d="M20 21v-5" />
      <Path d="M20 12V3" />
      <Path d="M1 14h6" />
      <Path d="M9 8h6" />
      <Path d="M17 16h6" />
    </>
  ),
  trash: (
    <>
      <Path d="M3 6h18" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
    </>
  ),
  sparkles: (
    <Path d="M12 3l2.09 5.26L19.5 9.5l-4.5 3.32L16.18 19 12 15.9 7.82 19l1.18-6.18L4.5 9.5l5.41-1.24z" />
  ),
  wrench: (
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  undo: (
    <>
      <Path d="M1 4v6h6" />
      <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </>
  ),
  redo: (
    <>
      <Path d="M23 4v6h-6" />
      <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </>
  ),
  layers: (
    <>
      <Path d="M12 2 2 7l10 5 10-5z" />
      <Path d="M2 17l10 5 10-5" />
      <Path d="M2 12l10 5 10-5" />
    </>
  ),
  zoomIn: (
    <>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M21 21l-4.35-4.35" />
      <Path d="M11 8v6" />
      <Path d="M8 11h6" />
    </>
  ),
  crosshair: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M22 12h-4" />
      <Path d="M6 12H2" />
      <Path d="M12 6V2" />
      <Path d="M12 22v-4" />
    </>
  ),
  user: (
    <>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </>
  ),
  mail: (
    <>
      <Path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <Path d="M22 6l-10 7L2 6" />
    </>
  ),
  lock: (
    <>
      <Rect x={3} y={11} width={18} height={11} rx={2} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  logout: (
    <>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </>
  ),
  refresh: (
    <>
      <Path d="M23 4v6h-6" />
      <Path d="M1 20v-6h6" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  up: <Path d="M18 15l-6-6-6 6" />,
  down: <Path d="M6 9l6 6 6-6" />,
  play: <Path d="M7 5l12 7-12 7z" />,
  pause: (
    <>
      <Path d="M9 5v14" />
      <Path d="M15 5v14" />
    </>
  ),
  mic: (
    <>
      <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <Path d="M12 19v4" />
      <Path d="M8 23h8" />
    </>
  ),
  grid: (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Path d="M9 3v18" />
      <Path d="M15 3v18" />
      <Path d="M3 9h18" />
      <Path d="M3 15h18" />
    </>
  ),
  bolt: <Path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
};

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
};

export function Icon({ name, size = 24, color = colors.text, strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </G>
    </Svg>
  );
}
