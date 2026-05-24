import { Download, Eraser, Loader2, RefreshCcw, Settings2, Sparkles, Upload } from 'lucide-react';
import { formatLabels } from '../constants';
import type { OutputFormat, TransformResult, TransformSettings } from '../types';

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
      <span>Remove sampled background</span>
      <input
        checked={settings.background.enabled}
        type="checkbox"
        onChange={(event) => onSettingsChange({
          ...settings,
          background: { ...settings.background, enabled: event.target.checked },
        })}
      />
    </label>
    <BackgroundSliders settings={settings} onSettingsChange={onSettingsChange} />
  </div>
);

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
    <RangeField
      label="Quality"
      max={100}
      min={10}
      value={settings.export.quality}
      onChange={(quality) => onSettingsChange({ ...settings, export: { ...settings.export, quality } })}
    />
  </div>
);

const RangeField = ({ label, max, min, value, onChange }: RangeFieldProps) => (
  <label className="range-field">
    <span>{label}</span>
    <input
      max={max}
      min={min}
      type="range"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

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
