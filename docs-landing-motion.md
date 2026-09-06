# StudyFlow landing and motion

## Routes

- `/`: public landing, with or without an authenticated session.
- `/panel`: the previous home dashboard, still protected by the existing session check.
- Login, registration and demo login redirect to `/panel`; application navigation and back links also use `/panel`.

## Reference inspection

Reference: https://openai.com/index/gpt-6-astra/ (inspected September 6, 2026).

The rendered DOM exposes a viewport-sized canvas with `data-engine="three.js r180"` and `data-astra-canvas="true"`. Its ancestor is `position: fixed`, behind the article. Other presentation blocks are sticky. The initial view displays a luminous particle figure; after scrolling approximately 650 px, its silhouette opens into a spiral while the article heading enters. Farther down, particles remain behind the article and a horizontal CSS `mask-image` clears the reading column. The canvas itself remains untransformed in the inspected DOM, consistent with transformations occurring inside the renderer.

Three.js is confirmed by the canvas attribute. WebGL is strongly suggested by that renderer, but the context and shader implementation were not inspected. The observable depth, rotation and apparent scale changes could combine particle transformations and camera changes; exact camera paths, geometry and shader parameters cannot be established from rendered output alone. Neither GSAP/ScrollTrigger, requestAnimationFrame nor IntersectionObserver was verified for the reference. No reference code, images, shaders, branding or text were reused.

## Original implementation

The landing uses Canvas 2D to render an original 3D point scene through a perspective projection. HTML stays readable and interactive independently of the canvas. The particle figure is a lightning bolt inspired by StudyFlow's existing mark, in the existing lavender, purple and cyan palette over the navy presentation background.

- Canvas and navigation remain fixed. All reading sections use native document flow; no scroll hijacking or pinned reading delays.
- 1,900 seeded points unfold from a hero lightning bolt into a field spanning the complete viewport. At the closing section, the same points regroup into two bolts, one on each side of the message.
- Hero and closing-section offsets define normalized scroll intervals. Smoothstep blends projected bolt positions into viewport-wide particle coordinates and back into two silhouettes. Depth affects particle size and scroll parallax. Mouse position subtly rotates the projected bolts. The closing trigger uses section position rather than total page height, so the larger footer and expanded FAQ do not prevent the final formation.
- Hovering a bolt emits an expanding wave and a local vortex: nearby stars move outward and tangentially, brighten, and draw a small number of luminous connections to the cursor. Damped springs restore the silhouette after the cursor leaves.
- `requestAnimationFrame` renders; exponential damping `1 - exp(-7 * deltaSeconds)` smooths the target scroll and mouse coordinates independently of frame rate. DOM preview cards use small perspective rotations and translations.
- The distributed field dims as content enters, preserving readability across both sides of the viewport. On smaller screens, the artwork follows its measured layout below the hero copy. Mobile halves particle count without dropping either closing bolt. Pixel ratio is capped at 1.6.
- Reading text, labels, controls and illustrative interfaces use a larger scale while preserving the original horizontal gutters. Feature panels stack under their descriptions at widths up to 1,300 px. On phones, schedule days and project phases stack vertically instead of shrinking the text.
- The footer includes brand copy, feature navigation, account links and labelled Bootstrap Icons for YouTube and Instagram. Social links intentionally point to https://www.youtube.com/ and https://www.instagram.com/ rather than nonexistent StudyFlow profiles.
- Pause and `prefers-reduced-motion` produce a static scene and remove the card motion. Rendering stops while the document is hidden. Native scrolling, keyboard navigation, links and FAQ disclosure remain usable without JavaScript.
- No GSAP, Three.js, WebGL, video or downloaded visual assets are required by this implementation. The logo and fonts follow the existing project.

## Copy and feature availability

The supplied business-plan PDF and StudyFlow slides informed the benefit structure and singular-reader voice. Product capabilities were checked against the existing graph and implementation. WhatsApp and AI are described as configurable integrations; the FAQ explains that the default demo configuration simulates AI and sends no real WhatsApp messages. The landing does not claim a working inbound WhatsApp capture flow. Illustrative product panels are labelled as examples.
