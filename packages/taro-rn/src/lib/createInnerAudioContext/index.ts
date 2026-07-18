import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio'
import type { EventSubscription } from 'expo-modules-core'

import { isUrl } from '../../utils'

/**
 * InnerAudioContext 实例，可通过 wx.createInnerAudioContext 接口获取实例。
 */
class InnerAudioContext {
  private _src = ''
  private _startTime = 0
  private _autoplay = false
  private _loop = false
  private _obeyMuteSwitch = true // TODO
  private _volume = 1
  /** @member 当前音频的长度（单位 s）。只有在当前有合法的 src 时返回（只读） */
  public duration = 0
  /** @member 当前音频的播放位置（单位 s）。只有在当前有合法的 src 时返回，时间保留小数点后 6 位（只读 */
  public currentTime = 0
  /** @member 当前是是否暂停或停止状态（只读） */
  public paused = true
  /** @member 音频缓冲的时间点，仅保证当前播放时间点到此时间点内容已缓冲（只读） */
  public buffered = 0
  private player!: AudioPlayer
  private statusSubscription: EventSubscription | null = null
  private onCanplayCallback?: () => void
  private onEndedCallback?: () => void
  private onErrorCallback?: (error: unknown) => void
  private onPauseCallback?: () => void
  private onPlayCallback?: () => void
  private onSeekedCallback?: () => void
  private onSeekingCallback?: () => void
  private onStopCallback?: () => void
  private onTimeUpdateCallback?: (status: AudioStatus) => void
  private onWaitingCallback?: () => void

  constructor () {
    this.initPlayer()
  }

  private initPlayer () {
    this.player = createAudioPlayer(null, { updateInterval: 100 })
    this.statusSubscription = this.player.addListener('playbackStatusUpdate', this._onPlaybackStatusUpdate)
  }

  private releasePlayer () {
    this.statusSubscription?.remove()
    this.statusSubscription = null
    this.player.remove()
  }

  _onPlaybackStatusUpdate = (playbackStatus: AudioStatus) => {
    this.duration = playbackStatus.duration
    this.currentTime = playbackStatus.currentTime
    this.buffered = playbackStatus.duration
    this.paused = !playbackStatus.playing
    this.onTimeUpdateCallback?.(playbackStatus)

    if (playbackStatus.error) {
      this.onErrorCallback?.(playbackStatus.error)
      return
    }

    if (!playbackStatus.isLoaded) {
      return
    }

    if (playbackStatus.isBuffering) {
      this.onWaitingCallback?.()
    }

    if (playbackStatus.didJustFinish && !playbackStatus.loop) {
      this.releasePlayer()
      this.initPlayer()
      this.onEndedCallback?.()
    }
  }

  set src (value: string) {
    this._src = value
    if (this._autoplay) {
      void this._firstPlay()
    }
  }

  get src () {
    return this._src
  }

  set autoplay (value: boolean) {
    this._autoplay = value
  }

  get autoplay () {
    return this._autoplay
  }

  set startTime (value: number) {
    this._startTime = value
  }

  get startTime () {
    return this._startTime
  }

  set volume (value: number) {
    this._volume = value
    this.player.volume = value
  }

  get volume () {
    return this._volume
  }

  set loop (value: boolean) {
    this._loop = value
    this.player.loop = value
  }

  get loop () {
    return this._loop
  }

  set obeyMuteSwitch (value: boolean) {
    this._obeyMuteSwitch = value
  }

  get obeyMuteSwitch () {
    return this._obeyMuteSwitch
  }

  private async _firstPlay () {
    if (!this._src) return { errMsg: 'src is undefined' }
    const source: AudioSource = isUrl(this._src) ? { uri: this._src } : this._src
    this.player.replace(source)
    this.onCanplayCallback?.()
    if (this._startTime) {
      await this.player.seekTo(this._startTime)
    }
    this.player.play()
    this.onPlayCallback?.()
  }

