import Svg, { Path } from 'react-native-svg';

/**
 * The Face ID mark: a bracketed frame around two eyes, a nose, and a smile.
 *
 * Drawn rather than taken from the icon set, which only offers a generic scan
 * frame with no face inside it. `color` is required because this renders both
 * on the login panel's fixed light surface and on themed surfaces, and there is
 * no `currentColor` to inherit from.
 */
export function FaceIdIcon({ size = 24, color, strokeWidth = 1.8 }: {
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 8.6V6.2A3.2 3.2 0 0 1 6.2 3h2.4" {...stroke} />
      <Path d="M15.4 3h2.4A3.2 3.2 0 0 1 21 6.2v2.4" {...stroke} />
      <Path d="M21 15.4v2.4A3.2 3.2 0 0 1 17.8 21h-2.4" {...stroke} />
      <Path d="M8.6 21H6.2A3.2 3.2 0 0 1 3 17.8v-2.4" {...stroke} />
      <Path d="M8.7 9.4v1.5" {...stroke} />
      <Path d="M15.3 9.4v1.5" {...stroke} />
      <Path d="M12 9.4v3.8h-1.3" {...stroke} />
      <Path d="M8.9 16c1.7 1.5 4.5 1.5 6.2 0" {...stroke} />
    </Svg>
  );
}
