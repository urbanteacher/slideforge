'use strict';
/* Week 8 · Who's connected to whom? Networks and trees: every slide, in teaching order.
 * The plan is docs/ipdv-week8-plan.md; the live figures are src/figures/
 * (bridges, network, tree). Every technique runs See it → Name it → Build it,
 * and every Build it shows its code beside the picture that code drew.
 * The data spine is London: the Tube's Zone 1 (a network) and the 33
 * boroughs (a tree). */
const L = require('./layouts.js');

const DIR = 'assets/lesson/ipdv/week8';
const asset = name => `${DIR}/${name}`;
/* A drawn slide carries its own heading; an outside picture gets the red title above it and facts on its back. */
const drawn = (title, file, notes, extra) => Object.assign({ type: 'image', title, image: asset(file), imageFit: 'contain', design: { capStyle: 'none' }, notes }, extra || {});
const photo = (title, file, facts, notes) => ({ type: 'image', title, image: asset(file), imageFit: 'contain', design: { capStyle: 'top' }, body: facts.join('\n'), notes });
const section = (title, part, notes) => ({ type: 'section', title, subtitle: part, notes });
const statement = (title, notes) => ({ type: 'statement', title, body: title, notes });
/* A list revealed one row at a time on one slide (src/figures/reveal.js): with answers, the first step shows
   the questions and each click brings the next answer; a build brings one row per click. */
const D = require('./drawings.js');
const reveal = (title, eyebrow, key, captions, notes) => {
  const data = D.REVEAL[key], start = data.mode === 'answers' ? -1 : 0;
  return { type: 'figure', figure: 'reveal', title, figureGround: 'paper', figureEyebrow: eyebrow, notes,
    figureAlt: `${title}: ${data.rows.map(r => r.name || r.say).join('; ')}`, figureData: data,
    figureSteps: captions.map((caption, i) => ({ caption, upto: start + i })) };
};

