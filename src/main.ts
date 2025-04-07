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
  renderScale: 0.75,
  // ピクセル解像度（1は元画像の解像度そのまま、小さくするほどピクセル数減少）
  pixelResolution: 0.4,
  // ブルームエフェクトの初期強度
  bloomStrength: 1.0,
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
    
    // ウィンドウリサイズイベントの設定
    window.addEventListener('resize', this.handleResize.bind(this));
    
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
      antialias: false, // アンチエイリアスを無効化（パフォーマンス向上）
      powerPreference: 'high-performance' // 高性能モードを優先
    });
    
    // ピクセル比を設定（デバイスピクセル比 × レンダリングスケール）
    const pixelRatio = window.devicePixelRatio * CONFIG.renderScale;
    this.renderer.setPixelRatio(pixelRatio);
    
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000);
    
    // 以下の設定でGPUの負荷を軽減
    this.renderer.shadowMap.enabled = false;
    
    container.appendChild(this.renderer.domElement);
  }

  /**
   * カメラを設定します
   */
  private setupCamera(): void {
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * ライトを設定します
   */
  private setupLights(): void {
    // シンプルなライト構成でパフォーマンスを向上
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
  }

  /**
   * OrbitControlsを設定します
   */
  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // コントロールの負荷を軽減する設定
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.7;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
    this.controls.enablePan = false;  // パン機能を無効化
    this.controls.maxDistance = 20;   // ズームアウトの制限
    this.controls.minDistance = 3;    // ズームインの制限
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

    // ブルームエフェクトの追加（軽量化した設定）
    const size = this.renderer.getSize(new THREE.Vector2());
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width * CONFIG.renderScale, size.height * CONFIG.renderScale),
      CONFIG.bloomStrength, 0.4, 0.85
    );
    
    // サンプル数を減らしてパフォーマンスを向上（kernelSizeプロパティがない場合はスキップ）
    try {
      // @ts-ignore
      this.bloomPass.kernelSize = 2;
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
      const pixels = await this.pixelGenerator.generateFromImage('/src/local_image/C3BUam2VEAACSXg.jpg');
      this.scene.add(pixels);
    } catch (error) {
      console.error('ピクセルアートの生成に失敗しました:', error);
    }
  }

  /**
   * コントロールパネルを設定します
   */
  private setupControlPanel(): void {
    const controlPanel = new ControlPanel({
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
    
    // コントロールの更新
    this.controls.update();
    
    // アニメーション中であれば、ピクセルジェネレータを更新
    if (this.isAnimating) {
      this.pixelGenerator.update();
    }
    
    // シーンのレンダリング
    this.composer.render();
    
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
   * @param {number} zoom - ズーム値
   */
  private updateZoom(zoom: number): void {
    this.camera.position.z = 15 - (zoom / 10);
  }

  /**
   * カメラとコントロールをリセットします
   */
  private resetView(): void {
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
    this.controls.reset();
  }

  /**
   * アニメーションの有効/無効を切り替えます
   * @param {boolean} isAnimating - アニメーション状態
   */
  private toggleAnimation(isAnimating: boolean): void {
    this.isAnimating = isAnimating;
  }
}

/**
 * DOMContentLoaded イベントで初期化を行います
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    const scene = new PixelArtScene();
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
  }
});