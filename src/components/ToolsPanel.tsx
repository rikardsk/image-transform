import { useEffect, useState } from 'react';
import { Download, Eraser, Loader2, RefreshCcw, Settings2, Sparkles, Upload } from 'lucide-react';
import { formatLabels } from '../constants';
import type { OutputFormat, TransformResult, TransformSettings } from '../types';
import { cleanHex, normalizeHexColor } from '../utils/imageTransforms';

type ToolsPanelProps = {
  error: string | null;
  hasImage: boolean;
  isProcessing: boolean;
  result: TransformResult | null;
  settings: TransformSettings;
  onReset: () => void;
  onSettingsChange: (settings: TransformSettings) => void;
  onTransform: () => Promise<void>;
};

export const ToolsPanel = (props: ToolsPanelProps) => (
  <aside className="tools-panel" aria-label="Transform settings">
    <div className="panel-heading">
      <Settings2 size={20} />
      <h2>Tools</h2>
    </div>
    <BackgroundTools settings={props.settings} onSettingsChange={props.onSettingsChange} />
    <ExportTools settings={props.settings} onSettingsChange={props.onSettingsChange} />
    {props.error && <p className="error-message">{props.error}</p>}
    <ActionRow {...props} />
  </aside>
);

const BackgroundTools = ({
  settings,
  onSettingsChange,
}: Pick<ToolsPanelProps, 'settings' | 'onSettingsChange'>) => (
  <div className="tool-block">
    <div className="tool-title">
      <Eraser size={18} />
      <span>Background</span>
    </div>
    <label className="toggle-row">
      <span>Remove background</span>
      <input
        checked={settings.background.enabled}
        type="checkbox"
        onChange={(event) => onSettingsChange({
          ...settings,
          background: { ...settings.background, enabled: event.target.checked },
        })}
      />
    </label>
    {settings.background.enabled && (
      <>
        <BackgroundModeSelect settings={settings} onSettingsChange={onSettingsChange} />
        <BackgroundSliders settings={settings} onSettingsChange={onSettingsChange} />
        <ReplacementBackgroundTools settings={settings} onSettingsChange={onSettingsChange} />
      </>
    )}
  </div>
);

const BackgroundModeSelect = ({
  settings,
  onSettingsChange,
}: Pick<ToolsPanelProps, 'settings' | 'onSettingsChange'>) => {
  const mode = settings.background.mode ?? 'auto';

  return (
    <div className="mode-section">
      <div className="sub-title">Remove Color</div>
      <div className="segmented-control" role="group" aria-label="Detection mode">
        <button
          className={mode === 'auto' ? 'active' : ''}
          type="button"
          onClick={() => onSettingsChange({
            ...settings,
            background: { ...settings.background, mode: 'auto' },
          })}
        >
          Auto (Corners)
        </button>
        <button
          className={mode === 'custom' ? 'active' : ''}
          type="button"
          onClick={() => onSettingsChange({
            ...settings,
            background: { ...settings.background, mode: 'custom' },
          })}
        >
          Specific Color
        </button>
      </div>
      {mode === 'custom' && (
        <ColorPickerField settings={settings} onSettingsChange={onSettingsChange} />
      )}
    </div>
  );
};

type HexColorFieldProps = {
  value: string;
  onChange: (color: string) => void;
};

const useHexInput = (value: string, onChange: (color: string) => void) => {
  const [text, setText] = useState(() => cleanHex(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(cleanHex(value));
    }
  }, [value, isFocused]);

  const handleChange = (rawInput: string) => {
    const cleaned = cleanHex(rawInput);
    setText(cleaned);

    if (cleaned.length === 6) {
      onChange(`#${cleaned.toLowerCase()}`);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = normalizeHexColor(text);
    if (normalized) {
      onChange(normalized);
      setText(cleanHex(normalized));
      return;
    }

    setText(cleanHex(value));
  };

  return { text, handleChange, handleBlur, handleFocus: () => setIsFocused(true) };
};

const HexColorField = ({ value, onChange }: HexColorFieldProps) => {
  const { text, handleChange, handleBlur, handleFocus } = useHexInput(value, onChange);
  const pickerValue = normalizeHexColor(value) ?? '#ffffff';

  return (
    <div className="hex-color-field">
      <input
        aria-label="Color preview and picker"
        className="color-swatch-input"
        type="color"
        value={pickerValue}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="hex-input-group">
        <span className="hex-prefix" aria-hidden="true">#</span>
        <input
          aria-label="Hex color value"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="hex-text-input"
          data-1p-ignore="true"
          data-lpignore="true"
          maxLength={6}
          name="hex-color-input"
          placeholder="FFFFFF"
          spellCheck={false}
          type="text"
          value={text}
          onBlur={handleBlur}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={handleFocus}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
      </div>
    </div>
  );
};

const ColorPickerField = ({
  settings,
  onSettingsChange,
}: Pick<ToolsPanelProps, 'settings' | 'onSettingsChange'>) => {
  const currentColor = settings.background.customColor ?? '#ffffff';

  const updateColor = (customColor: string) => {
    onSettingsChange({
      ...settings,
      background: { ...settings.background, customColor },
    });
  };

  return (
    <div className="color-picker-row">
      <HexColorField value={currentColor} onChange={updateColor} />
      <div className="color-presets">
        <button
          className={currentColor.toLowerCase() === '#ffffff' ? 'active' : ''}
          type="button"
          onClick={() => updateColor('#ffffff')}
        >
          White
        </button>
        <button
          className={currentColor.toLowerCase() === '#000000' ? 'active' : ''}
          type="button"
          onClick={() => updateColor('#000000')}
        >
          Black
        </button>
      </div>
    </div>
  );
};

