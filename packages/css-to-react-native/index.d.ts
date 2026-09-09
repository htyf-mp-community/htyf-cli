export default function transform(css: string, options?: {
  parseMediaQueries?: boolean;
  scalable?: boolean;
}): { [selector: string]: unknown; }

export declare function transformCSS(rules: Array<[string, string]>, shorthandBlacklist?: string[]): { [key: string]: any };
