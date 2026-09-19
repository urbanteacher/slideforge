/* Public design surface. Conditions describe when a control is useful; they
 * are shown in the guide and exercised by the browser reachability check. */
/** @satisfies {Record<keyof import('./types.js').SlideDesign, import('./types.js').DesignControl>} */
export const DESIGN_CONTROLS = {
  motionScene: {label:'Motion experiment',pane:'Look',types:['content'],description:'Try an interactive motion specimen using this slide’s title, points and image.'},
  motionLook: {label:'Experiment style',pane:'Look',types:['content'],when:'Motion experiment selected',description:'Editorial, layered paper, technical drawing, cinematic depth or comic panels.'},
  chromeLayout: {label:'Header and footer',pane:'Look',types:['title','section','statement','quote','content','cards','journey','keyfact','compare','iceberg','sourcecheck','spectrum'],when:'Structured composition',description:'Use named slots for slide furniture. Theme placement preserves the existing design.'},
  logoSlot: {label:'Logo position',pane:'Look',types:['title','section','statement','quote','content','cards','journey','keyfact','compare','iceberg','sourcecheck','spectrum'],when:'Structured composition with named regions enabled',description:'Move the deck logo to a named slot. Logo visibility still follows the deck settings.'},
  identitySlot: {label:'Theme identity position',pane:'Look',types:['title','section','statement','quote','content','cards','journey','keyfact','compare','iceberg','sourcecheck','spectrum'],when:'Structured composition with named regions enabled',description:'Move the theme identity to a named slot, when the theme supplies one.'},
  contextSlot: {label:'Slide context position',pane:'Look',types:['title','section','statement','quote','content','cards','journey','keyfact','compare','iceberg','sourcecheck','spectrum'],when:'Structured composition with named regions enabled',description:'Move the context line when this composition places it in the header. Eyebrows and lane headings stay with their content.'},
  closingSlot: {label:'Closing text position',pane:'Look',types:['title','section','statement','quote','content','cards','journey','keyfact','compare','iceberg','sourcecheck','spectrum'],when:'Structured composition with named regions enabled',description:'Move the deck closing note or organisation to a named slot.'},
  numberSlot: {label:'Page number position',pane:'Look',types:['title','section','statement','quote','content','cards','journey','keyfact','compare','iceberg','sourcecheck','spectrum'],when:'Structured composition with named regions enabled',description:'Move the page number. Visibility still follows the deck settings.'},
  composition: {label:'Composition',pane:'Look',types:['title','section','statement','quote','content','cards','journey','keyfact','compare','iceberg','sourcecheck','spectrum'],description:'Arrange the same content. Theme default follows the theme; Original layout opts out.'},
  align: {label:'Text alignment',pane:'Look',types:'*',description:'Align text left, centre or right.'},
  size: {label:'Text size',pane:'Look',types:'*',description:'Scale text relative to the theme. Display sizes grow only as far as the content fits.'},
  textColor: {label:'Text colour · whole slide',pane:'Look',types:'*',description:'Set the slide text colour. Individual words use the text formatting toolbar.'},
  background: {label:'Slide background',pane:'Look',types:'*',description:'Replace the background with a solid colour. Check contrast after changing it.'},
  placement: {label:'Image placement',pane:'Look',types:['split'],description:'Place the picture left, right, above or below the text. Left/right also updates the image-side field.'},
  imageShare: {label:'Image share',pane:'Look',types:['split'],description:'Give the picture 35%, 50% or 65% of the split.'},
  mediaGround: {label:'Picture mount',pane:'Look',types:['split'],description:'Mount the picture on a card or extend it to the edges.'},
  imageStep: {label:'Image arrives',pane:'Look',types:['split'],description:'Show the picture with the slide, before the points or after them.'},
  cardsMode: {label:'Cards layout',pane:'Look',types:['cards'],description:'Choose a grid, full-width rows, a stack or picture cards. Selecting one returns to the original cards layout. Stack enables progressive builds.'},
  cardPics: {label:'Picture shape',pane:'Look',types:['cards'],when:'Picture cards selected or card images supplied',description:'Crop to portrait covers or contain landscape plates.'},
  statStyle: {label:'Tile style',pane:'Look',types:['stats'],description:'Display statistics as numbers, rings or KPI bars.'},
  funnelDirection: {label:'Direction',pane:'Look',types:['funnel'],description:'Draw a descending funnel or an ascending pyramid.'},
  timelineMode: {label:'Shape',pane:'Look',types:['timeline'],description:'Arrange dated events across a rail or down a spine.'},
  backdrop: {label:'Backdrop motion',pane:'Look',types:['title','section'],description:'Animate a drift, grid or glow using theme colours.'},
  logoGround: {label:'Logo sits on',pane:'Look',types:['image','gallery','video'],description:'Choose the logo variant for the image behind it. Overrides the deck preference.'},
  imageFrame: {label:'Image frame',pane:'Look',types:['image','gallery'],description:'Use full bleed or a fixed image ratio with the caption below.'},
  capStyle: {label:'Caption style',pane:'Look',types:['image','gallery','video','split'],when:'Split slides need a caption',description:'Place a gradient or colour bar behind the caption, use plain text or hide it.'},
  capPos: {label:'Caption position',pane:'Look',types:['image','gallery','video'],description:'Place the caption at the top or bottom.'},
  capFade: {label:'Caption clears itself',pane:'Look',types:['image'],description:'Keep the caption or clear it after 5–30 seconds in the show.'},
  imageMotion: {label:'Image motion',pane:'Look',types:['image'],description:'Keep the image still, zoom slowly or travel between two focal points. Motion plays in Present.'},
  focalX: {label:'Image focus horizontal',pane:'Look',types:['split','image'],description:'Choose the horizontal focus, from 0 to 100 percent.'},
  focalY: {label:'Image focus vertical',pane:'Look',types:['split','image'],description:'Choose the vertical focus, from 0 to 100 percent.'},
  focalX2: {label:'Travels to horizontal',pane:'Look',types:['image'],when:'Image motion is Travel',description:'Set the horizontal destination of the image move.'},
  focalY2: {label:'Travels to vertical',pane:'Look',types:['image'],when:'Image motion is Travel',description:'Set the vertical destination of the image move.'},
  imageTravelSecs: {label:'How long the move takes',pane:'Look',types:['image'],when:'Image motion is Travel',description:'Choose a 12, 20 or 30 second move.'},
  chartMotion: {label:'Chart motion',pane:'Look',types:['chart'],description:'Show the chart already drawn or animate it on arrival in Present.'},
  chartFocus: {label:'Focus one series',pane:'Look',types:['chart'],when:'Chart has more than one series',description:'Emphasise one series while retaining the others for comparison.'},
  words: {label:'Words arrive',pane:'Motion',types:['statement'],description:'Animate the statement with Rise, Fade or Reveal. Reduced-motion preferences are respected.'},
  wordSpeed: {label:'Speed',pane:'Motion',types:['statement'],when:'Word animation enabled',description:'Set the speed of the word movement and its hold.'},
  wordStagger: {label:'Spacing',pane:'Motion',types:['statement'],when:'Word animation enabled',description:'Bring the words together, in a wave or one at a time.'},
  wordFrom: {label:'Direction',pane:'Motion',types:['statement'],when:'Word animation enabled; spacing is not Together',description:'Start at the first word, last word or centre.'},
  wordsLoop: {label:'And leave again',pane:'Motion',types:['statement'],when:'Word animation enabled',description:'Repeat the arrival, hold and exit.'},
  wordPlan: {label:'AI choreography',pane:'Motion',types:['statement'],when:'Word animation enabled',description:'Request a movement plan for these words or letters. Editing the text retires the old plan; Clear choreography removes it.'}
};

/** Types describes the authoring surface; imported decks may retain inactive
 * values after changing layouts. Do not delete those values on load.
 * @param {string} key
 * @param {string} type
 */
export function designApplies(key,type) {
  const control=DESIGN_CONTROLS[key];
  return !!control && (control.types==='*' ? !['quiz','game'].includes(type) : control.types.includes(type));
}
