import { useEffect, useMemo, useState } from 'react';
import type { TransformResult, TransformSettings, UploadedImage } from './types';
import { Hero } from './components/Hero';
import { ToolsPanel } from './components/ToolsPanel';
import { UploadPanel } from './components/UploadPanel';
import { createExportFileName, loadImage, transformImage } from './utils/imageTransforms';

const defaultSettings: TransformSettings = {
  background: {
    enabled: true,
    tolerance: 42,
    feather: 18,
  },
  export: {
    format: 'image/png',
    quality: 92,
  },
};

export const App = () => {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [settings, setSettings] = useState<TransformSettings>(defaultSettings);
  const [result, setResult] = useState<TransformResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageMeta = useMemo(() => getImageMeta(image), [image]);

  useEffect(() => cleanupImageUrls(image, result), [image, result]);

  const selectFile = async (file: File | null) => {
    await handleFileSelection(file, setImage, setResult, setError);
  };

  const runTransform = async () => {
    await handleTransform(image, settings, setResult, setError, setIsProcessing);
  };

  const resetTools = () => {
    setSettings(defaultSettings);
    setResult(null);
    setError(null);
  };

  return (
    <main className="app-shell">
      <Hero />
      <section className="workspace-grid" aria-label="Image transformation workspace">
        <UploadPanel
          image={image}
          imageMeta={imageMeta}
          previewUrl={result?.url ?? image?.url ?? null}
          onFileSelect={selectFile}
        />
        <ToolsPanel
          error={error}
          hasImage={Boolean(image)}
          isProcessing={isProcessing}
          result={result}
          settings={settings}
          onReset={resetTools}
          onSettingsChange={setSettings}
          onTransform={runTransform}
        />
      </section>
    </main>
  );
};

const getImageMeta = (image: UploadedImage | null): string => {
  if (!image) {
    return 'No image selected';
  }

  return `${image.width} x ${image.height}px`;
};

const cleanupImageUrls = (image: UploadedImage | null, result: TransformResult | null) => () => {
  if (image) {
    URL.revokeObjectURL(image.url);
  }

  if (result) {
    URL.revokeObjectURL(result.url);
  }
};

const handleFileSelection = async (
  file: File | null,
  setImage: (image: UploadedImage) => void,
  setResult: (result: TransformResult | null) => void,
  setError: (error: string | null) => void,
): Promise<void> => {
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    setError('Please choose an image file.');
    return;
  }

  setError(null);
  setResult(null);
  setImage(await loadImage(file));
};

const handleTransform = async (
  image: UploadedImage | null,
  settings: TransformSettings,
  setResult: (result: TransformResult) => void,
  setError: (error: string | null) => void,
  setIsProcessing: (isProcessing: boolean) => void,
): Promise<void> => {
  if (!image) {
    setError('Upload an image before transforming.');
    return;
  }

  setError(null);
  setIsProcessing(true);

  try {
    const blob = await transformImage(image, settings);
    const url = URL.createObjectURL(blob);
    const fileName = createExportFileName(image.name, settings.export.format);
    setResult({ blob, url, fileName });
  } catch (caughtError) {
    setError(caughtError instanceof Error ? caughtError.message : 'Transform failed.');
  } finally {
    setIsProcessing(false);
  }
};
