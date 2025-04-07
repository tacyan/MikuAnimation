import React, { useState, useEffect } from 'react';

const ControlPanel: React.FC = () => {
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [zoom, setZoom] = useState(5);
  const [bloomStrength, setBloomStrength] = useState(1.5);
  const [bloomRadius, setBloomRadius] = useState(0.4);
  const [bloomThreshold, setBloomThreshold] = useState(0.85);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('pixelArtSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setRotationSpeed(settings.rotationSpeed);
        setZoom(settings.zoom);
        setBloomStrength(settings.bloomStrength);
        setBloomRadius(settings.bloomRadius);
        setBloomThreshold(settings.bloomThreshold);
        setAutoRotate(settings.autoRotate);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = () => {
    const settings = {
      rotationSpeed,
      zoom,
      bloomStrength,
      bloomRadius,
      bloomThreshold,
      autoRotate
    };
    localStorage.setItem('pixelArtSettings', JSON.stringify(settings));
  };

  return (
    <Card className="w-full bg-[#ffffff] dark:bg-[#1a1a1a]">
      <CardHeader>
        <CardTitle className="text-[#000000] dark:text-[#ffffff]">アニメーション設定</CardTitle>
        <CardDescription className="text-[#666666] dark:text-[#cccccc]">
          各パラメータを調整してアニメーションをカスタマイズできます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rotation-speed" className="text-[#000000] dark:text-[#ffffff]">
            回転速度: {rotationSpeed}
          </Label>
          <Input
            id="rotation-speed"
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zoom" className="text-[#000000] dark:text-[#ffffff]">
            ズーム: {zoom}
          </Label>
          <Input
            id="zoom"
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloom-strength" className="text-[#000000] dark:text-[#ffffff]">
            発光強度: {bloomStrength}
          </Label>
          <Input
            id="bloom-strength"
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={bloomStrength}
            onChange={(e) => setBloomStrength(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloom-radius" className="text-[#000000] dark:text-[#ffffff]">
            発光半径: {bloomRadius}
          </Label>
          <Input
            id="bloom-radius"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={bloomRadius}
            onChange={(e) => setBloomRadius(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloom-threshold" className="text-[#000000] dark:text-[#ffffff]">
            発光閾値: {bloomThreshold}
          </Label>
          <Input
            id="bloom-threshold"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={bloomThreshold}
            onChange={(e) => setBloomThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="auto-rotate"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
            className="w-4 h-4"
          />
          <Label htmlFor="auto-rotate" className="text-[#000000] dark:text-[#ffffff]">
            自動回転
          </Label>
        </div>

        <Button
          onClick={saveSettings}
          className="w-full bg-[#4a90e2] hover:bg-[#357abd] text-white"
        >
          設定を保存
        </Button>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;