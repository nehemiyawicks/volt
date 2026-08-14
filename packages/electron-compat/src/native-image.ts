export interface Size { width: number; height: number; }

export class NativeImage {
  private _path?: string;
  private _empty = true;

  static createEmpty(): NativeImage {
    return new NativeImage();
  }

  static createFromPath(path: string): NativeImage {
    const img = new NativeImage();
    img._path = path;
    img._empty = false;
    return img;
  }

  static createFromBuffer(_buffer: Buffer): NativeImage {
    const img = new NativeImage();
    img._empty = false;
    return img;
  }

  static createFromDataURL(_dataUrl: string): NativeImage {
    const img = new NativeImage();
    img._empty = false;
    return img;
  }

  isEmpty(): boolean { return this._empty; }
  getSize(): Size { return { width: 0, height: 0 }; }
  toPNG(): Buffer { return Buffer.alloc(0); }
  toJPEG(_quality: number): Buffer { return Buffer.alloc(0); }
  toBitmap(): Buffer { return Buffer.alloc(0); }
  toDataURL(): string { return ""; }
  getAspectRatio(): number { return 1; }
  getBitmap(): Buffer { return Buffer.alloc(0); }
  resize(_options: { width?: number; height?: number; quality?: string }): NativeImage { return this; }
  crop(_rect: { x: number; y: number; width: number; height: number }): NativeImage { return this; }

  toString(): string { return this._path ?? "[NativeImage empty]"; }
  valueOf(): string { return this._path ?? ""; }
}

export const nativeImage = {
  createEmpty: NativeImage.createEmpty,
  createFromPath: NativeImage.createFromPath,
  createFromBuffer: NativeImage.createFromBuffer,
  createFromDataURL: NativeImage.createFromDataURL,
};
