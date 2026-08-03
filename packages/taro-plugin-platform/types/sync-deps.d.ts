/**
 * 将 shared-output.json 与 @htyf-mp/taro 依赖版本同步到项目根目录 package.json
 * @param {{ skipConfirm?: boolean }} [options]
 */
export declare function syncDepsShell(workspaceRoot: string, options?: {
    skipConfirm?: boolean;
}): Promise<void>;