const replacementPresets = [
  { name: 'Dark Slate', value: '#1e293b' },
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Deep Black', value: '#000000' },
  { name: 'Forest', value: '#14532d' },
  { name: 'Navy', value: '#1e3a8a' },
  { name: 'Cream', value: '#fef3c7' },
];

const ReplacementBackgroundTools = ({
  settings,
  onSettingsChange,
}: Pick<ToolsPanelProps, 'settings' | 'onSettingsChange'>) => {
  const replacementType = settings.background.replacementType ?? 'transparent';

  return (
    <div className="mode-section">
      <div className="sub-title">New Background</div>
      <div className="segmented-control" role="group" aria-label="New background type">
        <button
          className={replacementType === 'transparent' ? 'active' : ''}
          type="button"
          onClick={() => onSettingsChange({
            ...settings,
            background: { ...settings.background, replacementType: 'transparent' },
          })}
        >
          Transparent
        </button>
        <button
          className={replacementType === 'color' ? 'active' : ''}
          type="button"
          onClick={() => onSettingsChange({
            ...settings,
            background: { ...settings.background, replacementType: 'color' },
          })}
        >
          Solid Color
        </button>
      </div>
      {replacementType === 'color' && (
        <ReplacementColorPicker settings={settings} onSettingsChange={onSettingsChange} />
      )}
    </div>
  );
};

const ReplacementColorPicker = ({
  settings,
  onSettingsChange,
}: Pick<ToolsPanelProps, 'settings' | 'onSettingsChange'>) => {
  const currentColor = settings.background.replacementColor ?? '#1e293b';

  const updateColor = (replacementColor: string) => {
    onSettingsChange({
      ...settings,
      background: { ...settings.background, replacementColor },
    });
  };

  return (
    <div className="replacement-color-picker">
      <div className="color-picker-row">
        <HexColorField value={currentColor} onChange={updateColor} />
      </div>
      <div className="preset-swatches">
        {replacementPresets.map((preset) => (
          <button
            className={`swatch-btn ${currentColor.toLowerCase() === preset.value.toLowerCase() ? 'active' : ''}`}
            key={preset.value}
            style={{ backgroundColor: preset.value }}
            title={preset.name}
            type="button"
            onClick={() => updateColor(preset.value)}
          />
        ))}
      </div>
    </div>
  );
};

const BackgroundSliders = ({
  settings,
  onSettingsChange,
}: Pick<ToolsPanelProps, 'settings' | 'onSettingsChange'>) => (
  <>
    <RangeField
      label="Tolerance"
      max={120}
      min={5}
      value={settings.background.tolerance}
      onChange={(tolerance) => onSettingsChange({
        ...settings,
        background: { ...settings.background, tolerance },
      })}
    />
    <RangeField
      label="Edge softness"
      max={80}
      min={0}
      value={settings.background.feather}
      onChange={(feather) => onSettingsChange({
        ...settings,
        background: { ...settings.background, feather },
      })}
    />
    <RangeField
      label="Remove halo (Defringe)"
      max={100}
      min={0}
      value={settings.background.defringe ?? 0}
      onChange={(defringe) => onSettingsChange({
        ...settings,
        background: { ...settings.background, defringe },
      })}
    />
  </>
);

const ExportTools = ({
  settings,
  onSettingsChange,
}: Pick<ToolsPanelProps, 'settings' | 'onSettingsChange'>) => (
  <div className="tool-block">
    <div className="tool-title">
      <Upload size={18} />
      <span>Export</span>
    </div>
    <div className="format-grid" role="group" aria-label="Output format">
      {(Object.keys(formatLabels) as OutputFormat[]).map((format) => (
        <button
          className={settings.export.format === format ? 'active' : ''}
          key={format}
          type="button"
          onClick={() => onSettingsChange({ ...settings, export: { ...settings.export, format } })}
        >
          {formatLabels[format]}
        </button>
      ))}
    </div>
    {settings.background.enabled && settings.background.replacementType !== 'color' && settings.export.format === 'image/jpeg' && (
      <p className="format-hint">
        Note: JPG does not support transparency. Select PNG or WEBP to keep the background transparent, or choose a solid background color.
      </p>
    )}
    <RangeField
      label="Quality"
      max={100}
      min={10}
      value={settings.export.quality}
      onChange={(quality) => onSettingsChange({ ...settings, export: { ...settings.export, quality } })}
    />
  </div>
);

const RangeField = ({ label, max, min, value, onChange }: RangeFieldProps) => {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="range-field">
      <div className="range-header">
        <span>{label}</span>
        <span className="range-value-pill">{value}</span>
      </div>
      <div className="range-slider-wrapper">
        <input
          max={max}
          min={min}
          title={`${label}: ${value}`}
          type="range"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span
          aria-hidden="true"
          className="range-tooltip"
          style={{ left: `${percent}%` }}
        >
          {value}
        </span>
      </div>
    </div>
  );
};

type RangeFieldProps = {
  label: string;
  max: number;
  min: number;
  value: number;
  onChange: (value: number) => void;
};

const ActionRow = ({ hasImage, isProcessing, result, onReset, onTransform }: ToolsPanelProps) => (
  <>
    <div className="action-row">
      <button className="secondary-button" type="button" onClick={onReset}>
        <RefreshCcw size={18} />
        Reset
      </button>
      <button
        className="primary-button"
        disabled={!hasImage || isProcessing}
        type="button"
        onClick={onTransform}
      >
        {isProcessing ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
        Transform
      </button>
    </div>
    <a
      className={`download-button ${result ? '' : 'disabled'}`}
      download={result?.fileName}
      href={result?.url ?? '#'}
      aria-disabled={!result}
    >
      <Download size={18} />
      Download result
    </a>
  </>
);