  /**
   *  播放
   */
  async play () {
    await setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
      playsInSilentMode: !this._obeyMuteSwitch,
      shouldRouteThroughEarpiece: false,
    })
    try {
      if (!this.player.isLoaded) {
        await this._firstPlay()
      } else {
        this.player.play()
      }
      this.player.volume = this._volume
      this.player.loop = this._loop
      this.onPlayCallback?.()
    } catch (error) {
      this.onErrorCallback?.(error)
    }
  }

  /**
   *  暂停。暂停后的音频再播放会从暂停处开始播放
   */
  async pause () {
    try {
      this.player.pause()
      this.onPauseCallback?.()
    } catch (error) {
      this.onErrorCallback?.(error)
    }
  }

  /**
   * 停止。停止后的音频再播放会从头开始播放
   */
  async stop () {
    try {
      await this.player.seekTo(0)
      this.player.pause()
      this.onStopCallback?.()
    } catch (error) {
      this.onErrorCallback?.(error)
    }
  }

  /**
   * 跳转到指定位置
   * @param position - 跳转的时间，单位 s。精确到小数点后 3 位，即支持 ms 级别精确度
   */
  async seek (position: number) {
    try {
      this.onSeekingCallback?.()
      await this.player.seekTo(position)
      this.onSeekedCallback?.()
    } catch (error) {
      this.onErrorCallback?.(error)
    }
  }

  /**
   * @todo
   * 销毁当前实例
   */
  destroy () {
    void this.stop()
    this.releasePlayer()
  }

  /**
   * 监听音频进入可以播放状态的事件。但不保证后面可以流畅播放
   * @param callback
   */
  onCanplay (callback: () => void) {
    this.onCanplayCallback = callback
  }

  /**
   * 取消监听音频进入可以播放状态的事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offCanplay (_callback: () => void) {
    this.onCanplayCallback = undefined
  }

  /**
   * 监听音频播放事件
   * @param callback
   */
  onPlay (callback: () => void) {
    this.onPlayCallback = callback
  }

  /**
   * 取消监听音频播放事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offPlay (_callback: () => void) {
    this.onPlayCallback = undefined
  }

  /**
   *  监听音频暂停事件
   * @param callback
   */
  onPause (callback: () => void) {
    this.onPauseCallback = callback
  }

  /**
   * 取消监听音频暂停事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offPause (_callback: () => void) {
    this.onPauseCallback = undefined
  }

  /**
   * 监听音频停止事件
   * @param callback
   */
  onStop (callback: () => void) {
    this.onStopCallback = callback
  }

  /**
   *  取消监听音频停止事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offStop (_callback: () => void) {
    this.onStopCallback = undefined
  }

  /**
   * 监听音频自然播放至结束的事件
   * @param callback
   */
  onEnded (callback: () => void) {
    this.onEndedCallback = callback
  }

  /**
   * 取消监听音频自然播放至结束的事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offEnded (_callback: () => void) {
    this.onEndedCallback = undefined
  }

  /**
   * 监听音频播放进度更新事件
   * @param callback
   */
  onTimeUpdate (callback: (status: AudioStatus) => void) {
    this.onTimeUpdateCallback = callback
  }

  /**
   * 取消监听音频播放进度更新事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offTimeUpdate (_callback: (status: AudioStatus) => void) {
    this.onTimeUpdateCallback = undefined
  }

  /**
   * 监听音频播放错误事件
   * @param callback
   */
  onError (callback: (error: unknown) => void) {
    this.onErrorCallback = callback
  }

  /**
   * 取消监听音频播放错误事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offError (_callback: (error: unknown) => void) {
    this.onErrorCallback = undefined
  }

  /**
   * 监听音频加载中事件。当音频因为数据不足，需要停下来加载时会触发
   * @param callback
   */
  onWaiting (callback: () => void) {
    this.onWaitingCallback = callback
  }

  /**
   * 取消监听音频加载中事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offWaiting (_callback: () => void) {
    this.onWaitingCallback = undefined
  }

  /**
   * 监听音频进行跳转操作的事件
   * @param callback
   */
  onSeeking (callback: () => void) {
    this.onSeekingCallback = callback
  }

  /**
   * 取消监听音频进行跳转操作的事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offSeeking (_callback: () => void) {
    this.onSeekingCallback = undefined
  }

  /**
   *  监听音频完成跳转操作的事件
   * @param callback
   */
  onSeeked (callback: () => void) {
    this.onSeekedCallback = callback
  }

  /**
   * 取消监听音频完成跳转操作的事件
   * @param callback
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offSeeked (_callback: () => void) {
    this.onSeekedCallback = undefined
  }
}

/**
 * 创建 audio 上下文 AudioContext 对象。
 */
export function createInnerAudioContext (): InnerAudioContext {
  return new InnerAudioContext()
}
