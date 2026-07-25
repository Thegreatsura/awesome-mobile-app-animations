import Svg, { Path } from 'react-native-svg';

const GooglePhotosLogo = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 1000 1000">
    <Path d="M8 500 A250 250 0 0 1 508 500 Z" fill="#FBBC04" />
    <Path d="M500 8 A250 250 0 0 1 500 508 Z" fill="#EA4335" />
    <Path d="M492 500 A250 250 0 0 0 992 500 Z" fill="#4285F4" />
    <Path d="M500 492 A250 250 0 0 0 500 992 Z" fill="#34A853" />
  </Svg>
);

export default GooglePhotosLogo;
