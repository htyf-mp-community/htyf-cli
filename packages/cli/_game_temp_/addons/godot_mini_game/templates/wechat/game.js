import "./adapter";
import "./fetch";
import Loader from "./js/loader";
import { PlatformRuntime } from "./js/platform_runtime";

const _api = PlatformRuntime.requirePlatform("wechat", "WeChat entrypoint");

function checkUpdate() {
  try {
    if (typeof _api.getUpdateManager !== "function") return;
    const updater = _api.getUpdateManager();
    if (!updater) return;
    if (typeof updater.onCheckForUpdate === "function") updater.onCheckForUpdate(() => {});
    if (typeof updater.onUpdateReady === "function") updater.onUpdateReady(() => {
      if (typeof _api.showModal !== "function") return;
      _api.showModal({
        title: "更新提示",
        content: "新版本已准备好，是否重启应用？",
        success(res) {
          if (res.confirm && typeof updater.applyUpdate === "function") updater.applyUpdate();
        },
      });
    });
    if (typeof updater.onUpdateFailed === "function") updater.onUpdateFailed(() => {});
  } catch {}
}

checkUpdate();
const loader = new Loader();
loader.load().catch((error) => console.error("[Game] WeChat startup failed:", error));
