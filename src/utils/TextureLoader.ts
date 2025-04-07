import * as THREE from 'three';

export class TextureLoader {
  private texture: THREE.Texture | null = null;
  private imageData: ImageData | null = null;
  private pixelData: Uint8ClampedArray | null = null;
  private width: number = 0;
  private height: number = 0;

  async loadTexture(imagePath: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        imagePath,
        (texture) => {
          this.texture = texture;
          this.extractPixelData();
          resolve(texture);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  private extractPixelData(): void {
    if (!this.texture) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    this.width = this.texture.image.width;
    this.height = this.texture.image.height;
    
    canvas.width = this.width;
    canvas.height = this.height;
    
    context.drawImage(this.texture.image, 0, 0);
    this.imageData = context.getImageData(0, 0, this.width, this.height);
    this.pixelData = this.imageData.data;
  }

  getPixelColor(x: number, y: number): THREE.Color {
    if (!this.pixelData) return new THREE.Color();

    const index = (y * this.width + x) * 4;
    const r = this.pixelData[index] / 255;
    const g = this.pixelData[index + 1] / 255;
    const b = this.pixelData[index + 2] / 255;

    return new THREE.Color(r, g, b);
  }

  isPixelTransparent(x: number, y: number): boolean {
    if (!this.pixelData) return true;

    const index = (y * this.width + x) * 4;
    return this.pixelData[index + 3] < 128;
  }

  getTextureSize(): { width: number; height: number } {
    return {
      width: this.width,
      height: this.height
    };
  }

  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    this.imageData = null;
    this.pixelData = null;
  }
}