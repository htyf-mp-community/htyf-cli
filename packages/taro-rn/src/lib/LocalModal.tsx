import React, { useEffect, useRef } from 'react'
import { BackHandler, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000
  },
  visible: {
    display: 'flex'
  },
  hidden: {
    display: 'none'
  }
})

interface LocalModalProps {
  visible?: boolean
  transparent?: boolean
  onShow?: () => void
  onRequestClose?: () => void
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

const LocalModal: React.FC<LocalModalProps> = ({
  visible = false,
  transparent = false,
  onShow,
  onRequestClose,
  style,
  children
}) => {
  const prevVisible = useRef(visible)

  useEffect(() => {
    if (visible && !prevVisible.current) {
      onShow?.()
    }
    prevVisible.current = visible
  }, [visible, onShow])

  useEffect(() => {
    if (!visible || !onRequestClose) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose()
      return true
    })
    return () => subscription.remove()
  }, [visible, onRequestClose])

  return (
    <View
      style={[
        styles.modal,
        { backgroundColor: transparent ? 'red' : '#ffffff' },
        visible ? styles.visible : styles.hidden,
        style
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {children}
    </View>
  )
}

export { LocalModal }