function draft() {
  const abc = L.abc(), tube = L.tube(), mis = L.miserables(), london = L.london();
  const TUBE = { nodes: tube.nodes, links: tube.links, colours: tube.colours, layouts: tube.layouts, r: 6 };
  /* The hook tells its story beside the map: the map keeps to the left, the words take the right-hand column. */
  const hook = L.tube({ x0: 64, y0: 158, x1: 850, y1: 640 });
  const HOOK = { nodes: hook.nodes, links: hook.links, colours: hook.colours, layouts: hook.layouts, r: 6 };
  const STORY = { x: 880, y: 150, w: 336 };
  const KX = "King's Cross St. Pancras";
  const credit = 'Powered by TfL Open Data · Zone 1';
  /* The grid colours a square by group when both characters share one; grey when they don't. */
  const GRIDKEY = [{ mark: 'box', colour: '#e45756', text: 'a scene together, same group (colour = group)' }, { mark: 'box', colour: '#9fb3c8', text: 'a scene together, different groups' }];
  return [
  /* ======================================================== Opening */
  { type: 'title', title: 'Who’s connected to whom?',
    subtitle: 'LDSCI6253 Advanced Information Presentation & Visualisation · Week 8 · Networks and trees',
    notes: 'Up as they arrive. Same promise as Weeks 5 and 7: every idea seen in a real picture, named, then built in Altair. Rebuilt from the 2025 networks deck (01_Lecture_IPDV_7.pptx) and Dimitris Mylonas\'s LDSCI5209 deck (09_Lecture_IPDV_Networks_Trees.pdf).' },

  { type: 'content', title: 'Before we start',
    bullets: [
      'Reading\tMunzner, Visualization Analysis and Design: Chapter 9, Arrange Networks and Trees',
      'Worksheets\tOn Canvas by midday on the Friday after the lab',
      'Data for the lab\ttube_stations.csv, tube_links.csv and london_boroughs.csv, beside these slides',
      'Stuck?\tAsk early. Don’t wait until the last minute'
    ],
    notes: '1 min. Fixes carried over from the 2025 deck: it said "Week 7 / Lecture 7" throughout, its slide 6 said "Analysis Farmwork", and its recap slide recapped maps under the networks title. This is a real recap, next.' },

  reveal('Three questions on last week', 'Recall first', 'recall', ['Talk to the person next to you: 20 seconds a question.', 'A map spends position on place.', 'Every flat map stretches something.', 'Rates make places fair to compare.'],
    '3 min. Recall before new learning (the Nodes routine: retrieve first). The three questions show first: 20 seconds in pairs for each, take two answers, then click to reveal that answer; the others dim. ' +
      'Keep the word "position" in their heads: today, where a dot sits is chosen, not measured.'),

  drawn('Eight weeks in, one more kind of data', 'route.svg',
    '1 min. The route: seven weeks behind them, all of it on tables, one row per thing. Today the data is the connections between things. A network or a tree can be one panel of the final page.'),

  { type: 'figure', figure: 'network', title: 'The Tube: where things are, or what connects?', figureGround: 'paper',
    figureEyebrow: 'Hook', figureCredit: credit, figureAlt: 'Zone 1 of the London Underground: stations as dots, track as lines in each line\'s colour, first at their real positions, then evenly spaced.',
    figureStory: STORY,
    figureData: Object.assign({ key: [{ mark: 'dot', text: 'a station' }, { mark: 'line', colour: '#E32017', text: 'track between two stations (colour = which Tube line)' }] }, HOOK),
    figureSteps: [
      { caption: 'Each dot is a Tube station in Zone 1, drawn where it really is. Each coloured line is a Tube line.', layout: 'geo', labels: 'none', geo: true,
        explain: 'This is central London\'s Tube, drawn from TfL\'s own data.\nEach white dot is a station, in its real place. Each coloured line is the track between two stations next to each other. The colour tells you which Tube line it is: red is the Central line, black is the Northern line.\nLook at the middle: it is a crowded knot, hard to read.' },
      { caption: 'Point at a station and the lines through it light up. King\'s Cross St. Pancras is on six lines.', layout: 'geo', lit: KX, labels: 'hubs', geo: true,
        explain: 'Point at any station. The lines that touch it stay bright and everything else fades.\nThe card says how many stations are next door (neighbours) and how many Tube lines pass through.\nThis is the whole idea of a network: things (stations) and the connections between them (track).' },
      { caption: 'The same stations and lines, with the crowded middle drawn bigger, as Harry Beck did for the Tube map.', layout: 'even', labels: 'hubs',
        explain: 'Nothing is added or taken away: the same stations, joined the same way.\nOnly the drawing changed. The crowded middle is stretched out and the edges are pulled in, so the centre is easier to read.\nHarry Beck did this for the Tube map in 1931 (published 1933), and also made every line straight. A passenger does not need true distances. They need to know what connects to what.' }
    ],
    notes: '4 min. ASK first, on step 1: "Which picture would you use to get from Brixton to Euston? Which would you use to walk it?" (The geography walks; the even one rides.) ' +
      'Step 2 is Beck\'s first move, done by a computer: a fisheye that enlarges the centre (each station keeps its direction from the middle; distance is shrunk by a power of 0.6). Beck also straightened every line to horizontals, verticals and 45°: show TfL\'s current map (tfl.gov.uk/maps/track/tube) beside it. Beck sketched his in 1931 and it was published as a pocket map in 1933. ' +
      'Step 3: hover live. Then: "Beck threw away geography. Today, position is chosen, not measured." Data: TfL Open Data, the regular service pattern of each line, Zone 1 (and 1/2 boundary) stations only. Edgware Road\'s two stations are drawn as one.' },

  drawn('A network is a “who’s connected to whom” picture', 'who.svg',
    '2 min. Before any diagram or word: their own contacts. ASK: "Who in your contacts messages someone else in your contacts?" That is a line that does not go through you. ' +
      'Then the jargon as a translation, not a definition: nodes and edges are the fancier words for dots and lines. Use "dots and lines" out loud for the rest of the lecture; say the technical word once, in passing.'),

  { type: 'table', title: 'Six words for today', tableHeader: true,
    body: 'Word\tWhat it means\tExample\n' +
      'Node\tone thing (a dot)\ta station\n' +
      'Edge\ta connection between two things\tthe track between two stations next to each other\n' +
      'Degree\thow popular a dot is: how many edges touch it\tKing\'s Cross: 5 stations next door (not its 6 Tube lines)\n' +
      'Path\ta route from dot to dot along the lines\tBrixton to Euston on the Victoria line\n' +
      'Root\tthe one thing at the top of a tree\tLondon, above all 33 boroughs\n' +
      'Leaf\ta thing with nothing below it\tone borough, such as Croydon',
    notes: '2 min. Define before use (the Nodes routine). Every word is used from the next slide on, so say each one out loud with its Tube example. Degree: "at a party, the person talking to the most people has the highest degree". SAY: "We\'re counting stations next door, not Tube lines." ' +
      'Keep "edge" and "Tube line" apart: King\'s Cross is on 6 Tube lines but has 5 edges in the Zone 1 data (Angel, Euston, Euston Square, Farringdon, Russell Square), because the Circle, Hammersmith & City and Metropolitan share one track to Farringdon, one edge. Checked with networkx: 90 distinct edges from tube_links.csv\'s 130 rows. ' +
      'Network = a set of nodes and edges. Tree = a network with one root and no loops (Part 1). The full table returns in Part 2, with three more words.' },

  { type: 'content', title: 'By the end of today you can',
    bullets: [
      'Tell\ta network from a tree, using today\'s six words',
      'Store\ta network as a list of pairs, or as a grid',
      'Choose\tdots and lines, a grid, or boxes, by the reader\'s question',
      'Build\ta dots-and-lines chart, a grid and an icicle in Altair',
      'Explain\twhy Beck\'s Tube map beats an accurate one',
      'Critique\ta network picture: what is a dot, a line, the data?'
    ], progressive: true,
    notes: '1 min. Rewritten from the 2025 deck\'s overview (slide 5), which listed "what is a network, what is a tree, common encodings".' },

  { type: 'journey', title: 'Today’s route', subtitle: 'Five stops, one question each', progressive: false,
    bullets: [
      'Name\tIs it a network or a tree?',
      'Store\tHow does a computer hold a network?',
      'Connect\tHow do you draw the connections?',
      'Matrix\tWhat if there are too many lines to read?',
      'Nest\tHow do you draw things inside things, like folders?'
    ],
    notes: '30 s.' },

  /* ======================================================== ① Name */
  section('Is it a network or a tree?', 'Part 1 · Name', '20 s. A new kind of data: connections.'),

  photo('A new kind of data', 'orig-munzner-what.jpg', [
    'In Week 3, Munzner asked three questions of every chart. The first, What, means: what kind of data is it?',
    'Until now every dataset was a table: one row per thing, one column per fact about it.',
    'A network is a different kind: things (nodes) and the connections between them (edges). A tree is a network where everything sits under one thing above it.',
    'Source: Tamara Munzner, Visualization Analysis and Design (2014), Chapter 2. Slide from the 2025 deck.'
  ], '1 min. From the 2025 deck (slides 6–9). Point at "Networks & Trees" under dataset types. Week 3 taught What/Why/How; today is a new What.'),

  { type: 'image', title: 'Why look at a network? Four jobs', image: asset('jobs.svg'), imageFit: 'contain', design: { capStyle: 'none' },
    notes: '2 min. Munzner\'s Why: the tasks a reader brings to a network. Uses to name: social network analysis (who knows whom), cybersecurity (which machines talk to which, spotting an odd one), fraud investigation (the Gupta network, Part 3), transport (the Tube). ' +
      'Size and colour of a dot can carry a fact about it: bigger for more connections (influence), colour for its group.' },

  { type: 'figure', figure: 'bridges', title: 'Cross every bridge once', figureGround: 'paper',
    figureStory: STORY,
    figureEyebrow: 'Try it', figureCredit: 'Königsberg, 1736 · after Euler', figureAlt: 'A stylised map of Königsberg: a river around an island, four pieces of land and seven bridges; then the same as four dots and seven lines.',
    figureSteps: [
      { caption: 'Königsberg, 1736: a river, an island and seven bridges. Click some land, then try to cross every bridge once.', show: 'city',
        explain: 'The city of Königsberg sat on a river, with an island in the middle and seven bridges.\nPeople asked: can you take a walk that crosses every bridge exactly once, never twice?\nTry it: click a piece of land to stand on it, then click bridges to cross them. A bridge turns red once you have used it.' },
      { caption: 'One try: six bridges crossed, then stuck on the east side. Every try ends stuck like this.', show: 'city', from: 'N', walk: [1, 3, 7, 6, 2, 5],
        explain: 'This walk starts on the north bank and crosses bridges 1, 3, 7, 6, 2 and 5. Bridge 4 is left, but the walker is on the east side, and no unused bridge leaves it.\nEvery order anyone tries ends stuck. In 1736 the mathematician Leonhard Euler explained why.' },
      { caption: 'Euler\'s idea: draw each piece of land as a dot, and each bridge as a line between two dots.', show: 'graph',
        explain: 'Euler saw that the shapes of the land and the lengths of the bridges do not matter. Only which land each bridge joins matters.\nSo he drew each piece of land as a dot and each bridge as a line. Dots joined by lines are called a graph, or a network. This was the start of graph theory.' },
      { caption: 'Count the lines touching each dot: 5, 3, 3 and 3. All four are odd numbers, so the walk is impossible.', show: 'degree',
        explain: 'The number of lines touching a dot is called its degree.\nOn a walk, every time you arrive at a piece of land you also leave it again: that uses two lines, an even number.\nOnly the place you start and the place you finish can have an odd number. Here all four dots are odd, so no walk can cross every bridge once.' },
      { caption: 'Add an eighth bridge: now only two dots are odd. Start at one of them and you finish at the other.', show: 'eighth',
        explain: 'The rule: a walk that uses every line exactly once is possible when zero or two dots have an odd number of lines.\nWith an extra bridge between the north and south banks, only the island (5) and the east (3) are odd. Start on one of them and the walk ends on the other.' }
    ],
    notes: '6 min. Let the room try first (or a volunteer at the wall): click land, then bridges. When someone is stuck, step to the failed walk, then Euler\'s move. ' +
      'CORRECTION carried from Dimitris\'s deck: it says a graph has an Euler path "if and only if there are exactly two vertices with odd degree". It is zero or two (zero gives a circuit that ends where it began), and the graph must be connected. Euler, Solutio problematis ad geometriam situs pertinentis (1736).' },

  statement('To cross every line once, zero or two dots may have an odd number of lines', '30 s. Euler\'s rule, in one line. The bigger idea: drop everything but the connections, and the question becomes easy.'),

  drawn('Three kinds of edge', 'edge-types.svg',
    '2 min. Redrawn from the 2025 deck\'s slide 15. ASK for a real example of each before showing the captions: undirected (track, Facebook friends), directed (Instagram follows, a web link, who-cites-whom), weighted (minutes between stations, scenes shared, money sent).'),

  reveal('Network or tree?', 'Name it', 'sort', ['Hands up for each: network or tree?', 'The Tube: a network.', 'Your folders: a tree.', 'Instagram: a directed network.', 'An org chart: a tree.', 'The Premier League: a network.', 'Your family tree: usually a tree.', 'Wikipedia: a directed network.'],
    '4 min. Read each row and take hands up before each click; the answer arrives and the other rows dim. The family tree is the trap: it is called a tree, and down one line it is one, but two parents per person and cousin marriages make it a network.'),

  statement('A tree is a network with no loops and one root', '30 s. Card 1. Equivalent, from Dimitris\'s deck: a connected graph with N nodes and N − 1 edges.'),

  drawn('The words for a tree, on one tree', 'terms.svg',
    '1 min. Redrawn from the 2025 deck\'s slide 13, on London: root, parent, child, siblings, leaf, subtree, level. Part 5 draws this same tree four ways.'),

  photo('See it: a family tree', 'orig-royal-tree.jpg', [
    'A family tree of the British royal family, with the line of succession to the throne marked.',
    'Each person hangs below their parents. Reading down a branch, it is a tree: one root at the top, leaves at the bottom.',
    'A real family is not quite a tree: everyone has two parents, so lines can join up again.',
    'Image from the 2025 deck (Getty Images / PA Media), used for teaching.'
  ], '1 min. From the 2025 deck (slide 14). The line of succession is a path from the root down. Ask: where are the leaves?'),

  /* ======================================================== ② Store */
  section('How does a computer hold a network?', 'Part 2 · Store', '20 s.'),

  drawn('A network is just a list of pairs', 'pairs.svg',
    '1 min. The surprising, reassuring part: a two-column spreadsheet. Point at the red row, then the red stretch of line it becomes. Brixton to Green Park on the Victoria line, from TfL\'s data. ' +
      'The order in a pair does not matter for track (it runs both ways): Stockwell, Brixton is the same edge.'),

  { type: 'figure', figure: 'network', title: 'One network, written three ways', figureGround: 'paper',
    figureEyebrow: 'Store it', figureCredit: 'After Dimitris Mylonas, LDSCI5209', figureAlt: 'An eight-node network A–H drawn as a picture, written as an edge list, and as an 8 by 8 adjacency matrix.',
    figureData: { nodes: abc.nodes, links: abc.links, layouts: abc.layouts, r: 16 },
    figureSteps: [
      { caption: 'The same 8 dots and 9 lines, written 3 ways: a picture, a list of pairs, and a grid of 0s and 1s.', view: 'store',
        explain: 'Left: the picture. 8 dots (A to H) and 9 lines.\nMiddle: the same thing as a list. Each row is one line, and names the two dots it joins.\nRight: the same thing as a grid. Each dot has a row and a column. A 1 means "these two are joined", a 0 means they are not.\nPoint at a dot, a row of the list or a square of the grid: the same connection lights up in all three.' },
      { caption: 'Dot A has 4 lines, so A is in 4 rows of the list, and A\'s row in the grid has four 1s.', view: 'store', lit: 'A',
        explain: 'A is joined to B, C, G and H. That is 4 lines.\nIn the list, A appears in 4 rows. In the grid, A\'s row has four 1s, and so does A\'s column.\nThe number of lines touching a dot is called its degree. A\'s degree is 4.' },
      { caption: 'One line, from C to D: one row of the list, and two squares of the grid (row C and row D).', view: 'store', lit: 'C-D',
        explain: 'The line C–D is written once in the list. In the grid it shows twice: in row C, column D, and in row D, column C, because the line goes both ways.\nMost squares are 0. 8 dots make a grid of 64 squares for only 9 lines. Lists stay short; grids get big.' }
    ],
    notes: '5 min. Dimitris\'s eight-node example (A–H), credited. Live: point at nodes, list rows and cells. ' +
      'The 2025 slide also had an adjacency list ([A] => [C, G, H, B]...). Mention it: one line per node, listing its neighbours. Same information again.' },

  { type: 'table', title: 'Three ways to write one network', tableHeader: true,
    body: 'Way\tWhat it is\tSize for this one\tGood for\n' +
      'Edge list\tone row per edge: source, target\t9 rows\tstoring and loading: it is just a table\n' +
      'Neighbour list\tone line per node: its neighbours\t8 lines\tfinding a node\'s neighbours fast\n' +
      'Grid (matrix)\ta row and a column per node, 1 if joined\t64 cells\tchecking any pair at a glance',
    notes: '1 min. The edge list is the one they will use: it is a pandas DataFrame with two columns. Everything in Altair starts from it.' },

  statement('Every network can be written as a list of pairs', '30 s. Card 2. A network fits in a table after all: one row per connection. That is how they will load it in Altair.'),

  drawn('Build it: the nodes', 'build-nodes.svg',
    '2 min. The edges and the node positions are two small tables. The positions are numbers we chose: nothing in the data says where A goes. The dots and the names are two layers of the same chart.'),

  drawn('Build it: the edges', 'build-links.svg',
    '2 min. Before and after: the same code plus one join and one layer. Each edge needs the position of both ends, so the edge list is joined to the node table twice (merge, merge). mark_rule draws a line from (x, y) to (x2, y2). Layers stack with +: the lines first, so the dots sit on top.', { transition: 'none' }),

  { type: 'table', title: 'The words again, plus three more', tableHeader: true,
    body: 'Word\tMeans\tOn the Tube\n' +
      'Node\ta thing\ta station\n' +
      'Edge (or link)\ta connection between two things\tthe track between two stations\n' +
      'Degree\thow many edges touch a node\tWaterloo, Oxford Circus, Green Park: 6 each\n' +
      'Path\ta route from node to node along edges\tBrixton to Euston on the Victoria line\n' +
      'Cluster\ta group with many edges inside it\tthe City\'s tangle of lines\n' +
      'Directed / weighted\tedges with a direction / a number\tInstagram follows / minutes between stations',
    notes: '1 min. The terms slide comes after they have used each idea (Dimitris\'s deck, "Terminology"). Graph = network; nodes = vertices = actors; edges = links = relations; clusters = communities.' },

  { type: 'table', title: 'Five numbers that describe a network', tableHeader: true,
    body: 'Number\tWhat it tells you\tIn Les Misérables\n' +
      'Degree\thow many edges a dot has\tValjean: 36, the most\n' +
      'Bridge\ta dot on many shortest routes\tMyriel: 7 characters link only to him\n' +
      'Distance\tthe fewest steps between two dots\tNapoleon to Javert: 3 steps\n' +
      'Density\tthe share of possible lines that exist\t254 of 2,926 pairs: about 9%\n' +
      'Islands\tparts with no line between them\tone: everyone connects',
    notes: '2 min. Names to say once: degree (in-degree and out-degree when edges have a direction); betweenness centrality = the bridge score; shortest path is the "six degrees of separation" idea; density decides lines versus grid (Part 4); islands are connected components. ' +
      'Closeness and eigenvector centrality (PageRank) are other ways to score importance. Clusters are usually found by an algorithm such as Louvain and then shown with colour, as the Les Misérables groups are. Numbers computed with networkx from the same data.' },

  /* ======================================================== ③ Connect */
  section('How do you draw the links?', 'Part 3 · Connect', '20 s. The node-link diagram.'),

  { type: 'figure', figure: 'network', title: 'Drag a node. Nothing changes.', figureGround: 'paper',
    figureEyebrow: 'Try it', figureAlt: 'The eight-node network, first in the chosen positions, then shuffled.',
    figureData: { nodes: abc.nodes, links: abc.links, layouts: abc.layouts, r: 22, key: [{ mark: 'dot', colour: '#0c3354', text: 'a node: one thing' }, { mark: 'line', colour: '#8a96a3', text: 'an edge: two things are connected' }] },
    figureSteps: [
      { caption: 'We chose where to draw each dot. Grab one and drag it somewhere else: its lines follow it.', layout: 'chosen',
        explain: 'Here\'s the weird part: in this picture, where a dot sits does not matter. That is different from every chart so far.\nGrab a dot and move it. Its lines follow, because a line belongs to two dots, not to a place on the screen. A is still joined to B, C, G and H, wherever you put it.' },
      { caption: 'Every dot has moved, but each is joined to exactly the same dots as before. Nothing that matters has changed.', layout: 'shuffled',
        explain: 'Think of people holding pieces of string to their friends. If everyone walks to a new spot in the room, has any friendship changed? No: the strings are the same. Only the arrangement changed.\nIn a scatter plot, where a dot sits is measured from the data. In a network picture it is chosen: the edges are the data. Someone, or a computer, chose the positions.' }
    ],
    notes: '3 min. If the room allows: five volunteers, each holding string or ribbon to two others. Ask them to walk to new spots, then ask the room what changed. Then hand the mouse to a student: drag nodes, and step. SAY: "In Week 2 position was the strongest channel. Here it is chosen, not measured: somebody, or some program, decides it. That choice is the layout."' },

  { type: 'figure', figure: 'network', title: 'Let the computer choose the positions', figureGround: 'paper',
    figureEyebrow: 'Name it', figureCredit: credit, figureAlt: 'The Tube\'s Zone 1 at its real positions, then rearranged by a force-directed layout.',
    figureData: Object.assign({ key: [{ mark: 'dot', text: 'a station' }, { mark: 'line', colour: '#E32017', text: 'track between two stations (colour = which Tube line)' }] }, TUBE),
    figureSteps: [
      { caption: 'The Tube\'s Zone 1 again, every station where it really is.', layout: 'geo', labels: 'hubs', geo: true,
        explain: 'The same Tube as at the start of the lecture, with the busiest stations named. Here a station\'s position comes from the real map.' },
      { caption: 'Now a computer places the stations: joined stations pulled close, the others pushed apart. The real map is gone.', layout: 'force', labels: 'hubs',
        explain: 'Imagine each line is a spring pulling two stations together, and every station pushes the others away like a magnet. A computer lets them settle.\nThe result keeps only the connections. Stations that are close on the real map can end up far apart if they are not joined.\nThis is how most network software draws a network unless you tell it otherwise. Its name is a force-directed layout (force = the pull and push).' }
    ],
    notes: '2 min. The layout is computed at build time (tools/ipdv-week8/layouts.js, Fruchterman–Reingold, seeded so it is the same every time). Hover a hub. ASK: "Which is more useful for a passenger?" Neither as much as Beck\'s, which keeps a little geography and a lot of tidiness.' },

  { type: 'table', title: 'Four layers of every chart, on the Tube map', tableHeader: true,
    body: 'Layer\tThe question\tOn the Tube map\n' +
      'Domain\tWho is it for?\tpassengers changing trains\n' +
      'Abstraction\tWhat kind of data, and what job?\ta network; follow a path\n' +
      'Idiom\tWhich drawing?\tdots and lines, every line straight\n' +
      'Algorithm\tHow are the dots placed?\tBeck by hand, or a computer',
    notes: '2 min. Munzner\'s four nested levels (ch. 4, used again in ch. 9). Each layer sits inside the one above: a wrong answer at the top makes everything below it wrong, however good the drawing. ' +
      'Idiom is Munzner\'s word for a kind of drawing; algorithm is the recipe the computer follows.' },

  photo('See it: who trades with whom', 'orig-gupta-network.jpg', [
    'A node-link chart of companies and people around Sanjeev Gupta\'s Liberty Commodities.',
    'Nodes are people (photos) and companies (buildings). A solid line means owner, shareholder or director; a dotted line means an associate or former employee.',
    'The rings around nodes are categories: same registered address, a loan from Wyelands Bank, or the same auditor.',
    'Here the drawing is the story: who is connected to whom. That is also its risk: each line is a claim about real people.',
    'Image from the 2025 deck. Its source is not confirmed, so treat every line as unchecked.'
  ], '2 min. From the 2025 deck (slide 12). SOURCE NOT CONFIRMED: the 2025 slide gives none, and a search for its headline ("How one Gupta accused of fraud knows another Gupta suspected of fraud") found nothing. Leads: "Friends of Sanjeev", GFG\'s term for associated companies, reported by Argus Media and Global Trade Review, naming UBG and Aartee, both in the graphic. Do not name a publisher out loud until it is found; Gupta faces live criminal proceedings in the UK. Hidden in the student copy. ' +
    'Point out the encodings: node shape (person or company), line style (relation type), ring colour (shared address, lender, auditor).'),

  { type: 'figure', figure: 'network', title: 'The hairball',
    figureEyebrow: 'See it', figureCredit: 'Les Misérables co-occurrence · Knuth (1993)', figureAlt: 'A force-directed drawing of 77 Les Misérables characters and 254 links: a dense tangle.',
    figureData: { nodes: mis.nodes, links: mis.links, colours: mis.colours, layouts: mis.layouts, valueTitle: mis.valueTitle, r: 7, key: [{ mark: 'dot', colour: '#e45756', text: 'a character (colour = their group)' }, { mark: 'line', colour: '#9fb3c8', text: 'the two are in a scene together' }] },
    figureSteps: [
      { caption: 'Each dot is a character in Les Misérables. A line joins two characters who are in a scene together.', layout: 'force', labels: 'hubs',
        explain: 'Each dot is a character from Victor Hugo\'s novel Les Misérables. A line joins two characters who appear in the same scene.\nThe colours are groups of characters who mostly appear together.' },
      { caption: 'Point at Valjean: he shares a scene with 36 characters. Try to follow his lines.', layout: 'force', lit: 'Valjean', labels: 'hubs',
        explain: 'Pointing helps: Valjean\'s lines stay bright and the rest fade.\nNow try a harder question from the picture: does Javert share a scene with Fantine? The lines cross so often that you cannot follow one.' },
      { caption: '77 characters and 254 lines: too many to follow by eye. People call this a hairball.', layout: 'force', labels: 'hubs',
        explain: 'When a network has many lines, the middle turns into a tangle that nobody can read. Network designers call it a hairball.\nThe next part shows a way out: draw the same data as a grid.' }
    ],
    notes: '2 min. Data: Knuth, The Stanford GraphBase (1993), as in vega_datasets (data.miserables). The same data the next part turns into a matrix.' },

  photo('See it: books bought together', 'orig-touchgraph-books.jpg', [
    'TouchGraph\'s Amazon browser: each node is a book, and a line joins two books that customers often bought together.',
    'The coloured clouds are clusters, groups of books with many links inside them (here, topics such as social networks and complexity).',
    'Node-link works here because it is small and the clusters are what you want to see.',
    'Image from the 2025 deck (touchgraph.com).'
  ], '1 min. From the 2025 deck (slides 18–21). Clusters: the word from the terms slide, seen in the wild.'),

  photo('See it: a network on a map', 'orig-munich-geo.jpg', [
    'Munich\'s U-Bahn and S-Bahn drawn on the city\'s real geography.',
    'Here position is geography, as in Week 7, so distances are true but the centre is crowded.',
    'Compare the Tube hook: a schematic gives up true distance to make the connections readable.',
    'Map by M. Dörrbecker (June 2014), Wikimedia Commons, CC BY-SA. From the 2025 deck.'
  ], '1 min. From the 2025 deck (slide 22, "Graphs on maps"). The caption there said 2013; the map itself says June 2014. Ties back to Week 7: here the layout is a projection again.'),

  photo('Critique it: Liveplasma', 'orig-liveplasma.jpg', [
    'Liveplasma: type in a band, a film or an author, and it draws others like it as pictures joined by lines.',
    'What does a line mean: bought together, the same genre, the same fans? The page does not say.',
    'Where does the data come from, and why are some pictures bigger or closer? Not explained either.',
    'A network picture needs a key: what a dot is, what a line is, and where the data came from.',
    'Image from the 2025 deck (liveplasma.com), where it was flagged: mapping and data source unclear.'
  ], '2 min. Critique, not just admire. ASK in pairs first: "What would you need to know before you trusted this?" Collect three answers, then reveal the facts. Compare TouchGraph (in the student copy), which says what a line means.'),

  reveal('A line is a claim: draw it with care', 'Care', 'claim', ['Near is not proof.', 'A line accuses.', 'Names leak.', 'Colour alone fails.'],
    '2 min. Responsible practice, one point per click. Card 2 is Liveplasma again (and the Gupta graphic in the 2025 deck): an unexplained line can be defamatory. Card 3: re-identification from connections in anonymised social data. Card 4: colour-coded clusters need a second encoding.'),

  drawn('Build it: the Tube in Altair', 'build-tube.svg',
    '3 min. Same three layers as A–H, on real data. Position is longitude and latitude this time. Colour is data: TfL\'s line colours, through a scale with a domain (the line names) and a range (the hexes). ' +
      'Altair has no layout of its own: the positions come with the data, here from geography. For a computed layout, students can use networkx (nx.spring_layout) to make the x and y columns. That is the next step, not today\'s.'),

  { type: 'image', title: 'When dots and lines stop working', image: asset('breaks.svg'), imageFit: 'contain', design: { capStyle: 'none' },
    notes: '1 min. From the 2025 deck\'s "Challenges of graph visualisations", rewritten for networks (it said "large trees").' },

  { type: 'image', title: 'Too big to see at once? Let the reader move', image: asset('move.svg'), imageFit: 'contain', design: { capStyle: 'none' },
    notes: '1 min. Interaction is how big networks are read in practice. The last card is Shneiderman\'s mantra (1996): "Overview first, zoom and filter, then details-on-demand." The lab adds the Select step in Altair.' },

  { type: 'image', title: 'Or make the picture simpler', image: asset('simpler.svg'), imageFit: 'contain', design: { capStyle: 'none' },
    notes: '1 min. Filtering by degree; the ego network; aggregation into meta-nodes; edge bundling; focus + context (the fisheye on slide 5, and folding a tree).' },

  statement('In a dots-and-lines picture, where a dot sits is chosen, not measured: trust the edges, not the gaps', '30 s. Card 3.'),

  /* ======================================================== ④ Matrix */
  section('What if there are too many lines to read?', 'Part 4 · Matrix', '20 s.'),

  { type: 'figure', figure: 'network', title: 'Untangle it into a grid',
    figureEyebrow: 'See it', figureCredit: 'Les Misérables co-occurrence · Knuth (1993)', figureAlt: 'The Les Misérables network, first as a tangle of lines, then as a 77 by 77 matrix reordered by name, by number of links and by group.',
    figureData: { nodes: mis.nodes, links: mis.links, colours: mis.colours, layouts: mis.layouts, valueTitle: mis.valueTitle, r: 7, key: [{ mark: 'dot', colour: '#e45756', text: 'a character (colour = their group)' }, { mark: 'line', colour: '#9fb3c8', text: 'the two are in a scene together' }] },
    figureSteps: [
      { caption: 'The hairball again: 77 characters and 254 lines.', layout: 'force', labels: 'hubs',
        explain: 'The same 77 characters and 254 lines as before.' },
      { caption: 'The same data as a grid. Each character has a row and a column; a square means those two share a scene.', view: 'matrix', order: 'name', key: GRIDKEY,
        explain: 'It works like the mileage chart in a road atlas: every place along the top and down the side, and the square where two meet tells you about that pair.\nEvery character gets one row and one column, in A to Z order. Where a row and a column meet, a square means those two share at least one scene. A darker square means more scenes together.\nNo lines cross, ever. Point at a square to read the two names. This kind of grid is called a matrix.' },
      { caption: 'The rows sorted from the busiest character to the quietest: the busy ones gather top left.', view: 'matrix', order: 'degree', key: GRIDKEY,
        explain: 'Same squares, different order: now the character with the most connections (Valjean) is in the first row and column.\nThe order of the rows is a choice, like where you put the dots in a picture. Different orders show different things.' },
      { caption: 'The rows sorted by group: each group shows up as a block of squares along the diagonal.', view: 'matrix', order: 'group', key: GRIDKEY,
        explain: 'Now characters in the same group sit next to each other.\nEach solid block on the diagonal is a group of characters who mostly share scenes with each other. The few squares away from the diagonal are the characters who link one group to another.' },
      { caption: 'Does Javert share a scene with Fantine? Where Javert\'s row meets Fantine\'s column, the ringed square says yes.', view: 'matrix', order: 'group', lit: 'Fantine-Javert', key: GRIDKEY,
        explain: 'Javert\'s row and Fantine\'s column are named and shaded. Where they cross there is a square, ringed in red, so they share at least one scene.\nIn the tangle of lines this question was almost impossible. In the grid it is one square, and the groups still show around it.' }
    ],
    notes: '5 min. The set piece: watch the squares travel as the order changes. ASK on step 2: "Does Javert share a scene with Fantine?" Point to the cell: yes. Easy here, near impossible in the hairball. ' +
      'Evidence: Ghoniem, Fekete & Castagliola (2004) found matrices beat node-link for most reading tasks once a network is dense, except following a path.' },

  drawn('Build it: a matrix in one chart', 'build-matrix.svg',
    '3 min. Altair needs no layout for a matrix: rows and columns are just two nominal fields. The pairs table is written both ways round (pd.concat) because the grid shows each pair twice. Sorted by name, so the clusters are hidden.'),

  drawn('Build it: one word changes the order', 'build-matrix-grouped.svg',
    '1 min. Before and after: the only change is the order list. Sort by group and the blocks appear. Same data, same chart, a different story.', { transition: 'none' }),

  { type: 'compare', title: 'Dots and lines, or a grid?', subtitle: 'Dots and lines (node-link)\tA grid (matrix)', progressive: true,
    bullets: [
      'Size\tSmall networks, few lines\tBig networks, many lines',
      'Paths\tFollow a route by eye\tA path is hard to trace',
      'Pairs\tHard once lines cross\tAny pair: one cell',
      'Clusters\tShow if the dots land well\tBlocks, once the rows are in a good order',
      'Readers\tFamiliar: everyone reads it\tNeeds a sentence of explanation'
    ],
    notes: '2 min. Ghoniem, Fekete & Castagliola (2004), "A comparison of the readability of graphs using node-link and matrix-based representations", IEEE InfoVis. Munzner ch. 9 makes the same comparison.' },

  statement('When the lines tangle, draw a grid instead', '30 s. Card 4.'),

  { type: 'content', title: 'Join it up: why a grid for Les Misérables?', progressive: true,
    bullets: [
      'Point\tFor the Les Misérables network, draw a grid, not dots and lines.',
      'Because\t77 characters and 254 lines cross so often that the eye cannot follow any one line.',
      'So\tIn a grid every pair has its own square, and no lines cross at all.',
      'In this case\tDoes Javert share a scene with Fantine? In the tangle you cannot tell. In the grid it is one square.'
    ],
    notes: '2 min. The chain a full answer needs (the Nodes "join it up"): a point, the reason, what follows from it, and the evidence from this case. ' +
      'Reveal one link at a time and ask the room for each before showing it. Most weak answers stop after the point.' },

  reveal('Why a grid? Which answer is strongest?', 'Three answers', 'three', ['Hands up: A, B or C?', 'A is weak: no real reason.', 'B is stable: a point and a reason.', 'C is excellent: every link of the chain.'],
    '3 min. The question is on the slide. Hands up for A, B or C before the first click. Each click gives an answer its level and what it has or misses, mapped onto the chain from the last slide. B to C is the jump students most often miss: saying what the better drawing does, and pointing at the data.'),

  /* ======================================================== ⑤ Nest */
  section('How do you draw things inside things?', 'Part 5 · Nest', '20 s. Trees, which have one more way to be drawn. Things inside things is a hierarchy.'),

  { type: 'figure', figure: 'tree', title: 'One London, four drawings',
    figureEyebrow: 'See it', figureCredit: `ONS mid-${london.year} population estimates`, figureAlt: 'London\'s 33 boroughs as a tree, an indented list, an icicle and a treemap, sized by population.',
    figureData: { root: london.root, colours: london.colours, valueTitle: london.valueTitle, format: london.format, key: [{ mark: 'box', colour: '#4c78a8', text: 'Inner London' }, { mark: 'box', colour: '#f58518', text: 'Outer London' }, { mark: 'none', text: 'bar or box size = number of people' }] },
    figureSteps: [
      { caption: 'London splits into Inner and Outer London, then 5 areas, then 33 boroughs. The lines show what belongs to what.', layout: 'link',
        explain: 'This is a tree: London at the start (the root), splitting into Inner and Outer London, then into 5 areas, then into the 33 boroughs (the leaves).\nEach line joins a part to the bigger part it belongs to. This drawing shows who belongs to whom very clearly. It says nothing about size: tiny City of London gets the same dot as Croydon.' },
      { caption: 'The same tree as a list, like folders on a laptop. The bar shows how many people live there.', layout: 'indent',
        explain: 'Each row is one place, pushed to the right the deeper it is, the way your laptop shows folders inside folders.\nThe bar is the number of people. A bigger area\'s bar is all of its boroughs\' bars added up.' },
      { caption: 'The same tree as bands: each band is all of London, cut into smaller and smaller pieces.', layout: 'icicle',
        explain: 'The top band is all of London. Each band below cuts it into smaller pieces: Inner and Outer, then the 5 areas, then the 33 boroughs.\nThe width of each piece is its number of people, so now you can see size: Outer London holds more people than Inner London. This drawing is called an icicle.' },
      { caption: 'Point at any box to see its borough, how many people live there, and where it belongs.', layout: 'treemap', lit: 'Croydon',
        explain: 'Point at a box. The card shows the borough\'s name, its number of people, its share of London, and its path back to London (lit in red).\nCroydon has the most people of any London borough.' },
      { caption: 'The same tree as boxes inside boxes. The bigger the box, the more people live there.', layout: 'treemap',
        explain: 'Think of a cupboard: one big box with smaller boxes inside, and smaller ones inside those. Bigger population, bigger box.\nEach borough is a box, inside its area\'s box, inside Inner or Outer London. The area of each box is its number of people.\nBelonging is shown by being inside a box, not by lines. You see the biggest boroughs at once, but it is harder to see how many levels the tree has. This drawing is called a treemap.' }
    ],
    notes: '6 min. Watch every node travel between layouts: the same rectangles each time. ' +
      `Data: ONS mid-${london.year} estimates via Nomis (NM_2002_1); the five areas are ONS's ITL2 regions (Inner London West and East; Outer London East and North East, South, West and North West). London in all: about 9.1 million. ` +
      'Croydon is the largest borough in these estimates; check the card live.' },

  reveal('Four ways to draw a tree', 'Name it', 'trees', ['Dots and lines: who is under whom.', 'An indented list: like folders.', 'An icicle: levels as bands.', 'A treemap: size as area.'],
    '1 min. One drawing per click, each named after the London figure they just saw.'),

  { type: 'image', title: 'When a tree gets too big', image: asset('big-tree.svg'), imageFit: 'contain', design: { capStyle: 'none' },
    notes: '1 min. From the 2025 deck: depth versus breadth. Treemaps cope with width (small boxes) but hide depth; node-link trees show depth but run out of width.' },

  statement('Ben Shneiderman invented the treemap to see what was filling his hard disk',
    '1 min. Shneiderman (1992), "Tree visualization with tree-maps: a 2-d space-filling approach", ACM Transactions on Graphics 11(1). The idea dates from about 1990. Today: disk-space tools and stock-market maps (each box a company, sized by value, coloured by price change).'),

  drawn('Build it: an icicle from four stacked bars', 'build-icicle.svg',
    '3 min. An icicle is four stacked bars, one per level, each adding up to London. The trick is pd.concat: the same 33 rows four times, grouped by a different column each time. alt.Order keeps children under their parent. ' +
      'Altair has no treemap mark; the squarify package draws one with matplotlib. Optional.'),

  statement('Boxes inside boxes show size; lines show who belongs to whom', '30 s. Card 5.'),

  { type: 'image', title: 'Networks in disguise', image: asset('disguise-networks.svg'), imageFit: 'contain', design: { capStyle: 'none' },
    notes: '1 min. Sankey and chord are weighted networks: the width of a band is the amount. An arc diagram is dots and lines with the dots on one line. Hive plots (dots on axes by a fact about them) are another, for the curious.' },

  { type: 'image', title: 'Trees in disguise', image: asset('disguise-trees.svg'), imageFit: 'contain', design: { capStyle: 'none' },
    notes: '1 min. Sunburst, circle packing and radial trees (root in the centre) are tree layouts; dendrograms show the result of hierarchical clustering. ' +
      'Good layouts aim for few crossings, no overlapping dots, lines of similar length, and symmetry.' },

  /* ======================================================== Arriving */
  drawn('Connect, matrix, nest', 'three-ways.svg',
    '1 min. The whole lecture on one slide (Munzner ch. 9: connection, matrix alignment, containment).'),

  reveal('Which drawing? Ask what the reader wants to know', 'Choose', 'choose', ['A route: dots and lines.', 'A pair, with lots of lines: a grid.', 'A size inside a group: boxes inside boxes.'],
    "1 min. A rule, not a comparison table: the reader's question picks the drawing. One click per question. The quiz next uses exactly these three."),

  reveal('Which drawing? Hands up', 'Check', 'quiz', ['Hands up for each: Connect, Matrix or Nest?', 'A route: Connect.', 'Many connections: Matrix.', 'A size inside a group: Nest.', 'Where many edges meet: Connect.', 'Who is under whom: Connect, as a tree.'],
    '4 min. Read each question; hands up for Connect, Matrix or Nest; then click for the answer. If a row splits the room, go to the next step slide.'),

  reveal('Take the next step, only as far as you need', 'Got one wrong?', 'ladder', ['First, ask yourself what the question wants.', 'Still stuck? A hint.', 'Still stuck? A worked example.', 'Then try a new one.'],
    '2 min. The missing-link ladder: take only the next step you need. Students who got all five right go straight to step 4. Answer to step 4: a grid, 20 rows and 20 columns, a square when two clubs have played.'),

  { type: 'content', title: 'Five cards, one sentence',
    bullets: [
      '1\tA tree is a network with no loops and one root.',
      '2\tEvery network can be written as a list of pairs.',
      '3\tIn a dots-and-lines picture, where a dot sits is chosen, not measured: trust the edges, not the gaps.',
      '4\tWhen the lines tangle, draw a grid instead.',
      '5\tBoxes inside boxes show size; lines show who belongs to whom.'
    ], progressive: true,
    notes: '1 min. Read as one: name the data, store it as pairs, then pick links, a grid or nesting by the question.' },

  { type: 'table', title: 'Tools people use for networks', tableHeader: true,
    body: 'Tool\tWhat it is for\n' +
      'Gephi\ta free desktop app to explore a network by eye\n' +
      'Python: NetworkX\tthe numbers (degree, paths, groups); PyVis or Plotly to draw\n' +
      'R: igraph and ggraph\tthe same, in R\n' +
      'D3.js\tcustom interactive network pictures for the web\n' +
      'Flourish or Kumu\tquick networks with no code\n' +
      'Tableau, Power BI\tpossible, but awkward for networks',
    notes: '1 min. Data comes as an edge list (source, target, weight) plus a node table (id and facts), as in today\'s CSVs. Tools also read JSON (D3), GraphML and GEXF (Gephi). Cytoscape is the standard in biology.' },

  { type: 'content', title: 'In the lab',
    bullets: [
      'Draw\tthe Tube\'s Zone 1 from tube_stations.csv and tube_links.csv (the Build-it code)',
      'Point\tadd a tooltip, then a hover that lights a station\'s edges (Week 5\'s selection)',
      'Grid\tthe Les Misérables matrix; try three orders and say what each one shows',
      'Nest\tthe borough icicle from london_boroughs.csv',
      'Stretch\tnetworkx: nx.spring_layout makes the x and y for any edge list'
    ],
    notes: '1 min. The three CSVs are in assets/lesson/ipdv/week8/, written by tools/ipdv-week8/code/steps.py from TfL Open Data and the ONS estimates.' },

  statement('Tell your neighbour: why isn\u2019t the Tube map accurate, and why is that a good thing?', '2 min. Instead of "any questions?": one sentence each, to the person next to them. Walk the room and listen: you will hear quickly who has it. Then open the floor.')
  ];
}

