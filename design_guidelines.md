# Spotify Drum Track Visualizer - Design Guidelines

## Design Approach
**Reference-Based: Spotify + Professional Audio Interface**
Drawing from Spotify's dark, immersive aesthetic combined with professional audio software design patterns (Ableton, FL Studio). The design balances music streaming elegance with precision audio tooling.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary** (all colors in H S% L% format):
- Background Deep: 0 0% 7%
- Background Mid: 0 0% 10%
- Background Elevated: 0 0% 14%
- Spotify Green: 141 73% 42%
- Purple Accent (Beat Viz): 270 80% 65%
- Text Primary: 0 0% 95%
- Text Secondary: 0 0% 65%
- Border Subtle: 0 0% 20%

**Drum Track Colors**:
- Kick: 350 85% 58% (vibrant red)
- Snare: 45 95% 55% (bright yellow)
- Hi-hat: 195 75% 60% (cyan blue)

### B. Typography
**Fonts**: Circular (Spotify's font via Google Fonts fallback: 'Inter', sans-serif)
- Display (Hero): 700 weight, 3.5rem → 2.5rem mobile
- Heading (H2): 600 weight, 2rem → 1.5rem mobile
- Subheading: 500 weight, 1.25rem
- Body: 400 weight, 1rem
- Caption: 400 weight, 0.875rem, 65% opacity

### C. Layout System
**Spacing Units**: Tailwind 4, 6, 8, 12, 16, 24
- Section padding: py-16 (desktop), py-12 (mobile)
- Component gaps: gap-6 standard, gap-4 tight
- Container: max-w-7xl with px-6

### D. Component Library

**Button**:
- Primary (Spotify Green): Rounded-full, px-8 py-3, 500 weight, hover brightness increase
- Outline: 2px border, backdrop-blur-md, bg-black/20 on images, hover bg-white/10
- Icon buttons: Square 44x44px minimum touch target

**Badge**:
- Pill-shaped with drum type colors
- Small: px-3 py-1, 0.75rem text
- Pulsing animation for active beats

**File Upload Zone**:
- Large dashed border (2px, border-dashed)
- Background: 0 0% 12% with hover to 14%
- Min-height: 200px
- Drag-over state: border-color Spotify Green, bg-green/5

**Visualization Canvas**:
- Full-width container with 16:9 aspect ratio minimum
- Dark background (0 0% 8%)
- Grid overlay with subtle lines (20% opacity)
- Waveform-style beat markers with glow effects
- Timeline scrubber in Spotify Green

**Transport Controls**:
- Play/Pause: Large circular button (64px) with Spotify Green fill
- Skip buttons flanking play at 48px
- Progress bar: Full-width with thumb, purple fill for active beats
- Time display: Monospace font, 0.875rem

**Drum Track Legend**:
- Horizontal pill badges showing Kick/Snare/Hi-hat
- Color-coded with glow effects matching visualization
- Toggle switches to show/hide tracks

### E. Layout Architecture

**Hero Section** (100vh):
- Large background image: Abstract music/audio waveform visualization (dark with purple/green accents)
- Centered content with backdrop-blur container
- Headline: "Visualisera Dina Trummor" (2.5rem)
- Subheading explaining audio analysis feature
- Primary CTA: "Ladda Upp Ljudfil" (Spotify Green button)
- Floating UI elements: Small badge showing "Powered by basic-pitch"

**Analysis Dashboard** (Main View):
- Two-column grid (lg:grid-cols-3 with 2:1 ratio)
- Left (2/3): Canvas visualization area with transport controls below
- Right (1/3): Upload zone + drum track controls + export options
- Sticky sidebar on scroll for controls

**Audio Controls Panel**:
- Card elevation: bg-background-elevated, rounded-2xl, border subtle
- Sections: File info, playback speed, volume, track toggles
- Visual feedback: Purple glow on active track detection

**Footer**:
- Minimal: Copyright, language selector, GitHub link
- Dark subtle background (0 0% 9%)

## Images

**Hero Background Image**:
- **Placement**: Full-bleed background covering entire hero viewport
- **Description**: Dark abstract visualization of audio waveforms/frequency spectrum. Purple and green gradient accents creating depth. Slightly blurred to not compete with text. Professional, modern, cinematic feel.
- **Treatment**: Overlay with radial gradient (black center to transparent) for text readability
- **Note**: Critical for establishing music-focused, premium aesthetic

**Placeholder States**:
- Empty canvas: Subtle waveform pattern graphic with "Ladda upp en fil för att börja" text
- Processing state: Animated circular waveform loader in Spotify Green

## Interaction Patterns

**Micro-interactions**:
- Beat detection: Purple pulse on canvas + matching badge glow (100ms)
- Hover states: Subtle scale (1.02) + brightness increase
- Upload success: Green checkmark animation with bounce
- Playback: Smooth scrubber movement with easing

**Animations**: Minimal, purposeful only
- Beat pulses: CSS scale animation (200ms ease-out)
- Canvas rendering: Smooth 60fps requestAnimationFrame
- Transitions: 150ms cubic-bezier for all state changes

## Swedish Interface Copy
- "Ladda Upp Ljudfil" (Upload Audio File)
- "Analyserar..." (Analyzing)
- "Spela/Pausa" (Play/Pause)
- "Exportera MIDI" (Export MIDI)
- "Trumspår" (Drum Tracks)
- "Bastrumma/Virveltrumma/Hi-hat" labels