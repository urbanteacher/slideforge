# Interface consistency review — 11 September 2026

Reviewed the current lesson editor, shared rendering/model paths, presentation
HUD, presenter state, learner context and activity-library copy. This is a
review of those active paths, not a claim that every file or device combination
has been exhaustively audited.

## Resolved

| Finding | Resolution |
| --- | --- |
| Two alternative-layout preview systems with different switching rules | Removed the customisation panel's duplicate. The layout picker and remaining previews both call `SF.prepareLayout`. Preview trials are deep copies. |
| Image side dropdown, canvas swap and customisation swap could disagree, particularly when stacked | One placement selector and a canvas shortcut use `SF.imagePlacement`, `SF.setImagePlacement` and `SF.swapImagePlacement`. Swapping a stacked image changes above/below. |
| Phones could display bullet/body text retained from another layout | `SF.slideExcerpt` reads the selected layout, using `SF.slideSteps` for progressive text. Image/video references and unused fields stay off the phone. |
| Presenter correct-answer details assumed option letters | `SF.correctAnswerLabel` handles choice, typed and numeric inputs. Effective countdown duration is also shared with the live path. |
| Button and keyboard implementations drifted; Enter could both operate a button and advance | HUD actions and their corresponding shortcuts use `Player.control`. Editable inputs and native button activation keep their own keyboard behaviour. Live-mode letter keys retain presenter functions. |
| Deleting a point lost formatting on the following points | Formatting keys are shifted with the remaining bullets. |
| Some theme-specific text ignored whole-slide text colour | Custom text colour now applies to those layout text elements, retaining explicit selected-word overrides. |
| Narrow editor compressed the slide and clipped wrapped header actions | The narrow grid reserves canvas space, sizes the header to its content and permits vertical scrolling. |
| Stale descriptions and selectors | Removed unused duplicate-preview/old floating-toolbar CSS; updated library and README descriptions for playable presets, feedback modes, layouts and themes. |

## Verification

- Full Node suite: 76 passed, 0 failed.
- Focused regression coverage: content-preserving layout changes, placement
  swaps, layout-aware excerpts, answer labels, formatting persistence and
  deletion, plus mixed teacher/device entry and reports.
- Browser: one layout-preview row, above/below swap, HUD keyboard activation,
  disabled solo-mode live controls, blank-state feedback, and narrow layout.
- At a 620 × 840 viewport the canvas measured about 213px high; header action
  buttons fit inside the header and there was no horizontal overflow.
- JavaScript syntax and whitespace checks passed. Temporary viewport overrides
  were reset. No staging or commits were performed.

## Deliberate distinctions and remaining limits

The layout picker and its previews are two views of one operation, as are the
placement selector and canvas swap. They are useful shortcuts rather than
independent feature implementations. Game styles continue to use the model's
existing registry; preset games remain named configurations of those engines.

Presenter view intentionally includes the complete authored slide and private
answer information. Learner context includes only the currently appropriate
plain-text excerpt. Named answers remains an explicitly projected view; private
teacher entry opens separately.

This pass did not redesign the separate lesson/game document model, implement
planned game mechanics, perform an exhaustive accessibility certification, or
retest physical LAN devices and third-party media providers. Existing staged
and uncommitted feature work was preserved.
