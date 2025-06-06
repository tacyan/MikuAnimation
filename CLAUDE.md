# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MikuAnimation is a Three.js-based web application that converts 2D images into interactive 3D pixel art animations. The project uses TypeScript, Vite for building, and Three.js for 3D rendering.

## Development Commands

```bash
npm run dev      # Start development server on port 3000
npm run build    # Build for production (TypeScript + Vite)
npm run preview  # Preview production build
npm run lint     # Run ESLint checks
npm run format   # Format code with Prettier
```

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **`src/main.ts`** - Entry point containing the `PixelArtScene` class that orchestrates the entire application
- **`src/utils/PixelGenerator.ts`** - Core logic for converting 2D images to 3D pixel representations using instanced meshes
- **`src/utils/TextureLoader.ts`** - Handles image loading and texture creation
- **`src/components/ControlPanel.ts`** - UI controls for adjusting animation parameters (rotation speed, render scale, pixel resolution)

## Key Technical Details

1. **Performance Optimization**: Uses Three.js InstancedMesh for efficient rendering of thousands of pixels
2. **Settings Persistence**: Stores user preferences in localStorage
3. **Responsive Design**: Handles window resizing and mobile displays
4. **Interactive Controls**: OrbitControls for camera movement, double-click to focus
5. **Post-processing**: Bloom effects using EffectComposer

## Working with Images

- Default image: `src/local_image/C3BUam2VEAACSXg.jpg`
- To change the displayed image, modify the `imageUrl` in `src/main.ts`
- The system automatically converts any image to 3D pixel art

## Testing and Quality

When making changes:
1. Run `npm run lint` to check for code issues
2. Run `npm run format` to ensure consistent formatting
3. Test in development with `npm run dev` before building
4. Verify the production build with `npm run build && npm run preview`