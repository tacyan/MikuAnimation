import * as THREE from 'three';

export class PixelGenerator {
  private texture: THREE.Texture | null = null;
  private pixelSize = 0.1;
  private pixels: THREE.Mesh[] = [];
  private group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
  }

  async loadImage(imagePath: string): Promise<void> {
    const textureLoader = new THREE.TextureLoader();
    this.texture = await new Promise((resolve) => {
      textureLoader.load(imagePath, (texture) => resolve(texture));
    });
  }

  generatePixels(): THREE.Group {
    if (!this.texture) return this.group;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return this.group;

    const image = this.texture.image;
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3];

        if (alpha > 0) {
          const r = data[index] / 255;
          const g = data[index + 1] / 255;
          const b = data[index + 2] / 255;

          const geometry = new THREE.BoxGeometry(this.pixelSize, this.pixelSize, this.pixelSize);
          const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(r, g, b),
            emissive: new THREE.Color(r * 0.2, g * 0.2, b * 0.2)
          });

          const pixel = new THREE.Mesh(geometry, material);
          pixel.position.set(
            (x - canvas.width / 2) * this.pixelSize,
            (canvas.height / 2 - y) * this.pixelSize,
            0
          );

          this.pixels.push(pixel);
          this.group.add(pixel);
        }
      }
    }

    return this.group;
  }

  animate(time: number): void {
    this.pixels.forEach((pixel, index) => {
      const offset = index * 0.1;
      pixel.position.z = Math.sin(time * 0.001 + offset) * 0.2;
      pixel.rotation.x = Math.cos(time * 0.001 + offset) * 0.2;
      pixel.rotation.y = Math.sin(time * 0.001 + offset) * 0.2;
    });
  }

  setPixelSize(size: number): void {
    this.pixelSize = size;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  clear(): void {
    this.pixels.forEach(pixel => this.group.remove(pixel));
    this.pixels = [];
  }
}