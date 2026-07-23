import React from 'react';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

// Transparency indicator rendered BEHIND the (transparent) Skia canvas. A single
// SVG <Pattern> node — far cheaper than tiling hundreds of Views — and it is never
// part of the exported PNG (the Skia canvas itself stays transparent).
const T = 20;
// Light-theme transparency checker: near-white squares on white, so "transparent"
// reads as a soft grid — not the heavy mid-grey left over from the dark theme.
const LIGHT = '#FFFFFF';
const DARK = '#E6E9F0';

export function Checkerboard({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height}>
      <Defs>
        <Pattern id="checker" width={T * 2} height={T * 2} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={T * 2} height={T * 2} fill={LIGHT} />
          <Rect x={0} y={0} width={T} height={T} fill={DARK} />
          <Rect x={T} y={T} width={T} height={T} fill={DARK} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#checker)" />
    </Svg>
  );
}
