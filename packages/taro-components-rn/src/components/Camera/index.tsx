import {
  Camera,
  CameraView,
  type BarcodeScanningResult,
  type CameraMountError,
  type CameraType,
} from 'expo-camera'
import React, { Component } from 'react'

import Text from '../Text'
import View from '../View'
import { CameraProps, CameraState } from './PropsType'
import styles from './styles'

export class _Camera extends Component<CameraProps, CameraState> {
  constructor(props: CameraProps) {
    super(props)
    this.state = {
      hasPermission: null,
    }
  }

  expoCameraRef = React.createRef<CameraView>()

  async componentDidMount(): Promise<void> {
    const permission = await Camera.requestCameraPermissionsAsync()
    this.setState({
      hasPermission: permission.granted,
    })
  }

  onError = (event: CameraMountError): void => {
    this.props.onError && this.props.onError(event as any)
  }

  onInitDone = (): void => {
    global._taroCamera = this.expoCameraRef?.current
    const event: any = {}
    this.props.onInitDone && this.props.onInitDone(event)
  }

  onScanCode = (event: BarcodeScanningResult): void => {
    const { data } = event
    this.props.onScanCode &&
      this.props.onScanCode({
        detail: {
          result: data,
        },
        ...event,
      } as any)
  }

  render(): React.ReactNode {
    const { hasPermission } = this.state
    const { devicePosition, style, mode, flash } = this.props
    const facing: CameraType = devicePosition === 'back' ? 'back' : 'front'

    if (hasPermission === null) {
      return <View />
    }
    if (hasPermission === false) {
      return <Text>No access to camera</Text>
    }

    const barcodeScannerSettings =
      mode === 'scanCode'
        ? {
          barcodeScannerSettings: {
            barcodeTypes: ['qr' as const],
          },
          onBarcodeScanned: this.onScanCode,
        }
        : {}

    return (
      <CameraView
        ref={this.expoCameraRef}
        facing={facing}
        flash={flash}
        onMountError={this.onError}
        onCameraReady={this.onInitDone}
        {...barcodeScannerSettings}
        style={[styles.camera, style]}
      />
    )
  }
}

export default _Camera
