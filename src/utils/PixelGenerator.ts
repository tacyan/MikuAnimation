import * as THREE from 'three';

/**
 * @class PixelGenerator
 * 
 * 画像からピクセルアートを生成するクラス
 * 3Dオブジェクトとして表示するために使用されます
 */
export class PixelGenerator {
  private texture: THREE.Texture | null = null;
  private pixelSize = 0.06; // 0.05から0.06に変更して安定性向上
  private pixels: THREE.Mesh[] = [];
  private group: THREE.Group;
  private rotationSpeed = 0.005;
  private pixelResolution = 0.5; // 新しいプロパティ: ピクセル解像度（1は元の解像度、小さいほど少ないピクセル）
  private instancedMesh: THREE.InstancedMesh | null = null;
  private pixelGeometry: THREE.BoxGeometry | null = null;
  private pixelMaterial: THREE.MeshPhongMaterial | null = null;
  private imageAspectRatio: number = 1; // 画像のアスペクト比
  private imageDimensions: {width: number, height: number} = {width: 0, height: 0}; // 画像の元のサイズ
  private pixelGap = 0; // ギャップを0に設定して斜線のズレを防止

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
      textureLoader.load(imagePath, (texture) => {
        // テクスチャフィルタリングを最適化
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false; // ミップマップを無効化してクリアな表示
        
        resolve(texture);
      });
    });
    
    // 画像サイズとアスペクト比を保存
    if (this.texture && this.texture.image) {
      this.imageDimensions = {
        width: this.texture.image.width,
        height: this.texture.image.height
      };
      this.imageAspectRatio = this.texture.image.height / this.texture.image.width;
    }
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
    const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!context) return this.group;

    const image = this.texture.image;
    
    // 解像度を調整して処理するピクセル数を設定
    // 偶数サイズに調整して中心軸のズレを防止
    const sampledWidth = Math.floor(image.width * this.pixelResolution / 2) * 2;
    const sampledHeight = Math.floor(image.height * this.pixelResolution / 2) * 2;
    
    canvas.width = sampledWidth;
    canvas.height = sampledHeight;
    
    // 高品質なリサンプリングの設定
    try {
      // @ts-ignore
      context.imageSmoothingEnabled = false; // ピクセル化された見た目を維持
    } catch (e) {
      console.warn('高品質リサンプリングの設定に失敗しました', e);
    }
    
    context.drawImage(image, 0, 0, sampledWidth, sampledHeight);

    const imageData = context.getImageData(0, 0, sampledWidth, sampledHeight);
    const data = imageData.data;

    // 不透明ピクセルの数をカウント
    let visiblePixelCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 10) { // 透明度の閾値
        visiblePixelCount++;
      }
    }

    // ピクセルは正確な整数サイズにして、ズレを防止
    this.pixelGeometry = new THREE.BoxGeometry(this.pixelSize, this.pixelSize, this.pixelSize);
    
    // シンプルなPhongマテリアルを高品質設定に
    this.pixelMaterial = new THREE.MeshPhongMaterial({
      shininess: 60, // 光沢を適度に
      specular: 0x444444, // スペキュラハイライトを控えめに
      flatShading: true // フラットシェーディングで斜線のズレを軽減
    });
    
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
    
    // 中心オフセットを正確に計算（偶数サイズを考慮）
    const centerX = sampledWidth / 2;
    const centerY = sampledHeight / 2;
    
    for (let y = 0; y < sampledHeight; y++) {
      for (let x = 0; x < sampledWidth; x++) {
        const index = (y * sampledWidth + x) * 4;
        const alpha = data[index + 3];

        if (alpha > 10) {
          // 色成分を元のまま使用
          const r = data[index] / 255;
          const g = data[index + 1] / 255;
          const b = data[index + 2] / 255;
          
          // 位置を設定 - 座標を固定した整数倍に調整して揺らぎをなくす
          // pixelSizeの倍数にスナップさせる
          const posX = Math.floor((x - centerX) * 10) / 10 * this.pixelSize;
          const posY = Math.floor((centerY - y) * 10) / 10 * this.pixelSize;
          
          // スケールも1に固定して揺らぎを防止
          const scaleMatrix = new THREE.Matrix4().makeScale(1, 1, 1);
          matrix.compose(
            new THREE.Vector3(posX, posY, 0),
            new THREE.Quaternion(),
            new THREE.Vector3(1, 1, 1)
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
      
      // 揺れを小さく安定させる - 揺れの振幅を0.1から0.05に減少
      this.group.rotation.x = Math.sin(Date.now() * 0.0008) * 0.05;
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

  /**
   * 画像のアスペクト比を取得します
   * @returns {number} - 画像の縦横比（高さ/幅）
   */
  getImageAspectRatio(): number {
    return this.imageAspectRatio;
  }

  /**
   * 画像の寸法を取得します
   * @returns {Object} - 画像の幅と高さを含むオブジェクト
   */
  getImageDimensions(): {width: number, height: number} {
    return this.imageDimensions;
  }

  /**
   * オブジェクトの最大寸法を取得します（カメラ設定に使用）
   * @returns {number} - オブジェクトの最大サイズ
   */
  getMaxDimension(): number {
    if (!this.imageDimensions.width || !this.imageDimensions.height) return 0;
    
    const sampledWidth = Math.floor(this.imageDimensions.width * this.pixelResolution);
    const sampledHeight = Math.floor(this.imageDimensions.height * this.pixelResolution);
    
    // ピクセル単位でのオブジェクトの最大サイズを計算
    const widthSize = sampledWidth * this.pixelSize;
    const heightSize = sampledHeight * this.pixelSize;
    
    return Math.max(widthSize, heightSize);
  }
}