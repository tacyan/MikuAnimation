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
  // private pixelGap = 0; // ギャップを0に設定して斜線のズレを防止（未使用のためコメントアウト）

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
        // テクスチャフィルタリングを最適化して縦線バグを修正
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false; // ミップマップを無効化してクリアな表示
        
        // テクスチャのラップモードを修正して繰り返しによる縦線を防止
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        
        // テクスチャの境界線処理を改善
        texture.anisotropy = 1; // アニソトロピックフィルタリングを最小化
        
        // テクスチャの変更を適用
        texture.needsUpdate = true;
        
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
    // より精密な計算で縦線バグを防止
    const rawWidth = image.width * this.pixelResolution;
    const rawHeight = image.height * this.pixelResolution;
    
    // 小数点以下を切り捨てず、正確に四捨五入して偶数に調整
    let sampledWidth = Math.round(rawWidth);
    let sampledHeight = Math.round(rawHeight);
    
    // 確実に偶数にするための調整（奇数だった場合は+1）
    sampledWidth = sampledWidth % 2 === 0 ? sampledWidth : sampledWidth + 1;
    sampledHeight = sampledHeight % 2 === 0 ? sampledHeight : sampledHeight + 1;
    
    canvas.width = sampledWidth;
    canvas.height = sampledHeight;
    
    // 高品質なリサンプリングの設定
    try {
      // @ts-ignore
      context.imageSmoothingEnabled = false; // ピクセル化された見た目を維持
      // @ts-ignore
      context.imageSmoothingQuality = 'high'; // 高品質設定を追加
    } catch (e) {
      console.warn('高品質リサンプリングの設定に失敗しました', e);
    }
    
    // クリアな描画のためキャンバスをクリア
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // より精密な描画
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
    
    // マテリアルを自然な見た目に調整
    this.pixelMaterial = new THREE.MeshPhongMaterial({
      shininess: 25, // 光沢は維持
      specular: 0x222222, // スペキュラも維持
      flatShading: true, // フラットシェーディングは維持
      emissive: 0x333333, // 発光効果をさらに強化 (0x222222→0x333333)
      emissiveIntensity: 0.15 // 発光強度を上げる (0.1→0.15)
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
          // 色成分を元の画像と同じに
          const r = data[index] / 255;
          const g = data[index + 1] / 255;
          const b = data[index + 2] / 255;
          
          // 全体の明るさをさらに上げる
          let enhancedR = Math.min(1, r * 1.1); // 1.05→1.1に増加
          let enhancedG = Math.min(1, g * 1.1);
          let enhancedB = Math.min(1, b * 1.1);
          
          // 白色に近い色かどうかを判定
          const brightness = (r + g + b) / 3; // 明るさの平均値
          const isNearWhite = brightness > 0.65; // 明るさが65%以上なら白色に近いと判断（0.7→0.65に下げて対象範囲を拡大）
          
          if (isNearWhite) {
            // 白色に近い部分は明るさをより強調
            enhancedR = Math.min(1, r * 1.2); // 1.15→1.2に増加
            enhancedG = Math.min(1, g * 1.2);
            enhancedB = Math.min(1, b * 1.2);
          }
          
          // 値の範囲をクリップ（0〜1に収める）
          enhancedR = Math.max(0, Math.min(1, enhancedR));
          enhancedG = Math.max(0, Math.min(1, enhancedG));
          enhancedB = Math.max(0, Math.min(1, enhancedB));
          
          // 位置を設定 - より精密な計算で縦線バグを防止
          // 小数点以下の精度を向上させ、丸め誤差を防止
          const exactX = (x - centerX) * this.pixelSize;
          const exactY = (centerY - y) * this.pixelSize;
          
          // 整数値へのスナップを廃止し、正確な位置を使用
          const posX = exactX;
          const posY = exactY;
          
          // スケールも1に固定して揺らぎを防止
          matrix.compose(
            new THREE.Vector3(posX, posY, 0),
            new THREE.Quaternion(),
            new THREE.Vector3(1, 1, 1)
          );
          
          // 各インスタンスの変換行列とカラーを設定
          this.instancedMesh.setMatrixAt(instanceIndex, matrix);
          this.instancedMesh.setColorAt(instanceIndex, color.setRGB(enhancedR, enhancedG, enhancedB));
          
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
      
      // 揺れを固定値に設定して時間経過による変化をなくす
      // this.group.rotation.x = Math.sin(Date.now() * 0.0008) * 0.05;
      this.group.rotation.x = 0; // 揺れを無効化して安定させる
    }
  }

  /**
   * 回転速度を設定します
   * @param {number} speed - 回転速度（0-100の値）
   */
  setRotationSpeed(speed: number): void {
    // 0-100の値を0-0.02の範囲にマッピング（より強弱をつける）
    // 二次関数を使って低速域を細かく、高速域を大きく変化させる
    const normalizedSpeed = speed / 100;
    this.rotationSpeed = Math.pow(normalizedSpeed, 2) * 0.02;
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
