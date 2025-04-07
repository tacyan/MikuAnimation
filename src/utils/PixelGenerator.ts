import * as THREE from 'three';

/**
 * @class PixelGenerator
 * 
 * 画像からピクセルアートを生成するクラス
 * 3Dオブジェクトとして表示するために使用されます
 */
export class PixelGenerator {
  private texture: THREE.Texture | null = null;
  private pixelSize = 0.1;
  private pixels: THREE.Mesh[] = [];
  private group: THREE.Group;
  private rotationSpeed = 0.005;
  private pixelResolution = 0.5; // 新しいプロパティ: ピクセル解像度（1は元の解像度、小さいほど少ないピクセル）
  private instancedMesh: THREE.InstancedMesh | null = null;
  private pixelGeometry: THREE.BoxGeometry | null = null;
  private pixelMaterial: THREE.MeshPhongMaterial | null = null;

  /**
   * コンストラクタ
   */
  constructor() {
    this.group = new THREE.Group();
  }

  /**
   * 画像を読み込み、テクスチャを生成します
   * @param {string} imagePath - 画像ファイルのパス
   * @returns {Promise<void>}
   */
  async loadImage(imagePath: string): Promise<void> {
    const textureLoader = new THREE.TextureLoader();
    this.texture = await new Promise((resolve) => {
      textureLoader.load(imagePath, (texture) => resolve(texture));
    });
  }

  /**
   * 画像からピクセルを生成し、3Dオブジェクトとして返します
   * 最適化バージョン: インスタンス化されたメッシュとサンプリングを使用
   * @returns {THREE.Group} - ピクセルを含むグループ
   */
  generatePixels(): THREE.Group {
    if (!this.texture) return this.group;

    // 以前のピクセルをクリア
    this.clear();

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return this.group;

    const image = this.texture.image;
    
    // 解像度を下げて処理するピクセル数を削減
    const sampledWidth = Math.floor(image.width * this.pixelResolution);
    const sampledHeight = Math.floor(image.height * this.pixelResolution);
    
    canvas.width = sampledWidth;
    canvas.height = sampledHeight;
    context.drawImage(image, 0, 0, sampledWidth, sampledHeight);

    const imageData = context.getImageData(0, 0, sampledWidth, sampledHeight);
    const data = imageData.data;

    // 不透明ピクセルの数をカウント
    let visiblePixelCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        visiblePixelCount++;
      }
    }

    // ジオメトリとマテリアルを共有
    this.pixelGeometry = new THREE.BoxGeometry(this.pixelSize, this.pixelSize, this.pixelSize);
    this.pixelMaterial = new THREE.MeshPhongMaterial();
    
    // インスタンス化されたメッシュを作成
    this.instancedMesh = new THREE.InstancedMesh(
      this.pixelGeometry,
      this.pixelMaterial,
      visiblePixelCount
    );
    
    // 各ピクセルの変換行列とカラーを設定
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    let instanceIndex = 0;
    
    for (let y = 0; y < sampledHeight; y++) {
      for (let x = 0; x < sampledWidth; x++) {
        const index = (y * sampledWidth + x) * 4;
        const alpha = data[index + 3];

        if (alpha > 0) {
          const r = data[index] / 255;
          const g = data[index + 1] / 255;
          const b = data[index + 2] / 255;

          // 位置を設定
          matrix.setPosition(
            (x - sampledWidth / 2) * this.pixelSize,
            (sampledHeight / 2 - y) * this.pixelSize,
            0
          );
          
          // 各インスタンスの変換行列とカラーを設定
          this.instancedMesh.setMatrixAt(instanceIndex, matrix);
          this.instancedMesh.setColorAt(instanceIndex, color.setRGB(r, g, b));
          
          instanceIndex++;
        }
      }
    }
    
    // インスタンス行列とカラーの更新をGPUに通知
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    
    // グループに追加
    this.group.add(this.instancedMesh);
    
    return this.group;
  }

  /**
   * 画像からピクセルを生成し、3Dオブジェクトとして返します
   * @param {string} imagePath - 画像ファイルのパス
   * @returns {Promise<THREE.Group>} - ピクセルを含むグループ
   */
  async generateFromImage(imagePath: string): Promise<THREE.Group> {
    await this.loadImage(imagePath);
    return this.generatePixels();
  }

  /**
   * アニメーションの更新メソッド
   * 最適化: 細かい個別のアニメーションを減らし、グループ全体のアニメーションに集中
   */
  update(): void {
    // グループ全体の回転（より効率的）
    if (this.group) {
      this.group.rotation.y += this.rotationSpeed;
      this.group.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
    }
  }

  /**
   * 回転速度を設定します
   * @param {number} speed - 回転速度
   */
  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed * 0.001;
  }

  /**
   * ピクセルサイズを設定します
   * @param {number} size - ピクセルサイズ
   */
  setPixelSize(size: number): void {
    this.pixelSize = size;
  }

  /**
   * ピクセル解像度を設定します
   * @param {number} resolution - 解像度（0〜1の間の値）
   */
  setPixelResolution(resolution: number): void {
    this.pixelResolution = Math.max(0.1, Math.min(1, resolution));
  }

  /**
   * グループを取得します
   * @returns {THREE.Group} - ピクセルを含むグループ
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * ピクセルをクリアします
   */
  clear(): void {
    if (this.instancedMesh) {
      this.group.remove(this.instancedMesh);
      this.instancedMesh.dispose();
      this.instancedMesh = null;
    }
    
    if (this.pixelGeometry) {
      this.pixelGeometry.dispose();
      this.pixelGeometry = null;
    }
    
    if (this.pixelMaterial) {
      this.pixelMaterial.dispose();
      this.pixelMaterial = null;
    }
    
    // 古い個別メッシュの配列もクリア
    this.pixels.forEach(pixel => {
      if (pixel.geometry) pixel.geometry.dispose();
      if (pixel.material instanceof THREE.Material) pixel.material.dispose();
      this.group.remove(pixel);
    });
    this.pixels = [];
  }
}