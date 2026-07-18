/* eslint-disable no-void -- 演示页 fire-and-forget 异步调用 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import jssdk from '@htyf-mp/js-sdk';

const SAMPLE_IMAGE_URI = 'https://picsum.photos/800';
const SAMPLE_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const SAMPLE_AUDIO_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const SAMPLE_DOWNLOAD_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

function DemoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DemoButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

function BtnRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.btnRow}>{children}</View>;
}

export function App() {
  const [hint, setHint] = useState('');
  /** 桩/MF 环境可能没有真实 AdBanner，避免渲染 undefined */
  const AdBannerComponent =
    typeof jssdk.AdBanner === 'function' ? jssdk.AdBanner : View;

  const toastErr = useCallback((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    void jssdk.showToast({
      type: 'error',
      title: '调用失败',
      description: msg.slice(0, 200),
    });
  }, []);

  const run = useCallback(
    async (title: string, fn: () => Promise<void>) => {
      try {
        await fn();
        void jssdk.showToast({ type: 'success', title: `${title} 已执行` });
      } catch (e) {
        toastErr(e);
      }
    },
    [toastErr],
  );

  const setHintJson = useCallback((label: string, value: unknown) => {
    try {
      setHint(`${label}: ${JSON.stringify(value, null, 2)}`);
    } catch {
      setHint(`${label}: [无法序列化]`);
    }
  }, []);

  useEffect(() => {
    const offOrientation = jssdk.addOrientationListener((o) => {
      console.log('[jssdk demo] orientation', o);
    });
    const offDevice = jssdk.addDeviceOrientationListener((o) => {
      console.log('[jssdk demo] deviceOrientation', o);
    });
    const offNet = jssdk.addNetworkListener((s) => {
      console.log('[jssdk demo] network', s);
    });
    const offVol = jssdk.addVolumeListener((v) => {
      console.log('[jssdk demo] volume', v);
    });
    return () => {
      offOrientation();
      offDevice();
      offNet();
      offVol();
    };
  }, []);

  useEffect(() => {
    setHintJson('启动信息', {
      appid: jssdk.appid,
      vip: jssdk.vip,
      hasClient: !!jssdk.client,
      launch: jssdk.getLaunchOptionsSync(),
      menuButton: jssdk.getMenuButtonBoundingClientRect(),
      documentDir: jssdk.getDocumentDir(),
      cachesDir: jssdk.getCachesDir(),
      orientationLocked: jssdk.isLocked(),
      locales: jssdk.getLocales().slice(0, 3),
      currenciesSample: jssdk.getCurrencies().slice(0, 5),
      country: jssdk.getCountry(),
      timeZone: jssdk.getTimeZone(),
    });
  }, [setHintJson]);

  const demoAppInfo = useMemo(
    () =>
      ({
        type: 'app' as const,
        name: 'Demo 目标应用',
        appid: 'demo-target-appid',
        version: '1.0.0',
        appUrlConfig: 'https://example.com/app.json',
        zipUrl: 'https://example.com/app.zip',
      }),
    [],
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>@htyf-mp/js-sdk API Demo</Text>
        <AdBannerComponent style={styles.adSlot} />
        <Text style={styles.hint} selectable>
          {hint}
        </Text>
      </View>

      <DemoSection title="界面与反馈">
        <BtnRow>
          <DemoButton
            label="showToast 成功"
            onPress={() => {
              console.log('showToast 成功');
              void jssdk.showToast({
                type: 'success',
                title: '操作成功1',
                description: '可选副标题',
              })
            }}
          />
          <DemoButton
            label="showToast 错误"
            onPress={() =>
              void jssdk.showToast({ type: 'error', title: '出错了' })
            }
          />
        </BtnRow>
        <BtnRow>
          <DemoButton
            label="showToast 加载"
            onPress={() =>
              void jssdk.showToast({ type: 'loading', title: '加载中…' })
            }
          />
          <DemoButton
            label="showModal"
            onPress={() =>
              void jssdk.showModal({
                title: '确认',
                description: '这是一段描述文案',
                confirmText: '确定',
                cancelText: '取消',
                onConfirm: () => console.log('modal confirm'),
                onCancel: () => console.log('modal cancel'),
              })
            }
          />
        </BtnRow>
      </DemoSection>

      <DemoSection title="宿主 / 运行时">
        <DemoButton
          label="刷新只读信息到上方文本"
          onPress={() => {
            setHintJson('React 存在', !!jssdk.React);
            void run('NativeModules', async () => {
              const nm = jssdk.ReactNative;
              setHintJson('NativeModules keys', nm ? Object.keys(nm).slice(0, 20) : []);
            });
          }}
        />
        <DemoButton
          label="getAppConfig (example.com)"
          onPress={() =>
            void run('getAppConfig', async () => {
              const c = await jssdk.getAppConfig('https://example.com');
              setHintJson('getAppConfig', c ?? null);
            })
          }
        />
      </DemoSection>

      <DemoSection title="存储 getStorage">
        <DemoButton
          label="setItem / getItem jssdk-demo"
          onPress={() =>
            void run('getStorage', async () => {
              const s = jssdk.getStorage();
              await s.setItem('jssdk-demo', `t=${Date.now()}`);
              const v = await s.getItem('jssdk-demo');
              setHintJson('storage jssdk-demo', v);
            })
          }
        />
      </DemoSection>

      <DemoSection title="扫码 / 浏览器 / 爬虫">
        <DemoButton
          label="openQR"
          onPress={() =>
            void run('openQR', async () => {
              const r = await jssdk.openQR({ text: '请扫描二维码' });
              setHintJson('openQR', r ?? null);
            })
          }
        />
        <DemoButton
          label="openBrowser"
          onPress={() =>
            void run('openBrowser', async () => {
              const close = await jssdk.openBrowser('https://example.com');
              setTimeout(() => close(), 3000);
            })
          }
        />
        <DemoButton
          label="puppeteer (可能仅宿主支持)"
          onPress={() =>
            void run('puppeteer', async () => {
              const r = await jssdk.puppeteer({
                url: 'https://example.com',
                jscode: '() => document.title',
                timeout: 15000,
              });
              setHintJson('puppeteer', r ?? null);
            })
          }
        />
      </DemoSection>

      <DemoSection title="权限">
        <DemoButton
          label="openPermissions (仅标题/说明)"
          onPress={() =>
            void run('openPermissions', async () => {
              const ok = await jssdk.openPermissions({
                title: '权限演示',
                content: '请在真实宿主中验证具体权限列表',
              });
              setHintJson('openPermissions', ok);
            })
          }
        />
      </DemoSection>

      <DemoSection title="相机 / 相册 / 文档">
        <BtnRow>
          <DemoButton
            label="openCamera 拍照"
            onPress={() =>
              void run('openCamera', async () => {
                await jssdk.openCamera({
                  type: 'photo',
                  quality: 'medium',
                  onCapture: (res) => setHintJson('openCamera', res),
                  onError: (err) => toastErr(err),
                });
              })
            }
          />
          <DemoButton
            label="launchImageLibrary"
            onPress={() =>
              void run('launchImageLibrary', async () => {
                const r = await jssdk.launchImageLibrary({
                  mediaType: 'photo',
                });
                setHintJson('launchImageLibrary', r);
              })
            }
          />
        </BtnRow>
        <BtnRow>
          <DemoButton
            label="launchCamera"
            onPress={() =>
              void run('launchCamera', async () => {
                const r = await jssdk.launchCamera({ mediaType: 'photo' });
                setHintJson('launchCamera', r);
              })
            }
          />
          <DemoButton
            label="getPhotos"
            onPress={() =>
              void run('getPhotos', async () => {
                const r = await jssdk.getPhotos({ first: 10 });
                setHintJson('getPhotos', r);
              })
            }
          />
        </BtnRow>
        <DemoButton
          label="pickDocument"
          onPress={() =>
            void run('pickDocument', async () => {
              const r = await jssdk.pickDocument({ allowMultiSelection: false });
              setHintJson('pickDocument', r);
            })
          }
        />
      </DemoSection>

      <DemoSection title="音视频 / 图片查看">
        <DemoButton
          label="openAudioPlayer"
          onPress={() =>
            void run('openAudioPlayer', async () => {
              const close = await jssdk.openAudioPlayer({
                type: 'open',
                items: [
                  {
                    id: 'demo-1',
                    url: SAMPLE_AUDIO_URL,
                    title: 'Demo 音频',
                    artist: 'Demo',
                  },
                ] as never,
                currentIndex: 0,
              });
              setTimeout(() => close(), 5000);
            })
          }
        />
        <DemoButton
          label="openVideoPlayer"
          onPress={() =>
            void run('openVideoPlayer', async () => {
              const close = await jssdk.openVideoPlayer({
                url: SAMPLE_VIDEO_URL,
                title: 'Demo 视频',
              });
              setTimeout(() => close(), 5000);
            })
          }
        />
        <DemoButton
          label="openImages"
          onPress={() =>
            void run('openImages', async () => {
              const close = await jssdk.openImages({
                images: [{ uri: SAMPLE_IMAGE_URI }],
                imageIndex: 0,
              });
              setTimeout(() => close(), 5000);
            })
          }
        />
      </DemoSection>

      <DemoSection title="应用生命周期">
        <DemoButton
          label="openApp (占位)"
          onPress={() =>
            void run('openApp', async () => {
              const ok = await jssdk.openApp(demoAppInfo);
              setHintJson('openApp', ok);
            })
          }
        />
        <BtnRow>
          <DemoButton
            label="closeApp"
            onPress={() =>
              void run('closeApp', async () => {
                const ok = await jssdk.closeApp();
                setHintJson('closeApp', ok);
              })
            }
          />
          <DemoButton
            label="restartApp"
            onPress={() =>
              void run('restartApp', async () => {
                const ok = await jssdk.restartApp();
                setHintJson('restartApp', ok);
              })
            }
          />
        </BtnRow>
      </DemoSection>

      <DemoSection title="文件 / 相册">
        <DemoButton
          label="downloadAndSaveFile"
          onPress={() =>
            void run('downloadAndSaveFile', async () => {
              const r = await jssdk.downloadAndSaveFile({
                fromUrl: SAMPLE_DOWNLOAD_URL,
                filename: 'dummy-demo.pdf',
                onProgress: (p) => console.log('[download]', p.progress),
              });
              setHintJson('downloadAndSaveFile', r);
            })
          }
        />
        <BtnRow>
          <DemoButton
            label="saveImageToAlbum"
            onPress={() =>
              void run('saveImageToAlbum', async () => {
                const ok = await jssdk.saveImageToAlbum(SAMPLE_IMAGE_URI);
                setHintJson('saveImageToAlbum', ok);
              })
            }
          />
          <DemoButton
            label="saveVideoToAlbum"
            onPress={() =>
              void run('saveVideoToAlbum', async () => {
                const ok = await jssdk.saveVideoToAlbum(SAMPLE_VIDEO_URL);
                setHintJson('saveVideoToAlbum', ok);
              })
            }
          />
        </BtnRow>
      </DemoSection>

      <DemoSection title="广告">
        <BtnRow>
          <DemoButton
            label="showRewardedAd"
            onPress={() =>
              void run('showRewardedAd', async () => {
                await jssdk.showRewardedAd(
                  (d) => setHintJson('rewarded success', d),
                  (e) => toastErr(e),
                );
              })
            }
          />
          <DemoButton
            label="showInterstitialAd"
            onPress={() =>
              void run('showInterstitialAd', async () => {
                await jssdk.showInterstitialAd({
                  onOpen: () => console.log('interstitial open'),
                  onClose: () => console.log('interstitial close'),
                });
              })
            }
          />
        </BtnRow>
      </DemoSection>

      <DemoSection title="方向 / 安全区">
        <BtnRow>
          <DemoButton
            label="lockToPortrait"
            onPress={() => void run('lockToPortrait', () => jssdk.lockToPortrait())}
          />
          <DemoButton
            label="unlockAllOrientations"
            onPress={() =>
              void run('unlockAllOrientations', () =>
                jssdk.unlockAllOrientations(),
              )
            }
          />
        </BtnRow>
        <BtnRow>
          <DemoButton
            label="lockLandscapeLeft"
            onPress={() =>
              void run('lockLandscapeLeft', () => jssdk.lockToLandscapeLeft())
            }
          />
          <DemoButton
            label="lockLandscapeRight"
            onPress={() =>
              void run('lockLandscapeRight', () => jssdk.lockToLandscapeRight())
            }
          />
        </BtnRow>
        <BtnRow>
          <DemoButton
            label="lockPortraitUpsideDown"
            onPress={() =>
              void run('lockPortraitUpsideDown', () =>
                jssdk.lockToPortraitUpsideDown(),
              )
            }
          />
          <DemoButton
            label="lockAllButUpsideDown"
            onPress={() =>
              void run('lockAllButUpsideDown', () =>
                jssdk.lockAllOrientationsButUpsideDown(),
              )
            }
          />
        </BtnRow>
        <DemoButton
          label="getOrientation / getSafeAreaInsets / getAutoRotateState"
          onPress={() =>
            void run('orientation 信息', async () => {
              const [o, insets, rotate] = await Promise.all([
                jssdk.getOrientation(),
                jssdk.getSafeAreaInsets(),
                jssdk.getAutoRotateState(),
              ]);
              setHintJson('orientation bundle', {
                orientation: o,
                insets,
                autoRotateAndroid: rotate,
                isLocked: jssdk.isLocked(),
              });
            })
          }
        />
        <DemoButton
          label="removeAllOrientationListeners"
          onPress={() => {
            jssdk.removeAllOrientationListeners();
            void jssdk.showToast({
              type: 'info',
              title: '已移除全部方向监听',
            });
          }}
        />
      </DemoSection>

      <DemoSection title="剪贴板 / 网络">
        <DemoButton
          label="setClipboardString / getClipboardString"
          onPress={() =>
            void run('clipboard', async () => {
              const t = `demo-${Date.now()}`;
              await jssdk.setClipboardString(t);
              const g = await jssdk.getClipboardString();
              setHintJson('clipboard', { set: t, get: g });
            })
          }
        />
        <DemoButton
          label="getNetworkState"
          onPress={() =>
            void run('getNetworkState', async () => {
              const s = await jssdk.getNetworkState();
              setHintJson('getNetworkState', s);
            })
          }
        />
      </DemoSection>

      <DemoSection title="文件系统 fs*">
        <DemoButton
          label="fsMkdir / fsWriteFile / fsReadFile / fsExists / fsReadDir"
          onPress={() =>
            void run('fs 读写', async () => {
              const base = `${jssdk.getDocumentDir()}/jssdk-demo`;
              await jssdk.fsMkdir(base);
              const file = `${base}/hello.txt`;
              await jssdk.fsWriteFile(file, 'hello jssdk', 'utf8');
              const exists = await jssdk.fsExists(file);
              const content = await jssdk.fsReadFile(file, 'utf8');
              const dir = await jssdk.fsReadDir(base);
              setHintJson('fs demo', { exists, content, dirLen: dir.length });
            })
          }
        />
        <DemoButton
          label="fsCopyFile / fsMoveFile / fsUnlink"
          onPress={() =>
            void run('fs 复制移动删除', async () => {
              const base = `${jssdk.getDocumentDir()}/jssdk-demo`;
              const a = `${base}/a.txt`;
              const b = `${base}/b.txt`;
              await jssdk.fsWriteFile(a, 'a', 'utf8');
              await jssdk.fsCopyFile(a, b);
              const c = `${base}/c.txt`;
              await jssdk.fsMoveFile(b, c);
              await jssdk.fsUnlink(a);
              await jssdk.fsUnlink(c);
              setHintJson('fs copy/move/unlink', 'ok');
            })
          }
        />
      </DemoSection>

      <DemoSection title="触感 / 音量 / 编解码">
        <DemoButton
          label="triggerHaptic impactLight"
          onPress={() => {
            jssdk.triggerHaptic('impactLight');
            void jssdk.showToast({ type: 'info', title: '已触发触感' });
          }}
        />
        <DemoButton
          label="getVolume / setVolume(0.5)"
          onPress={() =>
            void run('volume', async () => {
              const before = await jssdk.getVolume();
              await jssdk.setVolume(0.5);
              const after = await jssdk.getVolume();
              setHintJson('volume', { before, after });
            })
          }
        />
        <DemoButton
          label="encodeBase64 / decodeBase64 / getRandomBytes"
          onPress={() => {
            const enc = jssdk.encodeBase64('你好');
            const dec = jssdk.decodeBase64(enc);
            const bytes = jssdk.getRandomBytes(8);
            setHintJson('base64/random', { enc, dec, bytes: [...bytes] });
            void jssdk.showToast({ type: 'info', title: '结果见上方 JSON' });
          }}
        />
      </DemoSection>

      <DemoSection title="压缩 unzip / zip">
        <DemoButton
          label="zip (目录需存在)"
          onPress={() =>
            void run('zip', async () => {
              const base = `${jssdk.getDocumentDir()}/jssdk-demo`;
              await jssdk.fsMkdir(base);
              await jssdk.fsWriteFile(`${base}/z.txt`, 'z', 'utf8');
              const out = `${jssdk.getDocumentDir()}/jssdk-demo-pack.zip`;
              const p = await jssdk.zip(base, out);
              setHintJson('zip', p);
            })
          }
        />
        <DemoButton
          label="unzip (需有效 zip 路径)"
          onPress={() =>
            void run('unzip', async () => {
              const zipPath = `${jssdk.getDocumentDir()}/jssdk-demo-pack.zip`;
              const dest = `${jssdk.getDocumentDir()}/jssdk-demo-unzip`;
              await jssdk.fsMkdir(dest);
              const p = await jssdk.unzip(zipPath, dest);
              setHintJson('unzip', p);
            })
          }
        />
      </DemoSection>

      <DemoSection title="蓝牙 BLE（需设备与权限）">
        <BtnRow>
          <DemoButton
            label="bleStart"
            onPress={() => void run('bleStart', () => jssdk.bleStart())}
          />
          <DemoButton
            label="bleIsStarted"
            onPress={() =>
              void run('bleIsStarted', async () => {
                const s = await jssdk.bleIsStarted();
                setHintJson('bleIsStarted', s);
              })
            }
          />
        </BtnRow>
        <DemoButton
          label="bleCheckState"
          onPress={() =>
            void run('bleCheckState', async () => {
              const s = await jssdk.bleCheckState();
              setHintJson('bleCheckState', s);
            })
          }
        />
        <BtnRow>
          <DemoButton
            label="bleScan"
            onPress={() =>
              void run('bleScan', async () => {
                await jssdk.bleScan({ seconds: 5 });
              })
            }
          />
          <DemoButton
            label="bleStopScan"
            onPress={() => void run('bleStopScan', () => jssdk.bleStopScan())}
          />
        </BtnRow>
        <DemoButton
          label="bleGetDiscoveredPeripherals"
          onPress={() =>
            void run('bleGetDiscoveredPeripherals', async () => {
              const list = await jssdk.bleGetDiscoveredPeripherals();
              setHintJson('bleGetDiscoveredPeripherals', list);
            })
          }
        />
        <DemoButton
          label="bleGetConnectedPeripherals"
          onPress={() =>
            void run('bleGetConnectedPeripherals', async () => {
              const list = await jssdk.bleGetConnectedPeripherals();
              setHintJson('bleGetConnectedPeripherals', list);
            })
          }
        />
        <Text style={styles.bleNote}>
          以下 API 需真实 peripheralId 与 service/characteristic UUID；占位调用可能失败，仅作接口演示。
        </Text>
        <DemoButton
          label="bleConnect / Disconnect / IsConnected (占位 ID)"
          onPress={() =>
            void run('ble connect 占位', async () => {
              const pid = '00000000-0000-0000-0000-000000000000';
              try {
                await jssdk.bleConnect(pid, { autoconnect: false });
              } catch {
                /* 预期失败 */
              }
              const ok = await jssdk
                .bleIsPeripheralConnected(pid)
                .catch(() => false);
              await jssdk.bleDisconnect(pid, true).catch(() => {});
              setHintJson('ble connect demo', { pid, connected: ok });
            })
          }
        />
        <DemoButton
          label="bleRetrieveServices / Read / Write / Notify (占位)"
          onPress={() =>
            void run('ble GATT 占位', async () => {
              const pid = 'demo-peripheral';
              const svc = '0000180F-0000-1000-8000-00805F9B34FB';
              const chr = '00002A19-0000-1000-8000-00805F9B34FB';
              await jssdk.bleRetrieveServices(pid, [svc]).catch(() => {});
              await jssdk.bleRead(pid, svc, chr).catch(() => {});
              await jssdk.bleWrite(pid, svc, chr, [0x01]).catch(() => {});
              await jssdk
                .bleWriteWithoutResponse(pid, svc, chr, [0x01])
                .catch(() => {});
              await jssdk.bleStartNotification(pid, svc, chr).catch(() => {});
              await jssdk.bleStopNotification(pid, svc, chr).catch(() => {});
              setHintJson('ble GATT', '占位调用已尝试（错误可忽略）');
            })
          }
        />
        <DemoButton
          label="bleAddListener (console)"
          onPress={() => {
            const off = jssdk.bleAddListener('BleManagerDiscoverPeripheral', (d) => {
              console.log('BleManagerDiscoverPeripheral', d);
            });
            setTimeout(() => off(), 15000);
            void jssdk.showToast({ type: 'info', title: '已订阅 15s BLE 日志' });
          }}
        />
      </DemoSection>
    </ScrollView>
  );
}

export default App;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  adSlot: {
    minHeight: 48,
    backgroundColor: '#e8e8ed',
    borderRadius: 8,
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Menlo',
    color: '#333',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    maxHeight: 160,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e5ea',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#007aff',
    borderRadius: 8,
    marginBottom: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  bleNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
