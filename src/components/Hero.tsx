import { Sparkles } from 'lucide-react';

export const Hero = () => (
  <section className="hero">
    <div>
      <span className="eyebrow">
        <Sparkles size={16} />
        ImageTransform
      </span>
      <h1>Transform images in a few clean clicks.</h1>
      <p>
        Upload an image, remove simple backgrounds, change the output format,
        and download a polished result directly from your browser.
      </p>
    </div>
    <div className="status-strip">
      <span>Local processing</span>
      <span>PNG/JPG/WEBP</span>
      <span>Extensible tools</span>
    </div>
  </section>
);
