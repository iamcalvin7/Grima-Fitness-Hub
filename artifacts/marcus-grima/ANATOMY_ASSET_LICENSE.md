# Anatomy Asset License

## Asset Details

| Field | Detail |
|---|---|
| **Asset name** | body-highlighter SVG polygon data (anterior & posterior anatomical body maps) |
| **Original creator** | GV79 |
| **Source** | https://github.com/GV79/body-highlighter (npm: `body-highlighter`) |
| **Version used** | 3.0.2 |
| **License** | MIT License |
| **Commercial use** | ✅ Permitted |
| **Modification** | ✅ Permitted |
| **Distribution** | ✅ Permitted (with license notice) |

## Required Attribution

> MIT License  
> Copyright (c) 2020 GV79  
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:  
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

## Description of Changes Made

The original `body-highlighter` library renders a vanilla-JS DOM-based SVG body map with configurable highlight colours. For this project, the following changes were made:

1. **Extraction**: The SVG polygon point data (`anteriorData` and `posteriorData` arrays) was extracted from the library source and inlined directly into a React + TypeScript component (`BodyMap.tsx`).
2. **Framework**: Re-implemented as a React component with TypeScript types, replacing the vanilla JS DOM API with declarative JSX.
3. **Styling**: Recoloured to match the dark brand palette (`#1b1b1b` base, `#8B45D9`/`#A565F2` for selected muscles, `rgba(139,69,217,0.38)` glow).
4. **Interaction model**: Added multi-select, display-mode (via `musclesWorked` prop), front/back animated toggle, and pill-shaped muscle chips.
5. **Muscle mapping**: Created a `MUSCLE_CONFIG` registry mapping application-level `MuscleId` values to the library's polygon IDs, and a `WORKOUT_MAP` translating workout exercise names to muscle groups.
6. **Accessibility**: Added `aria-label`, `aria-pressed`, `role="button"` attributes to interactive polygons and chip buttons; focus-visible ring states.

No proprietary artwork from MuscleWiki, Whoop, or other third-party fitness platforms was used. The polygon coordinates used are solely those from the MIT-licensed `body-highlighter` package.
