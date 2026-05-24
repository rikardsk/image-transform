# Image Transform

Image Transform is a small browser-based image utility built with React, Vite, and TypeScript. It lets you upload an image, remove a sampled background, tune tolerance and edge softness, then export the result as PNG, JPG, or WebP.

## Features

- Upload and preview local image files
- Remove a background color sampled from the image corners
- Adjust background tolerance and edge softness
- Export as PNG, JPG, or WebP
- Choose export quality

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- Lucide React icons

## Getting Started

Install dependencies:

```powershell
npm install
```

Run the development server:

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
```

Run tests:

```powershell
npm run test
```

## Project Structure

```text
src/
├── components/
│   ├── Hero.tsx
│   ├── ToolsPanel.tsx
│   └── UploadPanel.tsx
├── utils/
│   ├── imageTransforms.test.ts
│   └── imageTransforms.ts
├── App.tsx
├── constants.ts
├── main.tsx
├── styles.css
└── types.ts
```

## Notes

All image processing runs locally in the browser with the Canvas API.
