/**
 * 将 shared-output.json 中的版本同步到项目根目录 package.json
 * @param {{ skipConfirm?: boolean }} [options]
 */
export declare function syncDepsShell(workspaceRoot: string, options?: {
    skipConfirm?: boolean;
}): Promise<void>;
