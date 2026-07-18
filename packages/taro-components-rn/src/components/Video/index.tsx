/**
 * Video组件的样式参考了[uni-app](https://github.com/dcloudio/uni-app/tree/master/packages/uni-h5)的实现
 */

import { VideoProps } from '@tarojs/components/types/Video'
import type { EventSubscription } from 'expo-modules-core'
import {
  createVideoPlayer,
  VideoView,
  type VideoContentFit,
  type VideoPlayer,
} from 'expo-video'
import React, { Component, createRef } from 'react'
import { DimensionValue, ImageStyle } from 'react-native'

import Image from '../Image'
import Text from '../Text'
import View from '../View'
import { onFullscreenChangeEventDetail } from './PropsType'
import Styles from './style'
// import Danmu from './danmu'
// import Controls from './controls'
import { formatTime } from './utils'

const ObjectFit: Record<string, VideoContentFit> = {
  contain: 'contain',
  fill: 'fill',
  cover: 'cover',
}

declare const global: any

global._taroVideoMap = global._taroVideoMap || {}

interface TaroVideoRef {
  playAsync: () => Promise<void>
  pauseAsync: () => Promise<void>
  stopAsync: () => Promise<void>
  setPositionAsync: (status: { positionMillis: number }) => Promise<void>
  setRateAsync: (rate: number) => Promise<void>
  setStatusAsync: (status: { positionMillis?: number }) => Promise<void>
  presentFullscreenPlayer: () => Promise<void>
  dismissFullscreenPlayer: () => Promise<void>
}

interface Props extends VideoProps {
  onLoad: () => void
  // 兼容旧版本，可传入 style 对象
  style?: any
}

class _Video extends Component<Props, any> {
  /** @type {VideoProps} */
  static defaultProps: Props = {
    id: '',
    src: '',
    autoPauseIfNavigate: true,
    autoPauseIfOpenNative: true,
    autoplay: false,
    controls: true,
    danmuBtn: false,
    danmuList: [],
    enableDanmu: false,
    enablePlayGesture: false,
    enableProgressGesture: true,
    initialTime: 0,
    loop: false,
    muted: false,
    objectFit: 'contain',
    playBtnPosition: 'bottom',
    showCenterPlayBtn: true,
    showFullscreenBtn: true,
    showMuteBtn: false,
    showPlayBtn: true,
    showProgress: true,
    vslideGesture: false,
    vslideGestureInFullscreen: true,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onLoad: () => {},
  }

  player: VideoPlayer | null = null
  taroVideoRef: TaroVideoRef | null = null
  videoViewRef = createRef<InstanceType<typeof VideoView>>()
  subscriptions: EventSubscription[] = []

  /** @type {number} */
  currentTime = 0

  progressDimentions = {
    left: 0,
    right: 0,
    width: 0,
  }

  isDraggingProgress: any
  duration: any
  toastVolumeRef: any
  toastVolumeBarRef: any
  toastProgressTitleRef: any
  toastProgressRef: any
  getControlsRef: (ref: any) => void
  getDanmuRef: (ref: any) => void
  getToastProgressRef: (ref: any) => void
  getToastProgressTitleRef: (ref: any) => void
  getToastVolumeRef: (ref: any) => void
  getToastVolumeBarRef: (ref: any) => void
  unbindTouchEvents: () => void

  constructor(props: Props) {
    super(props)
    const stateObj = this.props
    this.state = Object.assign(
      {
        duration: null,
        isPlaying: false,
        isFirst: true,
        enableDanmu: false,
        isFullScreen: false,
        isMute: false,
      },
      stateObj
    )
    this.createPlayer()
  }

  componentDidMount(): void {
    const player = this.player
    if (!player) return

    this.subscriptions = [
      player.addListener('sourceLoad', this.onSourceLoad),
      player.addListener('timeUpdate', this.onTimeUpdate),
      player.addListener('playingChange', this.onPlayingChange),
      player.addListener('playToEnd', this.onPlayToEnd),
      player.addListener('statusChange', this.onStatusChange),
    ]

    if (this.props.autoplay || this.state.shouldPlay) {
      player.play()
    }
  }

  componentDidUpdate(prevProps: Props): void {
    const player = this.player
    if (!player) return

    if (prevProps.src !== this.props.src && this.props.src) {
      player.replace({ uri: this.props.src })
    }

    if (prevProps.loop !== this.props.loop) {
      player.loop = !!this.props.loop
    }

    if (prevProps.muted !== this.props.muted) {
      player.muted = !!this.props.muted
    }

    const shouldPlay = this.state.shouldPlay || this.props.autoplay
    if (shouldPlay && !player.playing) {
      player.play()
    } else if (!shouldPlay && player.playing) {
      player.pause()
    }
  }

