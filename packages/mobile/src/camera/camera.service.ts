import type {
  Platform,
  CameraOptions,
  CameraResult,
} from '../types/mobile.types.js';

const DEFAULT_QUALITY = 90;
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const MIN_QUALITY = 1;
const MAX_QUALITY = 100;

export class CameraService {
  private readonly platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  async takePhoto(options?: CameraOptions): Promise<CameraResult> {
    const quality = this.clampQuality(options?.quality ?? DEFAULT_QUALITY);
    const width = options?.width ?? DEFAULT_WIDTH;
    const height = options?.height ?? DEFAULT_HEIGHT;
    const resultType = options?.resultType ?? 'dataUrl';

    const simulatedDataUrl = this.buildSimulatedDataUrl(
      'photo',
      width,
      height,
      quality
    );

    return this.buildResult(resultType, simulatedDataUrl, width, height);
  }

  async pickFromGallery(options?: CameraOptions): Promise<CameraResult> {
    const quality = this.clampQuality(options?.quality ?? DEFAULT_QUALITY);
    const width = options?.width ?? DEFAULT_WIDTH;
    const height = options?.height ?? DEFAULT_HEIGHT;
    const resultType = options?.resultType ?? 'dataUrl';

    const simulatedDataUrl = this.buildSimulatedDataUrl(
      'gallery',
      width,
      height,
      quality
    );

    return this.buildResult(resultType, simulatedDataUrl, width, height);
  }

  async compressImage(dataUrl: string, quality: number): Promise<string> {
    if (!dataUrl || dataUrl.trim().length === 0) {
      throw new Error('Data URL is required for compression');
    }

    const clampedQuality = this.clampQuality(quality);

    return `${dataUrl}?compressed=true&quality=${clampedQuality}`;
  }

  getPlatform(): Platform {
    return this.platform;
  }

  private clampQuality(quality: number): number {
    return Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, Math.round(quality)));
  }

  private buildSimulatedDataUrl(
    source: string,
    width: number,
    height: number,
    quality: number
  ): string {
    return `data:image/jpeg;base64,simulated-${source}-${width}x${height}-q${quality}`;
  }

  private buildResult(
    resultType: string,
    dataUrl: string,
    width: number,
    height: number
  ): CameraResult {
    if (resultType === 'uri') {
      return {
        uri: `file:///tmp/simulated-capture-${Date.now()}.jpg`,
        format: 'jpeg',
        width,
        height,
      };
    }

    return {
      dataUrl,
      format: 'jpeg',
      width,
      height,
    };
  }
}
