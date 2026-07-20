export declare function mpBuildShell(workspaceRoot: string, mode: 'debug' | 'build'): Promise<any>;
export declare function getAppExposesOptions(workspaceRoot: string): Promise<{
    APP_EXPOSES_OPTIONS: {
        name: string;
        filename: string;
        exposes: {
            App: string;
        };
        outputPath: string;
        extraChunksPath: string;
        manifest: string;
    };
    APP_ROOT_INDEX_PATH: string;
}>;
export declare function handleZip(inputPath: any, outputPath: any): Promise<any>;
/**
 * 获取小程序脚本ID
 * @param {string} appid - 应用ID
 * @param {string} version - 版本号
 * @returns {string} 脚本ID
 */
export declare function getMiniAppScriptId(appid: any, version: any): string;
/**
 * 打印二维码
 * @param {string} url - 二维码URL
 */
export declare function printQrcode(url: string): Promise<void>;
export declare function validateNetworkConfig(): Promise<{
    isValid: boolean;
    error: string;
    host?: undefined;
    interface?: undefined;
} | {
    isValid: boolean;
    host: string;
    interface: string;
    error?: undefined;
} | undefined>;
