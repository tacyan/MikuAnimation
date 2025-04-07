/**
 * @fileoverview コントロールパネルのクラス
 * 
 * このファイルでは、アニメーションの設定を制御するためのUIコンポーネントを定義します。
 * DOMイベントを処理し、コールバック関数を通じて設定の変更を通知します。
 */

interface ControlPanelCallbacks {
  onBloomChange?: (settings: { strength: number, radius: number, threshold: number }) => void;
  onRotationChange?: (speed: number) => void;
  onZoomChange?: (zoom: number) => void;
  onResetView?: () => void;
  onToggleAnimation?: (isAnimating: boolean) => void;
}

interface ControlPanelSettings {
  rotationSpeed: number;
  zoomLevel: number;
  effectIntensity: number;
  isAnimating: boolean;
}

/**
 * コントロールパネルクラス
 * アニメーション設定用のUIを提供します
 */
export class ControlPanel {
  private callbacks: ControlPanelCallbacks;
  private settings: ControlPanelSettings;
  private elements: {
    rotationSpeed?: HTMLInputElement;
    zoomLevel?: HTMLInputElement;
    effectIntensity?: HTMLInputElement;
    resetView?: HTMLButtonElement;
    toggleAnimation?: HTMLButtonElement;
  };

  /**
   * コンストラクタ
   * @param {ControlPanelCallbacks} callbacks - コールバック関数のオブジェクト
   */
  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.settings = this.loadSettings();
    this.elements = {};
    
    this.initializeUI();
  }

  /**
   * UIを初期化します
   */
  private initializeUI(): void {
    // コントロール要素の取得
    this.elements.rotationSpeed = document.getElementById('rotation-speed') as HTMLInputElement;
    this.elements.zoomLevel = document.getElementById('zoom-level') as HTMLInputElement;
    this.elements.effectIntensity = document.getElementById('effect-intensity') as HTMLInputElement;
    this.elements.resetView = document.getElementById('reset-view') as HTMLButtonElement;
    this.elements.toggleAnimation = document.getElementById('toggle-animation') as HTMLButtonElement;
    
    // 保存された設定を適用
    if (this.elements.rotationSpeed) {
      this.elements.rotationSpeed.value = this.settings.rotationSpeed.toString();
    }
    
    if (this.elements.zoomLevel) {
      this.elements.zoomLevel.value = this.settings.zoomLevel.toString();
    }
    
    if (this.elements.effectIntensity) {
      this.elements.effectIntensity.value = this.settings.effectIntensity.toString();
    }
    
    // イベントリスナーを設定
    this.setupEventListeners();
  }

  /**
   * イベントリスナーを設定します
   */
  private setupEventListeners(): void {
    if (this.elements.rotationSpeed) {
      this.elements.rotationSpeed.addEventListener('input', this.handleRotationChange.bind(this));
    }
    
    if (this.elements.zoomLevel) {
      this.elements.zoomLevel.addEventListener('input', this.handleZoomChange.bind(this));
    }
    
    if (this.elements.effectIntensity) {
      this.elements.effectIntensity.addEventListener('input', this.handleEffectChange.bind(this));
    }
    
    if (this.elements.resetView) {
      this.elements.resetView.addEventListener('click', this.handleResetView.bind(this));
    }
    
    if (this.elements.toggleAnimation) {
      this.elements.toggleAnimation.addEventListener('click', this.handleToggleAnimation.bind(this));
    }
  }

  /**
   * 回転速度の変更を処理します
   * @param {Event} event - 入力イベント
   */
  private handleRotationChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const speed = parseInt(target.value, 10);
    this.settings.rotationSpeed = speed;
    
    if (this.callbacks.onRotationChange) {
      this.callbacks.onRotationChange(speed);
    }
    
    this.saveSettings();
  }

  /**
   * ズームレベルの変更を処理します
   * @param {Event} event - 入力イベント
   */
  private handleZoomChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const zoom = parseInt(target.value, 10);
    this.settings.zoomLevel = zoom;
    
    if (this.callbacks.onZoomChange) {
      this.callbacks.onZoomChange(zoom);
    }
    
    this.saveSettings();
  }

  /**
   * エフェクト強度の変更を処理します
   * @param {Event} event - 入力イベント
   */
  private handleEffectChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const intensity = parseInt(target.value, 10);
    this.settings.effectIntensity = intensity;
    
    // エフェクト強度から各パラメータを計算
    const strength = intensity / 100 * 3;
    const radius = intensity / 100 * 1;
    const threshold = Math.max(0.1, 1 - intensity / 100);
    
    if (this.callbacks.onBloomChange) {
      this.callbacks.onBloomChange({ strength, radius, threshold });
    }
    
    this.saveSettings();
  }

  /**
   * ビューのリセットを処理します
   */
  private handleResetView(): void {
    if (this.callbacks.onResetView) {
      this.callbacks.onResetView();
    }
  }

  /**
   * アニメーションの切り替えを処理します
   */
  private handleToggleAnimation(): void {
    this.settings.isAnimating = !this.settings.isAnimating;
    
    if (this.callbacks.onToggleAnimation) {
      this.callbacks.onToggleAnimation(this.settings.isAnimating);
    }
    
    if (this.elements.toggleAnimation) {
      this.elements.toggleAnimation.textContent = 
        this.settings.isAnimating ? 'アニメーション OFF' : 'アニメーション ON';
    }
    
    this.saveSettings();
  }

  /**
   * 設定を読み込みます
   * @returns {ControlPanelSettings} - 読み込まれた設定
   */
  private loadSettings(): ControlPanelSettings {
    const defaultSettings: ControlPanelSettings = {
      rotationSpeed: 50,
      zoomLevel: 100,
      effectIntensity: 50,
      isAnimating: true
    };
    
    try {
      const savedSettings = localStorage.getItem('pixelArtSettings');
      if (savedSettings) {
        return { ...defaultSettings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    }
    
    return defaultSettings;
  }

  /**
   * 設定を保存します
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('pixelArtSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    }
  }
}