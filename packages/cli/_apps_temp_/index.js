/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { SDKPortal } from '@htyf-mp/rn-sdk';
import App from './src';
import { name as appName } from './app.json';

function RootApp() {
  return <>
    <App />
    <SDKPortal
      isNative={false}
      setGloabl={true}
      currentGlobal={globalThis}
      appid="native-appstore"
      launchOptions={{}}
    />
  </>
}

AppRegistry.registerComponent(appName, () => RootApp);
