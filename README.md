# Realtor Image Suite (Gemini 2.5 Edition)

A production-ready real estate photography suite built with React, Google Gemini 3 Pro, Gemini 2.5 Flash, and Veo.

![App Screenshot](https://placehold.co/1200x600?text=Realtor+Image+Suite+Preview)

## Features

- **MLS Strict Mode**: Enforces compliance with real estate advertising rules (bans adding windows, doors, etc.).
- **AI Workflows**:
  - `Clean Sweep`: Intelligently declutters rooms while keeping furniture.
  - `Twilight Mode`: Converts day exterior shots to dusk/twilight.
  - `Luxury Enhance`: HDR merging and vibrance boosting.
  - `Blue Sky Swap`: Replaces overcast skies with sunny ones.
- **Batch Processing**: Apply edits to multiple listing photos simultaneously.
- **Video Generation**: Create cinematic pans and vertical reels from still images using **Google Veo**.
- **Precise Masking**: In-browser canvas for manual object removal/inpainting.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **AI Models**:
  - `gemini-3-pro-preview`: Reasoning & Logic (Edit Planning)
  - `gemini-2.5-flash-image`: Image Editing & Inpainting
  - `veo-3.1-fast-generate-preview`: Video Generation
  - `gemini-vision`: Image Analysis & Quality Scoring
- **Build Tool**: Vite

## Getting Started

### Prerequisites

You need a Google AI Studio API Key with access to Gemini 2.5 and Veo models.

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/yourusername/realtor-image-suite.git
   cd realtor-image-suite
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. **IMPORTANT: Set up Environment Variables**
   Create a file named `.env` in the root directory and add your API key:
   ```
   VITE_API_KEY=your_actual_gemini_api_key_here
   ```
   
   *Note: Do not commit your .env file to GitHub. The .gitignore file is set up to prevent this.*

4. Run development server:
   ```bash
   npm run dev
   ```

## Deployment

This project is designed to be deployed on **Replit** or **Vercel**.

**Replit Instructions:**
1. Import repo to Replit.
2. Add `API_KEY` to Replit Secrets (Tools -> Secrets).
3. Hit Run.

## License

MIT
