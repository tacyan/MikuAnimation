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
  onImageUpload?: (imageData: string) => void;
  onStopRotation?: () => void;
}

interface ControlPanelSettings {
  rotationSpeed: number;
  zoomLevel: number;
  effectIntensity: number;
  isAnimating: boolean;
  isRotating: boolean;
  previousRotationSpeed?: number;
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
    imageUpload?: HTMLInputElement;
    uploadButton?: HTMLButtonElement;
    stopRotation?: HTMLButtonElement;
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
    this.elements.imageUpload = document.getElementById('image-upload') as HTMLInputElement;
    this.elements.uploadButton = document.getElementById('upload-button') as HTMLButtonElement;
    this.elements.stopRotation = document.getElementById('stop-rotation') as HTMLButtonElement;
    
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
    
    if (this.elements.imageUpload) {
      this.elements.imageUpload.addEventListener('change', this.handleImageSelect.bind(this));
    }
    
    if (this.elements.uploadButton) {
      this.elements.uploadButton.addEventListener('click', this.handleUploadClick.bind(this));
    }
    
    if (this.elements.stopRotation) {
      this.elements.stopRotation.addEventListener('click', this.handleStopRotation.bind(this));
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
    
    // 速度が0より大きい場合は回転中とみなす
    if (speed > 0) {
      this.settings.isRotating = true;
      if (this.elements.stopRotation) {
        this.elements.stopRotation.textContent = '回転停止';
      }
    } else {
      this.settings.isRotating = false;
      if (this.elements.stopRotation) {
        this.elements.stopRotation.textContent = '回転開始';
      }
    }
    
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
    
    // エフェクト強度から各パラメータを計算（非線形マッピングを使用）
    // 低い値でも適度な効果を得られるように指数関数的なカーブを使用
    const normalizedIntensity = intensity / 100;
    
    // 強度：低い値でもある程度の効果を持ち、高い値では緩やかに増加
    const strength = Math.pow(normalizedIntensity, 1.5) * 2.5 + (normalizedIntensity * 0.5);
    
    // 半径：低い値ではより小さく、高い値でより広がる
    const radius = Math.pow(normalizedIntensity, 1.2) * 0.8 + (normalizedIntensity * 0.2);
    
    // 閾値：高い値ほど光る部分が少なくなる（反比例的な関係）
    const threshold = Math.max(0.1, 1 - Math.pow(normalizedIntensity, 0.8));
    
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
      zoomLevel: 50,
      effectIntensity: 50,
      isAnimating: true,
      isRotating: true,
      previousRotationSpeed: 50
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

  /**
   * 画像選択を処理します
   */
  private handleImageSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        if (this.callbacks.onImageUpload) {
          this.callbacks.onImageUpload(imageData);
        }
      };
      
      reader.onerror = () => {
        console.error('画像の読み込みに失敗しました');
      };
      
      reader.readAsDataURL(file);
    }
  }

  /**
   * アップロードボタンのクリックを処理します
   */
  private handleUploadClick(): void {
    if (this.elements.imageUpload) {
      this.elements.imageUpload.click();
    }
  }

  /**
   * 回転停止ボタンのクリックを処理します
   */
  private handleStopRotation(): void {
    if (this.elements.rotationSpeed) {
      if (this.settings.isRotating) {
        // 回転停止
        this.settings.previousRotationSpeed = parseInt(this.elements.rotationSpeed.value, 10);
        this.elements.rotationSpeed.value = '0';
        this.settings.isRotating = false;
        
        if (this.elements.stopRotation) {
          this.elements.stopRotation.textContent = '回転開始';
        }
      } else {
        // 回転再開
        const previousSpeed = this.settings.previousRotationSpeed || 50;
        this.elements.rotationSpeed.value = previousSpeed.toString();
        this.settings.isRotating = true;
        
        if (this.elements.stopRotation) {
          this.elements.stopRotation.textContent = '回転停止';
        }
      }
      
      this.handleRotationChange({ target: this.elements.rotationSpeed } as Event);
      this.saveSettings();
    }
    
    if (this.callbacks.onStopRotation) {
      this.callbacks.onStopRotation();
    }
  }
}