/* No Why? buttons: a figure's words are on the slide (a story panel or a reveal list), or the teacher says them.
   Each step's explanation goes to the end of the notes, so the teacher has them in the presenter view. */
function lesson() {
  return draft().map(s => {
    if (s.type !== 'figure' || s.figure === 'reveal' || s.figureStory) return s;
    const steps = s.figureSteps.map((st, i) => `${i + 1}. ${String(st.explain || '').replace(/\n/g, ' ')}`).join('\n');
    return { ...s, figureWhy: false, notes: `${s.notes || ''}\n\nSAY, STEP BY STEP:\n${steps}` };
  });
}

/* The student copy: room-only slides hidden. */
const STUDENT = [['See it: who trades with whom', 'none'], ['Tell your neighbour: why isn\u2019t the Tube map accurate, and why is that a good thing?', 'none']];

/* Optional slides: shown to the teacher like every other, with "OPTIONAL: skip if short of time" in their notes.
   Without them the lecture fits 90 minutes; with them it runs about 110. */
const REFERENCE = [
  'See it: a family tree', 'Three ways to write one network', 'Build it: the nodes', 'Build it: the edges',
  'The words again, plus three more', 'Four layers of every chart, on the Tube map', 'See it: who trades with whom',
  'See it: books bought together', 'Or make the picture simpler', 'Build it: one word changes the order',
  'When a tree gets too big', 'Ben Shneiderman invented the treemap to see what was filling his hard disk',
  'Networks in disguise', 'Trees in disguise', 'Tools people use for networks',
  'Three kinds of edge', 'Five numbers that describe a network', 'See it: a network on a map', 'Dots and lines, or a grid?', 'Connect, matrix, nest'
];

module.exports = { lesson, STUDENT, REFERENCE };