  componentWillUnmount(): void {
    const { id } = this.props
    if (id && global._taroVideoMap[id] === this.taroVideoRef) {
      delete global._taroVideoMap[id]
    }

    this.subscriptions.forEach((subscription) => subscription.remove())
    this.subscriptions = []
    this.player?.release()
    this.player = null
    this.taroVideoRef = null
  }

  createPlayer = (): void => {
    const { src, loop, muted, initialTime, id } = this.props
    const player = createVideoPlayer(src ? { uri: src } : null)
    player.loop = !!loop
    player.muted = !!muted
    player.timeUpdateEventInterval = 0.25

    if (initialTime) {
      player.currentTime = initialTime
    }

    this.player = player
    this.taroVideoRef = this.createTaroVideoRef(player)
    if (id) {
      global._taroVideoMap[id] = this.taroVideoRef
    }
  }

  createTaroVideoRef = (player: VideoPlayer): TaroVideoRef => ({
    playAsync: async () => {
      player.play()
    },
    pauseAsync: async () => {
      player.pause()
    },
    stopAsync: async () => {
      player.pause()
      player.currentTime = 0
    },
    setPositionAsync: async ({ positionMillis }) => {
      player.currentTime = positionMillis / 1000
    },
    setRateAsync: async (rate) => {
      player.playbackRate = rate
    },
    setStatusAsync: async ({ positionMillis }) => {
      if (positionMillis != null) {
        player.currentTime = positionMillis / 1000
      }
    },
    presentFullscreenPlayer: async () => {
      this.videoViewRef.current?.enterFullscreen()
    },
    dismissFullscreenPlayer: async () => {
      this.videoViewRef.current?.exitFullscreen()
    },
  })

  buildPlaybackStatus = (player: VideoPlayer) => ({
    isLoaded: player.status === 'readyToPlay' || player.status === 'loading',
    isPlaying: player.playing,
    durationMillis: (player.duration || 0) * 1000,
    positionMillis: (player.currentTime || 0) * 1000,
    didJustFinish: false,
  })

  onSourceLoad = (): void => {
    const player = this.player
    if (!player) return

    const status = this.buildPlaybackStatus(player)
    this.setState({
      duration: status.durationMillis,
    })
    this.props.onLoad && this.props.onLoad()
    this.onLoadedMetaData(status)
  }

  onTimeUpdate = (): void => {
    const player = this.player
    if (!player) return
    this.onPlaybackStatusUpdate(this.buildPlaybackStatus(player))
  }

  onPlayingChange = (): void => {
    const player = this.player
    if (!player) return
    this.onPlaybackStatusUpdate(this.buildPlaybackStatus(player))
  }

  onPlayToEnd = (): void => {
    const player = this.player
    if (!player) return
    this.onPlaybackStatusUpdate({
      ...this.buildPlaybackStatus(player),
      didJustFinish: true,
    })
  }

