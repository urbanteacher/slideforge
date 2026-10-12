// The demonstrations built on the chart-experiment kinds, with their tables (from experimentKinds.ts).
import type { KState } from './experimentKinds.ts';

interface KPreset { label: string; prompt: string; data: string; states: KState[] }
const NESTED = 'Level\tAsks\tThreat\nDomain situation\tWho are the target users?|What do they need to do?\tYou misunderstood|their needs\nData/task abstraction\tWhat is shown? (data)|Why are they looking? (task)\tYou’re showing them|the wrong thing\nIdiom\tHow is it shown? (encoding)|How is it manipulated? (interaction)\tThe way you show it|doesn’t work\nAlgorithm\tHow is it computed|efficiently?\tYour code is|too slow';

const SONG = 'Word\tVerse 1\tChorus 1\tVerse 2\tChorus 2\tBridge\nlove\t2\t4\t1\t4\t2\nbaby\t0\t3\t1\t3\t0\nnight\t3\t1\t2\t1\t1\ndance\t1\t2\t0\t2\t4\nheart\t1\t0\t2\t0\t1';

const CHANNELS = 'Channel\tA\tB\nPosition\t80\t36\nLength\t80\t52\nAngle\t100\t35\nArea\t100\t60\nLightness\t100\t50';

const SCALES = 'Genre\tJan\tFeb\tMar\tApr\tMay\tJun\tJul\tAug\tSep\tOct\tNov\tDec\nPop\t3\t4\t2\t-1\t-4\t-6\t-7\t-5\t-2\t1\t4\t6\nHip-hop\t-2\t-1\t1\t3\t5\t7\t8\t6\t3\t0\t-2\t-3\nRock\t1\t0\t-1\t-2\t-2\t-3\t-2\t-1\t0\t1\t1\t2\nJazz\t-4\t-3\t-2\t0\t1\t2\t1\t0\t-1\t-3\t-4\t-5\nClassical\t6\t5\t3\t1\t-1\t-3\t-4\t-3\t-1\t2\t4\t7';

const FRUIT = 'Fruit\tApril\tMay\tJune\nApple\t82\t70\t20\nPear\t73\t50\t33\nPeach\t67\t45\t28\nOrange\t85\t65\t17\nKiwi\t54\t42\t24\nMelon\t33\t58\t20';

