import * as React from 'react'
import { Animated, StyleProp, StyleSheet, TextStyle } from 'react-native'

export interface BadgeProps {
  visible: boolean
  children?: string | number
  size?: number
  style?: Animated.WithAnimatedValue<StyleProp<TextStyle>>
}

export interface BadgeState {
  opacity: Animated.Value
  visible: boolean
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    textAlign: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden'
  }
})

const Badge = React.memo(function Badge ({ style, size = 18, children, visible }: BadgeProps) {
  const [opacity] = React.useState(() => new Animated.Value(visible ? 1 : 0))
  const scale = React.useMemo(() => opacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1]
  }), [opacity])

  React.useEffect(() => {
    const animation = Animated.spring(opacity, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true
    })
    animation.start()
    return () => animation.stop()
  }, [opacity, visible])

  const textColor = 'white'

  const borderRadius = size / 2
  const fontSize = Math.floor((size * 3) / 4)

  return (!visible ? null
    : (
      <Animated.Text
        numberOfLines={1}
        style={[
          {
            opacity,
            transform: [
              {
                scale
              }
            ],
            backgroundColor: '#FA5151',
            color: textColor,
            fontSize,
            lineHeight: size - 1,
            height: size,
            minWidth: size,
            borderRadius
          },
          styles.container,
          style
        ]}
      >
        {children}
      </Animated.Text>)
  )
})

export default Badge
