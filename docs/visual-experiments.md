# Predict and compare

*Called "Visual experiment" until 2026-09-21; renamed because it is a
feature, not a trial.*

Choose **Add slide → Predict and compare**. In Design & content choose a preset,
edit its tab-separated dataset, and author the prediction prompt and state
explanations. You can change a state's visual, change its axis minimum, remove
states or add a state. Selecting a different preset replaces its data and states.

In Present, Next reveals the first visual after the prediction prompt, then moves
through the states. Previous reverses the sequence. The state buttons allow a
direct comparison or a return to prediction. Experiment state follows the
existing presenter synchronisation and does not modify the saved lesson.

The chart now transforms between states instead of fading between finished
drawings. Each datum has a stable keyed contour: pie slices become bars, points
become area-scaled circles, and marks retain identity when the range changes.
Axis labels change with baseline endpoints; decoration fades away separately
from the data, and palette changes interpolate over fixed tiles. Transition
frames are explanatory motion, not additional observations. Read exact values
at the settled endpoints.

Use **Replay change** to retrace the previous transition. Choose a quick,
teaching or slow-observation pace in the inspector. Hide values in an individual
state for an estimation challenge, then reveal labels in the next state. The
Week 2 accuracy activity asks students to estimate B/A using area, angle and
aligned lengths before revealing 30/40 = 75%. It is not a controlled perception
study. Category, ordinal and redesign slides now use native editable examples.

Presets cover polling, baseline distortion, clutter, aspect ratio and selected
ranges, marks and channels, colour schemes, accessibility, dataset structures,
attribute classification and overview/detail. The Week 2 lesson uses these
alongside full-size reference images with the existing Flip to facts interaction.

## Teaching and data

- The supplied examples use synthetic, explicitly labelled teaching data.
- Baseline distortion is deliberate and labelled. Explain the length channel.
- Pies require nonnegative values and a positive total.
- Bubble radius follows the square root of value so area represents magnitude.
- Grayscale demonstrates redundant encoding; it is not a colour-vision simulator.
- Field samples and geometry are illustrative presets, not GIS or measured data.
- The overview/detail preset filters labelled ranges; it is not free chart zoom.
- Display limits are 12 categories, four grouped series and eight states.
- Changing data requires checking explanations that refer to particular values.
- Static previews and printed handouts show the final state. Live presentation
  begins at the prediction prompt. Animations respect reduced-motion settings.

No React or external chart dependency is required. Rendering lives in
`js/experiments.js` with data-keyed motion in `js/chart-motion.js`; Explore handles navigation and presenter messages. The
catalogue entry is in `src/deck/content.js`. Run `npm run build` when changing
that catalogue to regenerate the browser model bundle.
