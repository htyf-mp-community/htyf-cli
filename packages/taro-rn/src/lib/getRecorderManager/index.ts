import {
  AudioModule,
  AudioQuality,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
  type RecordingOptions,
} from 'expo-audio'
import * as FileSystem from 'expo-file-system/legacy'

function buildRecordingOptions (
  sampleRate: number,
  numberOfChannels: number,
  encodeBitRate: number
): RecordingOptions {
  return {
    ...RecordingPresets.HIGH_QUALITY,
    sampleRate,
    numberOfChannels,
    bitRate: encodeBitRate,
    android: {
      ...RecordingPresets.HIGH_QUALITY.android,
      extension: '.m4a',
      sampleRate,
    },
    ios: {
      ...RecordingPresets.HIGH_QUALITY.ios,
      extension: '.caf',
      audioQuality: AudioQuality.MAX,
      sampleRate,
      // @ts-ignore
      bitRate: encodeBitRate,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      ...RecordingPresets.HIGH_QUALITY.web,
      bitsPerSecond: encodeBitRate,
    },
  }
}

class RecorderManager {
  private static instance: RecorderManager
  private static recordInstance?: AudioRecorder
  private onStartCallback?: () => void
  private onStopCallback?: (result: {
    tempFilePath: string
    duration: number
    fileSize?: number
  }) => void
  private onPauseCallback?: () => void
  private onResumeCallback?: () => void
  private onErrorCallback?: (error: { errMsg: string }) => void
  private preStatus?: ReturnType<AudioRecorder['getStatus']>
  private recordingStatusSubscription?: { remove: () => void }

  static getInstance () {
    if (!RecorderManager.instance) {
      RecorderManager.instance = new RecorderManager()
    }
    return RecorderManager.instance
  }

  /**
   * 开始录音
   */
  async start (opts: {
    sampleRate?: number
    numberOfChannels?: number
    encodeBitRate?: number
  } = {}) {
    const { granted } = await requestRecordingPermissionsAsync()
    if (!granted) {
      const res = { errMsg: 'Permissions denied!' }
      return Promise.reject(res)
    }

    const {
      sampleRate = 8000,
      numberOfChannels = 2,
      encodeBitRate = 48000,
    } = opts

    const options = buildRecordingOptions(sampleRate, numberOfChannels, encodeBitRate)

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        interruptionMode: 'doNotMix',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: true,
      })

      if (RecorderManager.recordInstance) {
        const recordStatus = RecorderManager.recordInstance.getStatus()
        if (recordStatus.isRecording) {
          await RecorderManager.recordInstance.stop()
        }
        this.recordingStatusSubscription?.remove()
        RecorderManager.recordInstance = undefined
      }

      const recording = new AudioModule.AudioRecorder(options)
      RecorderManager.recordInstance = recording
      this.recordingStatusSubscription = recording.addListener(
        'recordingStatusUpdate',
        this.onRecordingStatusUpdate
      )
      await recording.prepareToRecordAsync()
      recording.record()
      this.onStartCallback?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.onErrorCallback?.({ errMsg: message })
    }
  }

  /**
   * 暂停录音
   */
  async pause () {
    try {
      const recordInstance = RecorderManager.recordInstance
      if (recordInstance) {
        recordInstance.pause()
        this.onPauseCallback?.()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.onErrorCallback?.({ errMsg: message })
    }
  }

  /**
   * 继续录音
   */
  async resume () {
    try {
      const recordInstance = RecorderManager.recordInstance
      if (recordInstance) {
        recordInstance.record()
        this.onResumeCallback?.()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.onErrorCallback?.({ errMsg: message })
    }
  }

  /**
   * 停止录音
   */
  async stop () {
    try {
      const recordInstance = RecorderManager.recordInstance
      if (recordInstance) {
        await recordInstance.stop()
        const uri = recordInstance.uri || ''
        const status = recordInstance.getStatus()
        const info = await FileSystem.getInfoAsync(uri)

        const result = {
          tempFilePath: uri,
          duration: status.durationMillis,
          fileSize: 'size' in info ? info.size : undefined,
        }
        this.onStopCallback?.(result)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.onErrorCallback?.({ errMsg: message })
    }
  }

  private onRecordingStatusUpdate = () => {
    const recordInstance = RecorderManager.recordInstance
    if (!recordInstance) return

    const status = recordInstance.getStatus()
    if (this.preStatus === undefined) {
      this.preStatus = status
      return
    }
    if (!this.preStatus.isRecording && status.isRecording) {
      console.log('start')
    }
    this.preStatus = status
  }

  onError (callback: (error: { errMsg: string }) => void) {
    this.onErrorCallback = callback
  }

  onStart (callback: () => void) {
    this.onStartCallback = callback
  }

  onStop (callback: (result: {
    tempFilePath: string
    duration: number
    fileSize?: number
  }) => void) {
    this.onStopCallback = callback
  }

  onPause (callback: () => void) {
    this.onPauseCallback = callback
  }

  onResume (callback: () => void) {
    this.onResumeCallback = callback
  }
}

/**
 * 获取全局唯一的录音管理器 RecorderManager
 */
function getRecorderManager (): RecorderManager {
  return RecorderManager.getInstance()
}

export { getRecorderManager }
