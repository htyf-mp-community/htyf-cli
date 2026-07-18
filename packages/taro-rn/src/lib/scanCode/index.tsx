import {
  Camera,
  // @ts-ignore
  CameraView,
  // @ts-ignore
  type BarcodeScanningResult,
  // @ts-ignore
  type BarcodeType,
  PermissionStatus,
  // @ts-ignore
  scanFromURLAsync
} from 'expo-camera'
import React from 'react'
import { BackHandler, Dimensions, Image, NativeEventSubscription, Platform, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native'
import RootSiblings from 'react-native-root-siblings'
import { initialWindowMetrics } from 'react-native-safe-area-context'

import { chooseMedia, MEDIA_TYPE } from '../media'
import iconClose from './icon_close.png'
import iconPic from './icon_pic.png'

export let scannerView: RootSiblings | undefined

const codeMap: Record<BarcodeType, keyof Taro.scanCode.QRType> = {
  aztec: 'AZTEC',
  codabar: 'CODABAR',
  code39: 'CODE_39',
  code93: 'CODE_93',
  code128: 'CODE_128',
  datamatrix: 'DATA_MATRIX',
  ean13: 'EAN_13',
  ean8: 'EAN_8',
  itf14: 'ITF',
  pdf417: 'PDF_417',
  upc_a: 'UPC_A',
  upc_e: 'UPC_E',
  qr: 'QR_CODE'
}

const typeMap: Record<string, BarcodeType[]> = {
  barCode: ['aztec', 'codabar', 'code39', 'code93', 'code128', 'ean13', 'ean8', 'itf14', 'upc_a', 'upc_e'],
  qrCode: ['qr'],
  datamatrix: ['datamatrix'],
  pdf417: ['pdf417']
}

const { width, height } = Dimensions.get('screen')

function getBarCodeTypes (types: string[]): BarcodeType[] {
  const result: BarcodeType[] = []

  for (const t of types) {
    result.push(...(typeMap[t] ?? []))
  }

  return [...new Set(result)]
}

function formatCodeType (type: string): keyof Taro.scanCode.QRType {
  return codeMap[type as BarcodeType] ?? 'QR_CODE'
}

function safeViewWrapper (element: React.ReactNode) {
  if (Platform.OS === 'ios') {
    return <View style={{
      paddingTop: Math.max(initialWindowMetrics?.insets.top || 0, 20),
    }}>{element}</View>
  }
  return element
}

let backHandlerSubscription: NativeEventSubscription | null = null

function hide (view?: RootSiblings) {
  if (!(view instanceof RootSiblings)) {
    return
  }
  view.destroy()
  backHandlerSubscription?.remove()
  backHandlerSubscription = null
}

const backAction = () => {
  hide(scannerView)
  return true
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    zIndex: 1000
  },
  closeIcon: {
    position: 'absolute',
    left: 20,
    top: 10
  },
  closeImg: {
    width: 25,
    height: 25,
    marginTop: StatusBar.currentHeight,
  },
  closeBtnBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  albumIcon: {
    position: 'absolute',
    right: 20,
    bottom: 40
  },
  albumImg: {
    width: 20,
    height: 20,
  },
  albumBtnBg: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  }
})

function handleScanResult (
  data: string,
  type: string,
  callbacks: {
    success?: Taro.scanCode.Option['success']
    complete?: Taro.scanCode.Option['complete']
    resolve: (value: Taro.scanCode.SuccessCallbackResult) => void
  }
) {
  const res = {
    charSet: 'UTF-8',
    path: '',
    rawData: '',
    errMsg: 'scanCode:ok',
    result: data,
    scanType: formatCodeType(type),
  }
  callbacks.success?.(res)
  callbacks.complete?.(res)
  hide(scannerView)
  callbacks.resolve(res)
}

function scanFromPhoto (
  barcodeTypes: BarcodeType[],
  callback: (data: string, type: string) => void,
  errorCallBack: (err: unknown) => void
) {
  chooseMedia({
    sourceType: ['album'],
    maxDuration: 60,
    camera: 'back',
    success: function (res) {
      const imageUrl = res.tempFilePaths?.[0]
      if (imageUrl) {
        // @ts-ignore
        scanFromURLAsync(imageUrl, barcodeTypes).then((results) => {
          if (results.length > 0) {
            callback(results[0].data, results[0].type)
          }
        }).catch(errorCallBack)
      }
    }
  }, MEDIA_TYPE.Images).catch(errorCallBack)
}

export async function scanCode (option: Taro.scanCode.Option = {}): Promise<Taro.scanCode.SuccessCallbackResult> {
  const { success, fail, complete, onlyFromCamera, scanType = ['barCode', 'qrCode'] } = option
  const { status } = await Camera.requestCameraPermissionsAsync()
  if (status !== PermissionStatus.GRANTED) {
    const res = { errMsg: 'Permissions denied!' }
    fail?.(res)
    complete?.(res)
    return Promise.reject(res)
  }
  const barcodeTypes = getBarCodeTypes(scanType)
  return new Promise((resolve, reject) => {
    const onBarcodeScanned = ({ type, data }: BarcodeScanningResult) => {
      handleScanResult(data, type, { success, complete, resolve })
    }

    scannerView = new RootSiblings(
      (<View style={[styles.container]}>
        <StatusBar backgroundColor="rgba(0, 0, 0, 0)" translucent hidden={Platform.OS === 'ios'} />
        <CameraView
          facing="back"
          onBarcodeScanned={onBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes,
          }}
          style={{ width, height }}
        />
        <TouchableOpacity accessibilityLabel="Close" style={styles.closeIcon} onPress={() => hide(scannerView)}>
          {safeViewWrapper(<Image source={iconClose} style={styles.closeImg}/>)}
        </TouchableOpacity>
        {!onlyFromCamera && (<TouchableOpacity style={styles.albumIcon} onPress={() => {
          scanFromPhoto(barcodeTypes, (data, type) => {
            handleScanResult(data, type, { success, complete, resolve })
          }, (err) => {
            const res = {
              errMsg: 'scanCode fail',
              err
            }
            fail?.(res)
            complete?.(res)
            hide(scannerView)
            reject(res)
          })
        }}>
          {safeViewWrapper(<Image source={iconPic} style={styles.albumImg}/>)}
        </TouchableOpacity>)}
      </View>)
    )
    backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', backAction)
  })
}
