/**
 * @fileoverview メインエントリーポイント
 * 
 * Three.jsを使用した初音ミクのドット絵アニメーションを実装します。
 * PixelGeneratorクラスを使用して画像からピクセルを生成し、アニメーション表示します。
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PixelGenerator } from './utils/PixelGenerator';
import { ControlPanel } from './components/ControlPanel';

/**
 * パフォーマンス最適化の設定
 */
const CONFIG = {
  // レンダリング品質（1は最高品質、値を小さくすると低解像度でパフォーマンス向上）
  renderScale: 1.0,
  // ピクセル解像度（1は元画像の解像度そのまま、小さくするほどピクセル数減少）
  pixelResolution: 0.9,
  // ブルームエフェクトの初期強度
  bloomStrength: 0.3,
  // フレームレート制限（nullの場合は制限なし）
  frameRateLimit: 30,
};

/**
 * ピクセルアートシーンのクラス
 * Three.jsのシーンを管理し、ピクセルアニメーションを表示します
 */
class PixelArtScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private composer!: EffectComposer;
  private pixelGenerator: PixelGenerator;
  private bloomPass!: UnrealBloomPass;
  private isAnimating: boolean = true;
  private lastFrameTime: number = 0;
  private frameInterval: number = CONFIG.frameRateLimit ? (1000 / CONFIG.frameRateLimit) : 0;
  private defaultCameraDistance: number = 10;
  private cameraAdjusted: boolean = false;

  /**
   * コンストラクタ
   */
  constructor() {
    // パフォーマンスモニターを追加（開発中のみ）
    this.setupPerformanceMonitor();
    
    // シーンの初期化
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // カメラの初期化
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('キャンバスコンテナが見つかりません');
    }
    
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    
    // レンダラーの初期化
    this.setupRenderer(container);
    
    // その他のコンポーネントを初期化
    this.setupCamera();
    this.setupLights();
    this.setupControls();
    this.setupPostProcessing();
    
    // PixelGenerator と ControlPanel の初期化
    this.pixelGenerator = new PixelGenerator();
    this.pixelGenerator.setPixelResolution(CONFIG.pixelResolution);
    this.setupPixelArt();
    this.setupControlPanel();
    
    // イベントリスナーの設定
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // クリックイベントでのフォーカス機能を追加
    this.setupClickFocus();
    
    // 初期アニメーションを開始
    this.animate(0);
  }

  /**
   * パフォーマンスモニターを設定します（開発用）
   */
  private setupPerformanceMonitor(): void {
    // Stats.jsがインポートされている場合のみ実行
    try {
      const script = document.createElement('script');
      script.onload = function() {
        const stats = new (window as any).Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
        stats.dom.style.position = 'absolute';
        stats.dom.style.top = '0px';
        stats.dom.style.left = '0px';
        
        // rAFループ内でStats.jsの更新を行うため、windowに追加
        (window as any).__stats = stats;
      };
      script.src = 'https://cdn.jsdelivr.net/npm/stats.js@0.17.0/build/stats.min.js';
      document.head.appendChild(script);
    } catch (e) {
      console.warn('パフォーマンスモニターの初期化に失敗しました', e);
    }
  }

  /**
   * レンダラーを設定します
   * @param {HTMLElement} container - レンダラーを配置するコンテナ要素
   */
  private setupRenderer(container: HTMLElement): void {
    // レンダラーの作成と設定
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, // アンチエイリアス有効化
      powerPreference: 'high-performance', // 高性能モードを優先
      precision: 'highp', // 高精度レンダリング
      alpha: false, // アルファチャンネルを無効化して安定性向上
      stencil: false, // ステンシルバッファを無効化（不要なため）
      depth: true, // 深度バッファは保持
      preserveDrawingBuffer: true, // 描画バッファを維持して時間経過による劣化を防止
    });
    
    // ピクセル比を設定（2以上の値は避けて安定性を確保）
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(pixelRatio);
    
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000); // 黒色の背景
    
    // 元の色を忠実に再現するための設定
    this.renderer.outputEncoding = THREE.LinearEncoding; // リニアエンコーディングに変更
    this.renderer.toneMapping = THREE.NoToneMapping; // トーンマッピングを無効化
    this.renderer.toneMappingExposure = 1.0; // 標準露出
    
    // シャドウマップは無効のまま
    this.renderer.shadowMap.enabled = false;
    
    // コンテナに追加
    container.appendChild(this.renderer.domElement);
  }

  /**
   * カメラを設定します
   */
  private setupCamera(): void {
    this.camera.position.set(0, 0, this.defaultCameraDistance);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * ライトを設定します
   */
  private setupLights(): void {
    // 環境光を適切な明るさに設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); // 全体の明るさを上げる (0.85→0.9)
    ambientLight.userData = { originalIntensity: 0.9 }; // 元の強度を保存
    this.scene.add(ambientLight);
    
    // メインの指向性ライトを強めに
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 輝度を上げる (0.7→0.8)
    directionalLight.position.set(3, 4, 5);
    directionalLight.userData = { originalIntensity: 0.8 }; // 元の強度を保存
    this.scene.add(directionalLight);
    
    // 補助ライトも少し強く
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3); // 輝度を上げる (0.25→0.3)
    backLight.position.set(-4, 2, -3);
    backLight.userData = { originalIntensity: 0.3 }; // 元の強度を保存
    this.scene.add(backLight);
    
    // 正面からの光を強化
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.2); // 輝度を上げる (0.15→0.2)
    frontLight.position.set(0, 0, 8);
    frontLight.userData = { originalIntensity: 0.2 }; // 元の強度を保存
    this.scene.add(frontLight);
  }

  /**
   * OrbitControlsを設定します
   */
  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // 3D操作を強化した設定
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.7;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
    this.controls.enablePan = true;  // パン機能を有効化
    this.controls.panSpeed = 0.5;    // パンの速度を設定
    this.controls.maxDistance = 30;  // ズームアウトの制限
    this.controls.minDistance = 2;   // ズームインの制限
    
    // 追加のコントロール設定
    this.controls.screenSpacePanning = true; // カメラ方向に沿ったパンを有効化
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,     // 左クリック: 回転
      MIDDLE: THREE.MOUSE.DOLLY,    // 中クリック: ズーム
      RIGHT: THREE.MOUSE.PAN        // 右クリック: パン
    };
  }

  /**
   * ポストプロセッシングエフェクトを設定します
   */
  private setupPostProcessing(): void {
    // レンダラーからコンポーザーを作成
    this.composer = new EffectComposer(this.renderer);
    
    // レンダーパスの追加
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // ブルームエフェクトを白い部分が輝くように調整
    const size = this.renderer.getSize(new THREE.Vector2());
    
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      CONFIG.bloomStrength, // 強度を増加
      0.3, // ラディウスはそのまま
      0.75  // 閾値を下げて白い部分をより輝かせる (0.9→0.75)
    );
    
    try {
      // @ts-ignore
      this.bloomPass.kernelSize = 1; // 最小カーネルサイズ
    } catch (e) {
      console.warn('ブルームパスのカーネルサイズを設定できませんでした', e);
    }
    
    this.composer.addPass(this.bloomPass);
  }

  /**
   * ピクセルアートを設定します
   */
  private async setupPixelArt(): Promise<void> {
    try {
      const pixels = await this.pixelGenerator.generateFromImage('/images/C3BUam2VEAACSXg.jpg');
      this.scene.add(pixels);
      
      // 画像読み込み後にカメラ設定を調整
      this.adjustCameraForImage();
    } catch (error) {
      console.error('ピクセルアートの生成に失敗しました:', error);
    }
  }

  /**
   * 画像のアスペクト比に基づいてカメラを調整します
   */
  private adjustCameraForImage(): void {
    const aspectRatio = this.pixelGenerator.getImageAspectRatio();
    const maxDimension = this.pixelGenerator.getMaxDimension();
    
    if (aspectRatio > 1) {
      // 縦長画像の場合
      console.log('縦長画像を検出しました。カメラを調整します。');
      
      // カメラの視野角を計算（縦長画像では広い視野角が必要）
      const fov = this.camera.fov;
      
      // 画像の全体が見えるように距離を計算
      // 縦長の場合は高さに基づいて計算
      const distance = (maxDimension / 2) / Math.tan((fov / 2) * Math.PI / 180);
      
      // 余裕を持たせた距離に設定
      const adjustedDistance = distance * 1.2;
      this.defaultCameraDistance = adjustedDistance;
      
      // カメラ位置の更新
      this.camera.position.z = this.defaultCameraDistance;
      this.camera.updateProjectionMatrix();
      
      // コントロールの制限も更新（より広範囲の移動を許可）
      this.controls.maxDistance = this.defaultCameraDistance * 2.5;
      this.controls.minDistance = this.defaultCameraDistance * 0.25;
      
      // より自由なパン操作のために、ターゲットオフセットの範囲を設定
      // const panOffset = maxDimension * 1.5;  // 未使用の変数を削除
      // 実際のメソッドがThree.jsのバージョンによって異なるため、両方のアプローチを試みる
      try {
        // @ts-ignore - 標準的なプロパティではない可能性がある
        if (this.controls.maxPolarAngle) {
          // ポーラー角の制限を緩和
          this.controls.maxPolarAngle = Math.PI * 0.85;
          this.controls.minPolarAngle = Math.PI * 0.15;
        }
      } catch (e) {
        console.warn('カメラコントロールの角度制限設定に失敗しました', e);
      }
      
      this.cameraAdjusted = true;
    }
    
    // 初期位置で微妙に角度をつけて、立体感を強調
    this.camera.position.y = this.defaultCameraDistance * 0.1;
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
  }

  /**
   * 特定の部分にフォーカスします（外部から呼び出し可能）
   * @param {Object} position - フォーカスする位置
   * @param {boolean} doZoom - ズームインするかどうか
   */
  focusOnPosition(position: THREE.Vector3, doZoom: boolean = false): void {
    // コントロールのターゲットを更新
    this.controls.target.copy(position);
    
    // 現在のカメラ距離を取得
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    
    // カメラの方向ベクトルを計算
    const direction = new THREE.Vector3().subVectors(
      this.camera.position, this.controls.target
    ).normalize();
    
    // ズームする場合は近づける、しない場合は現在の距離を維持
    const targetDistance = doZoom ? 
      Math.max(this.controls.minDistance, currentDistance * 0.3) : // 現在の距離の30%まで近づける（より強いズーム効果）
      currentDistance;
    
    // カメラの位置を調整
    this.camera.position.copy(
      position.clone().add(direction.multiplyScalar(targetDistance))
    );
    
    // アニメーション効果のためのトランジション開始
    this.startCameraTransition(position, targetDistance);
  }
  
  /**
   * カメラのスムーズなトランジションを開始します
   * @param {THREE.Vector3} targetPosition - ターゲット位置
   * @param {number} targetDistance - ターゲット距離
   */
  private startCameraTransition(targetPosition: THREE.Vector3, targetDistance: number): void {
    // アニメーションの初期値を設定
    const startTime = Date.now();
    const duration = 1000; // ミリ秒単位のアニメーション時間（より長く滑らかに）
    const startPosition = this.camera.position.clone(); // 変数を復活させる
    const startTarget = this.controls.target.clone();
    
    // アニメーションを行う関数
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // イージング関数を適用（滑らかな開始と終了）
      const easeProgress = this.easeInOutQuart(progress);
      
      // ターゲットを更新
      this.controls.target.lerpVectors(startTarget, targetPosition, easeProgress);
      
      // カメラの位置も補間（正しい補間方法に修正）
      const newPosition = new THREE.Vector3();
      newPosition.lerpVectors(startPosition, targetPosition.clone().add(
        new THREE.Vector3(0, 0, targetDistance)
      ), easeProgress);
      this.camera.position.copy(newPosition);
      
      // コントロールを更新
      this.controls.update();
      
      // アニメーションが完了していない場合、次のフレームも実行
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    // アニメーションの開始
    animate();
  }
  
  /**
   * イージング関数（滑らかなアニメーションのため）
   * @param {number} t - 0〜1の進行度
   * @returns {number} - イージングを適用した進行度
   */
  // private easeInOutCubic(t: number): number {
  //   return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  // }

  /**
   * より強調された滑らかさのためのeaseInOutQuart関数
   * @param {number} t - 0〜1の進行度
   * @returns {number} - イージングを適用した進行度
   */
  private easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  /**
   * コントロールパネルを設定します
   */
  private setupControlPanel(): void {
    // グローバルなリセット用関数として公開
    (window as any).resetControlPanelValues = () => {
      // LocalStorageをリセット
      try {
        const defaultSettings = {
          rotationSpeed: 50,
          zoomLevel: 50,
          effectIntensity: 50,
          isAnimating: true
        };
        localStorage.setItem('pixelArtSettings', JSON.stringify(defaultSettings));
        
        // ページをリロード
        window.location.reload();
      } catch (e) {
        console.error('設定リセット失敗:', e);
      }
    };

    new ControlPanel({
      onBloomChange: this.updateBloomSettings.bind(this),
      onRotationChange: this.updateRotationSpeed.bind(this),
      onZoomChange: this.updateZoom.bind(this),
      onResetView: this.resetView.bind(this),
      onToggleAnimation: this.toggleAnimation.bind(this)
    });
  }

  /**
   * ウィンドウのリサイズを処理します
   */
  private handleResize(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // カメラのアスペクト比を更新
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    // レンダラーとコンポーザーのサイズを更新
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  /**
   * アニメーションループです
   * @param {number} timestamp - 現在のタイムスタンプ
   */
  private animate(timestamp: number): void {
    requestAnimationFrame(this.animate.bind(this));
    
    // フレームレート制限
    if (this.frameInterval > 0) {
      const elapsed = timestamp - this.lastFrameTime;
      if (elapsed < this.frameInterval) {
        return;
      }
      this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
    }
    
    // Statsモニターの更新（存在する場合）
    if ((window as any).__stats) {
      (window as any).__stats.begin();
    }
    
    // コントロールの更新 - ダンピング値を調整して動きをスムーズに
    this.controls.dampingFactor = 0.08;
    this.controls.update();
    
    // アニメーション中であれば、ピクセルジェネレータを更新
    if (this.isAnimating) {
      this.pixelGenerator.update();
    }
    
    // シーンのレンダリング - 固定座標でレンダリングし、小数点以下の揺らぎを防止
    try {
      // マトリックスの自動更新を一時的に無効化して安定性を向上
      this.camera.matrixAutoUpdate = false;
      this.camera.updateMatrix(); // マニュアルでマトリックスを更新
      
      // 毎フレーム光源の位置と強度を一定に保つ
      // この処理により時間経過による明るさの変化を防止
      const directionalLights = this.scene.children.filter(
        child => child instanceof THREE.DirectionalLight
      ) as THREE.DirectionalLight[];
      
      directionalLights.forEach(light => {
        // 光源の位置を固定するため、position以外のプロパティをコピー
        light.intensity = light.userData.originalIntensity || light.intensity;
        
        // 初回のみ元の強度を保存
        if (light.userData.originalIntensity === undefined) {
          light.userData.originalIntensity = light.intensity;
        }
      });
      
      // コンポーザーでレンダリング
      this.composer.render();
      
      this.camera.matrixAutoUpdate = true; // 元に戻す
    } catch (e) {
      console.error('レンダリングエラー:', e);
      this.camera.matrixAutoUpdate = true; // エラー時も戻す
    }
    
    // Statsモニターの更新（存在する場合）
    if ((window as any).__stats) {
      (window as any).__stats.end();
    }
  }

  /**
   * ブルームエフェクトの設定を更新します
   * @param {Object} settings - ブルーム設定
   * @param {number} settings.strength - 強度
   * @param {number} settings.radius - 半径
   * @param {number} settings.threshold - 閾値
   */
  private updateBloomSettings(settings: { strength: number, radius: number, threshold: number }): void {
    this.bloomPass.strength = settings.strength;
    this.bloomPass.radius = settings.radius;
    this.bloomPass.threshold = settings.threshold;
  }

  /**
   * 回転速度を更新します
   * @param {number} speed - 回転速度
   */
  private updateRotationSpeed(speed: number): void {
    this.pixelGenerator.setRotationSpeed(speed);
  }

  /**
   * カメラのズーム値を更新します
   * 縦長画像の場合は調整された範囲でズームするように修正
   * @param {number} zoom - ズーム値（0〜100）
   */
  private updateZoom(zoom: number): void {
    const minZ = this.cameraAdjusted ? this.defaultCameraDistance * 0.3 : 5;
    const maxZ = this.cameraAdjusted ? this.defaultCameraDistance * 1.5 : 15;
    
    // ズーム値（0〜100）をカメラ位置の範囲（maxZ〜minZ）にマッピング
    const zoomFactor = zoom / 100;
    this.camera.position.z = maxZ - (maxZ - minZ) * zoomFactor;
  }

  /**
   * カメラとコントロールをリセットします
   * 画像のサイズや縦横比に基づいて最適な表示位置を計算します
   */
  private resetView(): void {
    // ビューをリセット前に現在の情報を保存
    // const startPosition = this.camera.position.clone(); // 未使用の変数を削除
    // const startTarget = this.controls.target.clone(); // 未使用の変数
    
    // カメラの基本位置を設定
    const origin = new THREE.Vector3(0, 0, 0);
    let optimalDistance = this.defaultCameraDistance;
    
    // 画像のアスペクト比と最大サイズを取得
    const aspectRatio = this.pixelGenerator.getImageAspectRatio();
    const maxDimension = this.pixelGenerator.getMaxDimension();
    
    // 画像サイズに基づいて最適なカメラ距離を計算
    if (maxDimension > 0) {
      // カメラの視野角を考慮
      const fov = this.camera.fov;
      
      // 画像全体が視界に入るように距離を計算
      // 画像が大きいほど、より遠くから見る必要がある
      const baseDistance = (maxDimension / 2) / Math.tan((fov / 2) * Math.PI / 180);
      
      // コンテナのアスペクト比を考慮した調整
      const container = document.getElementById('canvas-container');
      if (container) {
        const containerAspect = container.clientWidth / container.clientHeight;
        
        // 画像とコンテナのアスペクト比に基づいて距離を調整
        // 縦長画像は横長コンテナでより遠くから見る必要がある
        if (aspectRatio > 1 && containerAspect > 1) {
          // 縦長画像、横長コンテナ
          optimalDistance = baseDistance * 1.3;
        } else if (aspectRatio < 1 && containerAspect < 1) {
          // 横長画像、縦長コンテナ
          optimalDistance = baseDistance * 1.3;
        } else {
          // その他の組み合わせ
          optimalDistance = baseDistance * 1.2;
        }
      } else {
        // コンテナが取得できない場合はデフォルト値
        optimalDistance = baseDistance * 1.2;
      }
    }
    
    // カメラ位置を設定
    this.camera.position.set(0, optimalDistance * 0.1, optimalDistance);
    this.camera.lookAt(origin);
    
    // コントロールのターゲットをリセット
    this.controls.target.copy(origin);
    
    // カメラトランジションを開始
    this.startCameraTransition(origin, optimalDistance);
    
    // エフェクトを直接リセット
    this.resetEffects();
    
    // グローバルリセット関数を呼び出し
    // これによりLocalStorageと設定がリセットされ、UIが更新される
    if (typeof (window as any).resetControlPanelValues === 'function') {
      // 設定をリセットして全体を更新
      (window as any).resetControlPanelValues();
    }
    
    // コントロールの更新
    this.controls.update();
  }

  /**
   * エフェクトとコントロールを初期値にリセットする専用メソッド
   * より確実にUIとエフェクトを同期します
   */
  private resetEffects(): void {
    // 初期値の定義
    const defaultRotationSpeed = 5;
    const defaultZoom = 50;
    const defaultBloomStrength = CONFIG.bloomStrength;
    const defaultBloomRadius = 0.3;
    const defaultBloomThreshold = 0.75;

    // 1. 内部モデルの値を初期化
    
    // 回転速度を初期値にリセット
    this.pixelGenerator.setRotationSpeed(defaultRotationSpeed);
    
    // ズームを初期値にリセット
    this.updateZoom(defaultZoom);
    
    // ブルームエフェクトを初期値に直接設定
    this.bloomPass.strength = defaultBloomStrength;
    this.bloomPass.radius = defaultBloomRadius;
    this.bloomPass.threshold = defaultBloomThreshold;

    // 2. ControlPanelのスライダーを完全リセット
    this.resetAllSliders({
      rotationSpeed: defaultRotationSpeed,
      zoom: defaultZoom,
      bloomStrength: defaultBloomStrength,
      bloomRadius: defaultBloomRadius,
      bloomThreshold: defaultBloomThreshold
    });
  }

  /**
   * すべてのスライダー要素を確実にリセットする
   * @param {Object} values - 設定すべき各スライダーの値
   */
  private resetAllSliders(values: { 
    rotationSpeed: number, 
    zoom: number, 
    bloomStrength: number, 
    bloomRadius: number, 
    bloomThreshold: number 
  }): void {
    // 1. まずControlPanelクラスで使用されているIDで要素を取得
    this.forceUpdateSlider('rotation-speed', values.rotationSpeed.toString());
    this.forceUpdateSlider('zoom-level', values.zoom.toString());
    
    // ControlPanelクラスではエフェクト強度IDが異なる
    this.forceUpdateSlider('effect-intensity', '50'); // デフォルト値50%
    
    // 2. 直接ブルームパスを更新
    this.bloomPass.strength = values.bloomStrength;
    this.bloomPass.radius = values.bloomRadius;
    this.bloomPass.threshold = values.bloomThreshold;
    
    // 3. LocalStorageも強制的にリセット
    try {
      const defaultSettings = {
        rotationSpeed: 50,
        zoomLevel: 50,
        effectIntensity: 50,
        isAnimating: true
      };
      localStorage.setItem('pixelArtSettings', JSON.stringify(defaultSettings));
      console.log('設定をリセットしました');
    } catch (e) {
      console.warn('設定のリセットに失敗:', e);
    }
    
    // 4. ControlPanelを強制的に再初期化
    this.forceRefreshControlPanel();
  }

  /**
   * 一般的なスライダーを強制的に更新
   * @param {string} sliderId - スライダーのID
   * @param {string} value - 設定する値
   */
  private forceUpdateSlider(sliderId: string, value: string): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    if (!slider) return;
    
    try {
      // 値を設定
      slider.value = value;
      
      // イベントをディスパッチ
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {
      console.warn(`${sliderId}更新エラー:`, e);
    }
  }

  /**
   * アニメーションの有効/無効を切り替えます
   * @param {boolean} isAnimating - アニメーション状態
   */
  private toggleAnimation(isAnimating: boolean): void {
    this.isAnimating = isAnimating;
  }

  /**
   * クリックフォーカス機能をセットアップします
   */
  private setupClickFocus(): void {
    // クリック位置のオブジェクトにフォーカスする処理
    window.addEventListener('dblclick', (event) => {
      // マウス座標を正規化（-1から1の範囲に変換）
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // レイキャスターを使ってオブジェクトを検出
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      
      // シーン内の全オブジェクトを対象に検出
      const intersects = raycaster.intersectObjects(this.scene.children, true);
      
      if (intersects.length > 0) {
        // 一番手前のオブジェクトの位置にフォーカス
        const clickedPoint = intersects[0].point;
        
        // フォーカスとズームを有効にして実行
        this.focusOnPosition(clickedPoint, true);
        
        // フォーカスイベントの発生を表示
        console.log('フォーカス位置:', clickedPoint);
      }
    });
    
    // 操作説明の更新
    const controlsInfo = document.getElementById('controls-info');
    if (controlsInfo) {
      const listElement = controlsInfo.querySelector('ul');
      if (listElement) {
        // すでに追加されているかチェック
        let focusItem = Array.from(listElement.children).find(
          item => item.textContent?.includes('ダブルクリック')
        ) as HTMLLIElement;
        
        // 要素がなければ新しく作成
        if (!focusItem) {
          focusItem = document.createElement('li');
          focusItem.textContent = 'ダブルクリック：特定部分にフォーカスしてズーム';
          listElement.appendChild(focusItem);
        }
      }
    }
  }

  /**
   * ControlPanelを強制的に再初期化する
   * UIの状態をリセットします
   */
  private forceRefreshControlPanel(): void {
    // 1. コントロールパネルの要素をすべて取得
    const controlPanel = document.querySelector('.control-panel');
    if (!controlPanel) return;
    
    try {
      // 2. すべての入力要素をデフォルト値に戻す
      const sliders = controlPanel.querySelectorAll('input[type="range"]');
      sliders.forEach(slider => {
        const id = (slider as HTMLElement).id;
        if (id === 'rotation-speed') (slider as HTMLInputElement).value = '50';
        if (id === 'zoom-level') (slider as HTMLInputElement).value = '50';
        if (id === 'effect-intensity') (slider as HTMLInputElement).value = '50';
        
        // changeイベントを発火
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      // 3. 表示を強制的に更新
      const htmlControlPanel = controlPanel as HTMLElement;
      const oldDisplay = htmlControlPanel.style.display;
      htmlControlPanel.style.display = 'none';
      
      // DOMの再描画を強制
      setTimeout(() => {
        htmlControlPanel.style.display = oldDisplay;
        
        // 4. 念のため特定のスライダーを再度更新
        const effectSlider = document.getElementById('effect-intensity') as HTMLInputElement;
        if (effectSlider) {
          effectSlider.value = '50';
          effectSlider.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 10);
    } catch (e) {
      console.warn('コントロールパネルの更新に失敗:', e);
    }
  }
}

/**
 * DOMContentLoaded イベントで初期化を行います
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    new PixelArtScene();
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
  }
});