  onStatusChange = ({ error }: { error?: unknown }): void => {
    if (error) {
      this.onError(String(error))
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  onEnded = (e: any): void => {
    this.setState({
      // isFirst: true,
      isEnded: true,
    })
    if (!this.props.loop) this.pause()
    this.props.onEnded && this.props.onEnded(e)
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  onPlay = (e: any): void => {
    this.props.onPlay && this.props.onPlay(e)
    if (!this.state.isPlaying) {
      this.play()
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  onPause = (e: any): void => {
    this.props.onPause && this.props.onPause(e)
    if (this.state.isPlaying) {
      this.setState({
        isPlaying: false,
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  onError = (e: string): void => {
    if (this.props.onError) {
      const error: any = Object.defineProperty({}, 'detail', {
        enumerable: true,
        value: { errMsg: e },
      })
      this.props.onError(error)
    }
  }

  clickPlayBtn = (): void => {
    const { isEnded } = this.state
    isEnded && this.seek(0)
    this.play()
  }

  play = (): void => {
    const { isEnded } = this.state
    isEnded && this.seek(0)
    this.player?.play()
    this.setState({
      shouldPlay: true,
      isPlaying: true,
      isFirst: false,
    })
  }

  pause = (): void => {
    this.player?.pause()
    this.setState({
      isPlaying: false,
      shouldPlay: false,
    })
  }

  stop = (): void => {
    this.pause()
    this.seek(0)
    this.setState({
      isPlaying: false,
    })
  }

  seek = (position: number): void => {
    if (this.player) {
      this.player.currentTime = position / 1000
    }
  }

  showStatusBar = (): void => {
    console.error('暂不支持 videoContext.showStatusBar')
  }

  hideStatusBar = (): void => {
    console.error('暂不支持 videoContext.hideStatusBar')
  }

  requestFullScreen = (): void => {
    this.videoViewRef.current?.enterFullscreen()
  }

  exitFullScreen = (): void => {
    this.videoViewRef.current?.exitFullscreen()
  }

  static getDerivedStateFromProps(nProps: VideoProps): VideoProps {
    return nProps
  }

  onLoadedMetaData = (status: ReturnType<_Video['buildPlaybackStatus']>): void => {
    const player = this.player
    const videoTrack = player?.videoTrack
    const naturalSize = videoTrack
      ? {
          width: videoTrack.size.width,
          height: videoTrack.size.height,
          orientation: videoTrack.size.width >= videoTrack.size.height ? 'landscape' : 'portrait',
        }
      : {}
    // @ts-ignore
    status.duration = status.durationMillis
    // @ts-ignore
    this.props.onLoadedMetaData && this.props.onLoadedMetaData({ detail: { ...naturalSize, ...status } })
  }

  onFullscreenChange = (fullScreen: boolean, fullscreenUpdate: 0 | 1 | 2 | 3): void => {
    const player = this.player
    const status = player ? this.buildPlaybackStatus(player) : {}
    const detail: onFullscreenChangeEventDetail = {
      fullScreen,
      fullscreenUpdate,
      direction: 'vertical',
      ...status,
    }
    if (this.state.isFullScreen !== fullScreen) {
      this.setState({
        isFullScreen: fullScreen,
      }, () => {
        // @ts-ignore
        this.props.onFullscreenChange && this.props.onFullscreenChange({ detail })
      })
    }
  }

  onPlaybackStatusUpdate = (event: ReturnType<_Video['buildPlaybackStatus']>): void => {
    // @ts-ignore
    this.props.onTimeUpdate && this.props.onTimeUpdate(event)
    // @ts-ignore
    const { didJustFinish, isPlaying } = event
    if (didJustFinish) {
      this.onEnded(event)
    }

    if (isPlaying !== this.state.isPlaying) {
      this.setState(
        {
          isPlaying,
          isFirst: isPlaying ? false : this.state.isFirst
        },
        () => {
          isPlaying && this.onPlay(event)
          !isPlaying && !this.state.isFirst && this.onPause(event)
        }
      )
    }
  }

  render(): React.ReactNode {
    const {
      style,
      objectFit = 'contain',
      poster,
      controls,
      showCenterPlayBtn,
    } = this.props
    const { isFullScreen } = this.state
    const duration = formatTime(
      this.props.duration || this.state.duration || null
    )

    // 第一次不显示又无法自动播放
    const showPlayBtn = this.state.isFirst ? true : showCenterPlayBtn

    const videoNode = (
      <View
        style={[
          Styles['taro-video-container'],
          isFullScreen && Styles['taro-video-type-fullscreen'],
        ]}
      >
        {this.player ? (
          <VideoView
            ref={this.videoViewRef}
            player={this.player}
            style={Object.assign({ width: '100%', height: '100%' }, style) as Record<string, DimensionValue>}
            contentFit={ObjectFit[objectFit] || 'contain'}
            nativeControls={controls}
            fullscreenOptions={{ enable: true }}
            onFullscreenEnter={() => this.onFullscreenChange(true, 1)}
            onFullscreenExit={() => this.onFullscreenChange(false, 3)}
          />
        ) : null}
        {poster && controls && !this.state.isPlaying ? (
          <Image
            src={poster}
            style={[
              {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              },
            ]}
          />
        ) : null}
        {showPlayBtn && !this.state.isPlaying && (
          <View style={Styles['taro-video-cover']}>
            <Image
              src={require('../../assets/video/play.png')}
              style={Styles['taro-video-cover-play-button'] as ImageStyle}
              onClick={this.clickPlayBtn}
            />
            <Text style={Styles['taro-video-cover-duration']}>{duration}</Text>
          </View>
        )}
        {this.props.children}
      </View>
    )
    return (
      <View style={[Styles['taro-video'], this.props.style as Record<string, unknown>]}>
        {videoNode}
      </View>
    )
  }
}

export default _Video
