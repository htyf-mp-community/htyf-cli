import { useEffect, useMemo, useState } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import jssdk from '@htyf-mp/js-sdk'
import './index.less'

type MenuButtonRect = { top: number; right: number; bottom: number; left: number; width: number; height: number };

export default function Index () {
  const [inApp, setInApp] = useState(false);
	const [menuRect, setMenuRect] = useState<MenuButtonRect | null>(null);

  useLoad(() => {

  })

  useEffect(() => {
    setInApp(!!(jssdk as unknown as { client?: unknown }).client);
    const rect = jssdk.getMenuButtonBoundingClientRect();
		setMenuRect({
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom,
			left: rect.left,
			width: rect.width,
			height: rect.height,
		});
    console.log('Page loaded.')
    console.log('menuRect', menuRect);
  }, []);

  const styles = useMemo(() => {
    const top = menuRect?.top || 0;
    const right = (menuRect?.right || 0) + (menuRect?.width || 0) || 0;
    const height = menuRect?.height || 0;
    return {
      paddingLeft: right ? `${Math.max(right, 20)}px` : undefined,
      paddingTop: top ? `${Math.max(top, 20)}px` : undefined,
      paddingRight: right ? `${Math.max(right, 20)}px` : undefined,
      height: height ? `${Math.max(height, 30)}px` : undefined,
    }
  }, [menuRect]);

  return (
    <View className='index'>
      <View style={styles} className='header'>
        <Text>demo app</Text>
      </View>
      <View className='content'>
        <ScrollView scrollY>
          <View className='section'>
              <Text className='sectionTitle'>界面与反馈</Text>
              <View className='buttonGrid'>
                <Button onClick={() => jssdk.showToast({ type: "success", title: "操作成功" })}>showToast 成功</Button>
                <Button onClick={() => jssdk.showToast({ type: "error", title: "出错了" })}>showToast 失败</Button>
                <Button onClick={() => jssdk.showToast({ type: "loading", title: "加载中" })}>showToast 加载</Button>
                <Button onClick={() => jssdk.showToast({ type: "info", title: "提示信息" })}>showToast 信息</Button>
                <Button onClick={() => jssdk.showModal({ title: "确认", description: "这是一段描述", confirmText: "确定", cancelText: "取消" })}>showModal</Button>
              </View>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}
