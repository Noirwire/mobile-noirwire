import "react-native-svg";

/**
 * Icons are imported one file at a time (`phosphor-react-native/src/icons/<Name>`)
 * so the bundle carries only the ones used, which makes the type checker read
 * the icon package's source. That source passes `className` to an Svg, a prop
 * react-native-svg accepts on web but does not declare.
 */
declare module "react-native-svg" {
  interface SvgProps {
    className?: string;
  }
}