/** The demonstrations built on the new kinds, for both engines' preset lists. */
export const KIND_PRESETS: Record<string, KPreset> = {
  reshape: { label: 'Reshape: wide to long', prompt: 'A chart needs Month on an axis. Where is Month in this table?', data: FRUIT, states: [
    { label: 'As supplied', kind: 'grid', explanation: 'Six fruit, three months. Each row is one fruit, and April, May and June sit in the headings.' },
    { label: 'Items', kind: 'grid', band: 'items', explanation: 'Each row is an item: one fruit. Six items.' },
    { label: 'One attribute', kind: 'grid', band: 'attributes', explanation: 'April, May and June are not three attributes. They hold one attribute, quantity sold, split by the values of another: month.' },
    { label: 'Wide to long', kind: 'long', variable: 'Month', measure: 'Quantity', explanation: 'Watch each number travel. It keeps its value and now carries its month in its row: 6 fruit × 3 months = 18 rows. Month is a column you can put on an axis. In pandas this is melt; in Altair, transform_fold.' },
    { label: 'Name the types', kind: 'long', typed: true, variable: 'Month', measure: 'Quantity', explanation: 'Fruit is nominal: names, no order. Month is ordinal: April, May, June has an order. Quantity is quantitative: zero means none sold, so 80 is twice 40.' },
    { label: 'Derive a total', kind: 'grid', derive: true, explanation: 'Back to the supplied shape, with the Total column the original table had. Nobody counted it: it is computed, April + May + June. A derived attribute.' }] },
  tasks: { label: 'Tasks: one table, five questions', prompt: 'Same fruit data. Which chart answers each question fastest?', data: FRUIT, states: [
    { label: 'Month totals', kind: 'groups', mode: 'series-totals', explanation: 'Discover: sum each month. April sold most, 394.' },
    { label: 'Oranges in May', kind: 'groups', focus: [3, 1], labels: true, explanation: 'Locate one value: 65. The rest step back.' },
    { label: 'Apple v Orange', kind: 'lines', transpose: true, only: [0, 3], labels: true, explanation: 'Compare: both fall; Orange starts higher and ends lower.' },
    { label: 'The odd one out', kind: 'lines', transpose: true, focus: 5, explanation: 'The anomaly: only Melon rises, 33 → 58.' },
    { label: 'Fruit totals', kind: 'groups', mode: 'totals', sort: true, colourBy: 'mono', explanation: 'Stack and sort: Apple leads with 172.' }] },
  derive: { label: 'Derived attributes: a balance', prompt: 'Exports and imports are both measured. Where is the trade balance?', data: 'Year\tExports\tImports\n2019\t30\t22\n2020\t28\t40\n2021\t45\t42\n2022\t70\t50\n2023\t52\t63\n2024\t80\t58', states: [
    { label: 'Two attributes', kind: 'lines', explanation: 'Exports and imports, six years, the same units.' },
    { label: 'Show the gap', kind: 'lines', gap: true, explanation: 'The balance is the gap, and gaps are hard to judge.' },
    { label: 'Drop to zero', kind: 'balance', explanation: 'Exports − imports: a derived attribute, from a zero baseline.' },
    { label: 'Running total', kind: 'balance', cumulative: true, explanation: 'Add each year to the last: where do we stand overall?' }] },
  rescue3d: { label: 'Critique: rescue a 3D chart', prompt: 'Same fruit, same numbers. What stops you reading this chart, and what would you fix first?', data: FRUIT, states: [
    { label: '3D default', kind: 'oblique', explanation: 'Depth hides rows; colour repeats the axis.' },
    { label: 'Flatten, stack', kind: 'groups', mode: 'stacked', colourBy: 'series', explanation: 'Depth gone; colour now shows the month.' },
    { label: 'Side by side', kind: 'groups', mode: 'grouped', colourBy: 'series', explanation: 'Every month from zero: May against May is a length.' },
    { label: 'One question', kind: 'groups', mode: 'totals', sort: true, colourBy: 'mono', explanation: 'Which sells most? Stack and sort: Apple, 172.' }] },
  pies: { label: 'Pie variants: angle, area, length', prompt: 'Four genres’ share of a playlist. In which version can you tell Hip-hop from Rock most confidently?', data: 'Genre\tShare\nPop\t40\nHip-hop\t25\nRock\t20\nJazz\t15', states: [
    { label: 'Pie', kind: 'pie', explanation: 'Angle carries the share: Hip-hop and Rock look close.' },
    { label: 'Doughnut', kind: 'donut', explanation: 'No centre angle: you read arc length, which is harder.' },
    { label: 'Exploded', kind: 'exploded', explanation: 'Emphasis, not accuracy.' },
    { label: 'Polar area', kind: 'rose', explanation: 'Area carries the share, and areas are hard to compare.' },
    { label: 'Bars', kind: 'bar', categorical: true, explanation: 'Aligned length: Hip-hop 25 beats Rock 20 at a glance.' }] },
  nested: { label: 'Nested model: four levels', prompt: 'You are asked to build a dashboard. Where do you start: with the users, the data, the chart or the code?', data: NESTED, states: [
    { label: 'Domain', kind: 'nested', focus: 0, explanation: 'Start with the people and their problem.' },
    { label: 'Abstraction', kind: 'nested', focus: 1, explanation: 'What is shown, and why they look: What? and Why?' },
    { label: 'Idiom', kind: 'nested', focus: 2, explanation: 'How? The encoding and the interaction.' },
    { label: 'Algorithm', kind: 'nested', focus: 3, explanation: 'Compute it efficiently; speed cannot save the wrong idiom.' },
    { label: 'Four threats', kind: 'nested', threats: true, explanation: 'Each level fails its own way: work from the outside in.' }] },
  emoji: { label: 'Units as icons: animals', prompt: 'One mark per animal. What changes when the mark becomes a picture, and what must not?', data: 'Animal\tGreat Britain\tUnited States\ncattle\t3\t2\npigs\t2\t1\nsheep\t1\t3', states: [
    { label: 'One dot each', kind: 'units', size: 58, explanation: 'One dot per animal: the counts are the data.' },
    { label: 'Dots become icons', kind: 'units', size: 58, icons: ['🐄', '🐖', '🐑'], explanation: 'Icons add recognition, not data: count marks, not size.' },
    { label: 'Count them', kind: 'units', size: 58, stack: true, icons: ['🐄', '🐖', '🐑'], explanation: 'Cattle 5, sheep 4, pigs 3.' }] },
  idioms: { label: 'Idioms: one song, three charts', prompt: 'Same song, same counts. Which chart gives the overview, which lets you explore, which shows the song’s shape?', data: SONG, states: [
    { label: 'Streamgraph', kind: 'stream', explanation: 'Overview: the stream swells at the choruses.' },
    { label: 'Unit chart', kind: 'units', colourBy: 'category', explanation: 'Explore: one mark per sung word.' },
    { label: 'Area chart', kind: 'area', explanation: 'Dynamics: each word from zero, so peaks compare.' }] },
  cluster: { label: 'Cluster: reorder a heatmap', prompt: 'Eight songs, six words, how often each is sung. Are there groups of songs?', data: 'Song\tlove\tparty\theart\tdance\tbaby\tnight\nSong 1\t1\t8\t0\t9\t2\t7\nSong 2\t8\t1\t9\t0\t7\t2\nSong 3\t0\t9\t1\t8\t1\t8\nSong 4\t9\t2\t7\t1\t8\t1\nSong 5\t2\t7\t1\t9\t0\t9\nSong 6\t7\t0\t8\t2\t9\t1\nSong 7\t1\t8\t2\t7\t1\t9\nSong 8\t8\t1\t8\t1\t6\t3', states: [
    { label: 'As collected', kind: 'heatmap', explanation: 'In collection order, it looks like noise.' },
    { label: 'Reorder the rows', kind: 'heatmap', rowOrder: [1, 3, 5, 7, 0, 2, 4, 6], explanation: 'Same cells, new row order: a pattern appears.' },
    { label: 'Reorder the columns', kind: 'heatmap', rowOrder: [1, 3, 5, 7, 0, 2, 4, 6], colOrder: [0, 2, 4, 1, 3, 5], boxes: [[0, 3, 0, 2, 'Ballads'], [4, 7, 3, 5, 'Club songs']], explanation: 'Two blocks: ordering reveals the clusters.' }] },
  units: { label: 'Units: from words to frequency', prompt: 'The raw data is words in the order they are sung. Where does “frequency” come from?', data: SONG, states: [
    { label: 'In time order', kind: 'units', explanation: 'One dot each time a word is sung.' },
    { label: 'Count them', kind: 'units', stack: true, explanation: 'Frequency is derived by counting.' },
    { label: 'Sort', kind: 'units', stack: true, sort: true, explanation: 'Sorted, the extremum reads first: love, 13.' }] },
  // 'perception', not 'channels': that name is Week 2's Marks and channels (experiment.ts), and these
  // presets are spread after it, so sharing the name replaced Week 2's chart with this one.
  perception: { label: 'Perception: one ratio, five channels', prompt: 'Each pair asks the same question: B is what percentage of A? How sure are you of each answer?', data: CHANNELS, states: [
    { label: 'Position', kind: 'channels', focus: 0, labels: true, explanation: 'Two dots against one common scale. B is 45% of A. Answers usually cluster tightly here: position on a common scale is the most accurately read channel.' },
    { label: 'Length', kind: 'channels', focus: 1, labels: true, explanation: 'Two bars that do not share a baseline, so only their lengths can be compared. B is 65% of A. Without the common baseline, estimates spread wider.' },
    { label: 'Angle', kind: 'channels', focus: 2, labels: true, explanation: 'Two wedges from the same starting line. B is 35% of A. Angles are read less accurately than lengths: this is the pie chart’s channel.' },
    { label: 'Area', kind: 'channels', focus: 3, labels: true, explanation: 'Two circles. B has 60% of A’s area. Area tends to be underestimated, because the eye compares widths as well as areas.' },
    { label: 'Lightness', kind: 'channels', focus: 4, labels: true, explanation: 'Two shades. B is 50% of A. Lightness shows order well (darker is more) but is poor for reading how much more.' },
    { label: 'The ranking', kind: 'channels', mode: 'ranking', explanation: 'Position on a common scale, length, angle, area, lightness: the order Cleveland and McGill measured in 1984 and Heer and Bostock replicated in 2010. Munzner calls this effectiveness: give the most important attribute the most accurate channel.' }] },
  scales: { label: 'Colour scales: follow the ordering', prompt: 'Change in streams against last year, by genre and month. Which cells went up, which went down, and which barely moved?', data: SCALES, states: [
    { label: 'Sequential', kind: 'scales', scheme: 'seq', explanation: 'Sequential misreads a signed change: pale is a fall.' },
    { label: 'Diverging', kind: 'scales', scheme: 'rg', explanation: 'Diverging: zero palest, falls and rises apart.' },
    { label: 'Deuteranopia', kind: 'scales', scheme: 'rg', cvd: 'deutan', explanation: 'With deuteranopia, red and green collapse.' },
    { label: 'Blue–orange', kind: 'scales', scheme: 'bo', explanation: 'Diverging again, blue against orange.' },
    { label: 'Deuteranopia again', kind: 'scales', scheme: 'bo', cvd: 'deutan', explanation: 'Blue and orange survive deuteranopia.' },
    { label: 'Cyclic months', kind: 'scales', scheme: 'bo', mode: 'cyclic', explanation: 'Months are cyclic: December sits next to January.' }] },
  network: { label: 'Table or network: words that co-occur', prompt: 'The same lyric counts as the heatmap. Could they be a network rather than a table?', data: 'Song\tlove\tparty\theart\tdance\tbaby\tnight\nSong 1\t1\t8\t0\t9\t2\t7\nSong 2\t8\t1\t9\t0\t7\t2\nSong 3\t0\t9\t1\t8\t1\t8\nSong 4\t9\t2\t7\t1\t8\t1\nSong 5\t2\t7\t1\t9\t0\t9\nSong 6\t7\t0\t8\t2\t9\t1\nSong 7\t1\t8\t2\t7\t1\t9\nSong 8\t8\t1\t8\t1\t6\t3', states: [
    { label: 'A table', kind: 'network', mode: 'table', explanation: 'As collected: songs × words.' },
    { label: 'Derive pairs', kind: 'network', mode: 'matrix', explanation: 'A derived table: how often two words share a song.' },
    { label: 'A network', kind: 'network', mode: 'network', explanation: 'Words become nodes; sharing a song becomes a link.' },
    { label: 'Communities', kind: 'network', mode: 'network', labels: true, explanation: 'Two communities: the Cluster task again, from the links.' }] },
};
