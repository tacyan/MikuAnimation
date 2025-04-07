import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { PixelGenerator } from './utils/PixelGenerator';
import { ControlPanel } from './components/ControlPanel';

class PixelArtScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private pixelGenerator: PixelGenerator;
  private bloomPass: UnrealBloomPass;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.setupControls();
    this.setupPostProcessing();
    this.setupPixelArt();
    this.setupEventListeners();
    this.animate();
  }

  private setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
  }

  private setupCamera() {
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(ambientLight, directionalLight);
  }

  private setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  private setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.85
    );
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
  }

  private async setupPixelArt() {
    this.pixelGenerator = new PixelGenerator();
    const pixels = await this.pixelGenerator.generateFromImage('src/local_image/C3BUam2VEAACSXg.jpg');
    this.scene.add(pixels);
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    const controlPanel = new ControlPanel({
      onBloomChange: this.updateBloomSettings.bind(this),
      onRotationChange: this.updateRotationSpeed.bind(this)
    });
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateBloomSettings(settings: { strength: number, radius: number, threshold: number }) {
    this.bloomPass.strength = settings.strength;
    this.bloomPass.radius = settings.radius;
    this.bloomPass.threshold = settings.threshold;
  }

  private updateRotationSpeed(speed: number) {
    this.pixelGenerator.setRotationSpeed(speed);
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.pixelGenerator.update();
    this.composer.render();
  }
}

const scene = new PixelArtScene();