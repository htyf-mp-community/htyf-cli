import React from 'react'
import { StyleProp, StyleSheet, TouchableWithoutFeedback, View, ViewStyle } from 'react-native'

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    zIndex: 1000
  }
})

interface MaskProps {
  transparent?: boolean
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
  onPress?: () => void
}

const Mask: React.FC<MaskProps> = ({ transparent = false, style, onPress, children }) =>
  <TouchableWithoutFeedback onPress={onPress}>
    <View
      accessibilityLabel='mask'
      style={[styles.mask, { backgroundColor: transparent ? 'transparent' : 'rgba(0,0,0,.6)' }, style]}
    >
      <TouchableWithoutFeedback>{children}</TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>

export { Mask }
