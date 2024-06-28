import { getCommonMetadata, sendBuildData } from './common';
import type { WebpackBuildData } from './types';
import type { Compiler, Stats, StatsCompilation } from 'webpack';

export class WebpackBuildStatsPlugin {
  private readonly customIdentifier: string | undefined;
  private bundleFiles: Record<string, number> = {};
  private bundleSize: number = 0;

  constructor(customIdentifier: string | undefined = process.env.npm_lifecycle_event) {
    this.customIdentifier = customIdentifier;
  }

  apply(compiler: Compiler) {
    compiler.hooks.emit.tapAsync('AgodaBuildStatsPlugin', (compilation, callback) => {
      this.bundleSize = 0;
      this.bundleFiles = {};

      for (const assetName in compilation.assets) {
        if (compilation.assets.hasOwnProperty(assetName)) {
          const asset = compilation.assets[assetName];
          this.bundleFiles[assetName] = asset.size();
          this.bundleSize += asset.size();
        }
      }

      callback();
    });

    compiler.hooks.done.tap('AgodaBuildStatsPlugin', async (stats: Stats) => {
      const jsonStats: StatsCompilation = stats.toJson();

      const buildStats: WebpackBuildData = {
        ...getCommonMetadata(jsonStats.time ?? -1, this.customIdentifier),
        type: 'webpack',
        compilationHash: jsonStats.hash ?? null,
        webpackVersion: jsonStats.version ?? null,
        nbrOfCachedModules: jsonStats.modules?.filter((m) => m.cached).length ?? 0,
        nbrOfRebuiltModules: jsonStats.modules?.filter((m) => m.built).length ?? 0,
        bundleFiles: this.bundleFiles ?? {},
        bundleSize: this.bundleSize ?? 0,
      };

      // console.log(buildStats);

      sendBuildData(buildStats);
    });
  }
}
