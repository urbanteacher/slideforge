import chevron from '../assets/ukbt/ukbt-chevron.svg?raw';
import { createLayer, uid } from './defaults';
import { fromPreset } from './guide';
import { syncHeaderFooter } from './headerFooter';
import { cardsSlide, guideStyle, journeySlide, keyfactSlide, keywordsSlide, pointsSlide, sectionSlide, slideStyle, tableSlide, titleSlide, type LayoutStyle } from './layouts';
import { paletteGroups } from './palettes';
import type { Deck, Slide } from './types';

// UK Black Tech's two partnership packs — SlideForge's `ukbt-sponsorship` and
// `ukbt-institute-partnership` lessons — written into the lab's own layouts, each in its palette.
// The copy and the speaker notes are SlideForge's, word for word.

type Ground = 'working' | 'quiet' | 'loud';

/** The palette, the style each ground wears, and a helper that files a slide's ground and notes. */
export function kit(id: string) {
  const guide = fromPreset(paletteGroups()[0].presets.find((p) => p.id === id)!);
  const base = guideStyle(guide);
  const on = (g: Ground): LayoutStyle => slideStyle(base, { ground: g === 'working' ? undefined : g });
  const put = (s: Slide, g: Ground, notes: string) => {
    if (g !== 'working') s.ground = g;
    s.notes = notes;
    return s;
  };
  return { guide, on, put };
}

/** Slide names from their titles, and one transition throughout. */
export function finish(slides: Slide[]) {
  slides.forEach((s, i) => {
    const title = s.layers.find((l) => l.kind === 'text' && (l.name === 'Heading' || l.name === 'Hero'));
    // A section break says so in its name: the header's section slot reads it, and the header stays off it.
    // A closing picture is a cover too: its artwork runs to the edges, so the header and footer stay off.
    const kind = s.name === 'Section' ? 'Section · ' : s.name === 'Closer' ? 'Cover · ' : '';
    s.name = `${i + 1} · ${kind}${String(title?.params.text ?? s.name).replace(/\s+/g, ' ')}`;
    s.transition = { type: 'fade', duration: 0.6 };
  });
  return slides;
}

/** The deck's header and footer: the brand's logo and the section top, its name and the page along
 *  the foot. Off on the cover, which carries its own. */
export function framed(d: Deck, logo: string, name: string): Deck {
  d.headerFooter = {
    enabled: true, hideOnCover: true,
    slots: { 'header-left': { kind: 'logo', src: logo }, 'header-right': { kind: 'section' }, 'footer-left': { kind: 'text', text: name }, 'footer-right': { kind: 'pages' } },
  };
  syncHeaderFooter(d);
  return d;
}

/** The brand's chevron, large and green, cut by the right edge of a cover. */
const bigChevron = () => createLayer('image', { name: 'Chevron', box: { x: 1330, y: 180, w: 468, h: 720, rot: 0 }, params: { src: 'data:image/svg+xml;base64,' + btoa(chevron.replace('#fff', '#00c57f')), fit: 'contain' }, anim: { type: 'slideLeft', duration: 1.1, delay: 0.2 } });

// UK Black Tech: navy working slides, UKBT Black for the section breaks, UKBT Green for the one
// number that matters, Alpha Lyrae on the cover.
export function ukbtDeck(): Deck {
  const { guide, on, put } = kit('ukbt');
  const cover = put(titleSlide(on('working'), 'Partnership\nPack', 'Building the UK’s most equitable tech ecosystem — with partners who mean it.'), 'working',
    'The deck follows the written pack, so the two never drift apart. Two things to do before it goes to anybody: set the real prices, and fill in the bracketed confirmations — the pack marks both and so do these notes.');
  cover.layers.push(
    createLayer('image', { name: 'UK Black Tech wordmark', box: { x: 132, y: 96, w: 271, h: 64, rot: 0 }, params: { src: guide.marks[0].src, fit: 'contain' }, anim: { type: 'fade', duration: 0.8 } }),
    bigChevron(),
  );
  const slides: Slide[] = [
    cover,
    put(sectionSlide(on('quiet'), 'Who we are', 'Seven years, thirty-five events, one ecosystem.'), 'quiet',
      'Short. The room already knows roughly who you are or they would not be in it; this is the turn into the substance.'),
    put(pointsSlide(on('working'), 'What UK Black Tech does', [
      ['Increases wealth', 'By promoting a culture of innovation, tech and digital skills across its community.'],
      ['Moves knowledge', 'Stimulates and manages the flow of technical insight between universities, R&D institutions, companies and markets.'],
      ['Builds companies and talent', 'Through events and spin-off initiatives.'],
      ['Serves the wider sector', 'Value-added services beyond our own community.'],
    ]), 'working', 'Straight from §1 of the pack. The line to say out loud and not put on the slide: a great tech ecosystem needs equity, transparency and representation at the cutting edge — not as an afterthought to it.'),
    put(keyfactSlide(on('loud'), 'Who you would be reaching', '20,000 tech professionals', 'Combined reach across the UK Black Tech platform', [
      '60% identify as women.', '35% are under 25.',
      'Unusually young and unusually female for UK tech — if your objective is early-careers hiring, graduate pipeline or reaching women in technical roles, this audience over-indexes for you where general tech channels do not.',
    ]), 'loud', 'Say the number, then stop. The two lines under it are what make it different from every other reach figure in the room.\n\nThe pack flags more to add here if it can be evidenced: newsletter subscribers and open rate, social following, average event attendance, seniority split, geography, top employers represented. A figure you cannot evidence is worse than no figure.'),
    put(pointsSlide(on('working'), 'Why partner with us', [
      ['A hard-to-reach audience', 'Not a mailing list bought in — built over seven years of consistent, in-person, sector-specific work.'],
      ['Credibility, not visibility', 'Presence in this ecosystem signals to Black tech professionals that you are a serious employer or buyer. That signal is earned through repetition.'],
      ['A pipeline, not a photo', 'Partners use us for hiring, supplier diversity, product research, community insight and thought leadership — often all four.'],
      ['Measurable return', 'Every partnership reports against metrics agreed at kick-off.'],
    ]), 'working', 'Open with the sentence from the pack: most diversity partnerships fail for the same reason — they buy a logo placement at a one-off event and nothing changes. Say it plainly. It is the argument the whole deck rests on and it earns the room’s attention because it concedes something first.'),
    put(sectionSlide(on('quiet'), 'Four ways in', 'Annual tiers, and single opportunities for partners not ready for one.'), 'quiet', 'The turn into the commercial half.'),
    put(tableSlide(on('working'), 'Annual tiers · placeholder pricing', [
      '\tCommunity\tGrowth\tStrategic\tFounding',
      'Annual investment\t£3,000\t£8,500\t£20,000\t£40,000+',
      'Term\t12 months\t12 months\t12 months\t24 months',
      'Places available\tOpen\t8\t4\t2',
      'Job listings\t3 / year\t10 / year\tUnlimited\tUnlimited',
      'Events included\t—\t1\t2\t3 + named series',
      'Speaking slots\t—\t1\t2\t3 + keynote',
      'Sponsored articles\t—\t1\t2\t4',
      'Roundtables\t—\t—\t1\t2',
      'Research report\t—\t—\t—\t1',
    ].join('\n')), 'working', 'PRICING IS PLACEHOLDER — the pack says so in a warning box and the slide title says so on the projector. These are a starting structure based on typical UK market rates for an organisation of this size and reach. Set your own numbers before this goes to any partner, and change the title when you do.\n\nThe full matrix in the pack has six more rows — newsletter features, social amplification, survey questions, named manager, reporting, programme input. They are in the leave-behind; this slide is the shape of the offer.'),
    put(cardsSlide(on('working'), 'What each tier is for', [
      ['Community', 'Smaller organisations, startups and scale-ups who want presence and access without a large commitment. An entry point, not a lesser partner.'],
      ['Growth', 'Organisations with an active hiring or brand objective. The most common starting tier for corporates testing the relationship.'],
      ['Strategic', 'Partners with a defined DEI, talent or community strategy who need depth, data and repeated visibility. Includes closed-door roundtable access.'],
      ['Founding', 'A small number of long-term partners who want to shape the programme itself, not just appear in it. Two places; the 24-month term gives both sides runway to build something real.'],
    ]), 'working', 'Name the tier you think they belong in before you get to this slide, then let them read the others. A partner who chooses their own tier stays in it.'),
    put(cardsSlide(on('working'), 'Single opportunities · placeholder pricing', [
      ['Event', '£3,500 — a high-impact event bringing together experts in your target sector. A platform for thought leadership and networking.'],
      ['Article', '£1,200 — an expertly crafted piece on a topic or trend relevant to your audience.'],
      ['Roundtable', '£5,000 — an intimate, invite-only discussion. A deep dive into an industry challenge, with meaningful dialogue and brand alignment.'],
      ['Report', '£12,000 — original insight and data, positioning your organisation as a thought leader.'],
    ]), 'working', 'For partners not ready for an annual tier, or adding to one. Placeholder pricing again.\n\nAlso in the pack and not on this slide: event hosting from £4,500 virtual and £9,000 in person excluding venue and catering, with a month’s prep and two planning meetings; and platform advertising — £250 a job listing, £1,000 for five, £400 an event listing, £750 a month for a banner.'),
    put(journeySlide(on('working'), 'How it works', 'Six steps, and the first one is not a pitch', [
      ['Intro call', 'Thirty minutes. We understand your objectives and current activity. No pitch.'],
      ['Proposal', 'Back within five working days with a recommended tier or bundle, mapped to your objectives.'],
      ['Agreement', 'Contract, invoice, kick-off date set.'],
      ['Kick-off', 'Sixty minutes to agree the activity calendar, success metrics and points of contact.'],
      ['Delivery', 'With a named manager at Strategic and Founding.'],
      ['Reporting', 'Quarterly, against the metrics agreed at kick-off.'],
    ]), 'working', 'Six steps is the most a room will hold. Reveal them one at a time and dwell on the first: "no pitch" is the promise that makes the call easy to accept, so do not undercut it by pitching on the call.'),
    put(keywordsSlide(on('working'), 'What we report, and what we ask', [
      ['Reach and engagement', 'impressions, attendance, open rates, click-throughs, per activity'],
      ['Pipeline', 'applications and enquiries generated from job listings'],
      ['Who came', 'event attendance profile — seniority, discipline, career stage'],
      ['One contact', 'a single point of contact with authority to decide'],
      ['Assets on time', 'slow approvals are the main cause of missed promotion windows'],
      ['People who want to be there', 'not people who were told to attend'],
    ]), 'working', 'Two halves of one bargain, which is why they share a slide. The sentence from §7 worth saying out loud: we would rather report something honest and modest than something impressive and vague — if an activity underperforms we will tell you, and we will fix it.\n\nAnd from §8: we reserve the right to decline or end a partnership where the relationship is inconsistent with our values or our community’s interests. Say it if the room needs to hear it.'),
    put(pointsSlide(on('quiet'), 'Next steps', [
      ['Book an intro call', 'Thirty minutes, no pitch. Add your booking link before presenting.'],
      ['Add your contact details', 'Name, role, email, phone, website, LinkedIn — the pack leaves all six to confirm.'],
      ['Set the prices', 'Every figure in this deck is a placeholder until you replace it.'],
    ]), 'quiet', 'This slide is a checklist for you, not for the partner — replace it with your actual contact details and the booking link before this deck leaves the building, and change the two placeholder-pricing titles at the same time.'),
  ];
  return framed({ id: uid(), title: 'UK Black Tech — partnership pack', width: 1920, height: 1080, version: 1, theme: 'guide', styleGuide: guide, slides: finish(slides) }, guide.marks[0].src, 'UK Black Tech · Partnership pack');
}

// The UKBT Institute's partnership pack (SlideForge's `ukbt-institute-partnership`), in the
// Institute palette: UKBT Black working slides, Contrast Black for the quiet ones, and the
// independence statement on the green, because it is the slide the room should look up at.
export function ukbtInstituteDeck(): Deck {
  const { guide, on, put } = kit('ukbt-institute');
  const cover = put(titleSlide(on('working'), 'Partnership\nPack', 'Research, hackathons and programmes tackling the social problems technology keeps missing.'), 'working',
    'The deck follows the written pack. Before it goes anywhere: set the real costs, and fill in the bracketed confirmations — particularly the Sickle Cell outcomes, which the pack itself calls the strongest proof point with no numbers attached.');
  cover.layers.push(
    createLayer('image', { name: 'UKBT Institute logo', box: { x: 132, y: 96, w: 443, h: 64, rot: 0 }, params: { src: guide.marks[0].src, fit: 'contain' }, anim: { type: 'fade', duration: 0.8 } }),
    bigChevron(),
  );
  const slides: Slide[] = [
    cover,
    put(pointsSlide(on('working'), 'What the Institute is', [
      ['Why it exists', 'A lot of technology gets built for a narrow slice of the population, and the consequences land hardest on communities that were never in the room.'],
      ['What it does about it', 'Puts those communities in the room — alongside clinicians, data scientists, engineers and academics, on problems that matter to them.'],
      ['Where it sits', 'The research and programme arm of UK Black Tech. Where the parent builds the ecosystem, the Institute produces the evidence, the training and the prototypes.'],
    ]), 'working', 'Three beats: the problem, the method, the relationship to the parent. The third matters commercially — a partner who wants brand reach across a tech community wants the UK Black Tech pack, not this one, and saying so early saves a wasted meeting.'),
    put(cardsSlide(on('working'), 'What we have built so far', [
      ['16 courses', 'Digital courses created with Tech Mums, FutureLearn and the University of Leeds.'],
      ['1 hackathon', 'The Sickle Cell Hackathon — doctors, data scientists, patients and web developers, at the Design Museum.'],
      ['5 institutions', 'Including a collaboration with LSBU’s Computer Science department.'],
    ]), 'working', 'Track record, not ambition. Keep it to things that have finished.'),
    put(pointsSlide(on('working'), 'The Sickle Cell Hackathon', [
      ['The condition', 'The UK’s most common genetic blood disorder, disproportionately affecting people of African and Caribbean heritage — and chronically under-served by health technology.'],
      ['The method', 'Patients in the build process alongside the clinicians treating them and the developers who could prototype. From the first hour, not as a consultation at the end.'],
      ['Why it is here', 'It is the clearest example of how the Institute works, and it is the thing partners ask about.'],
    ]), 'working', 'THIS SLIDE NEEDS NUMBERS. The pack says so itself: participants, prototypes produced, what happened to them afterwards, press coverage, continued development. It is the strongest proof point in the pack and it currently has none attached. A partner will ask, and "I would have to check" is a worse answer than a modest real figure.'),
    put(keywordsSlide(on('working'), 'The research agenda', [
      ['Women’s Health in the Age of Technology', 'how digital health tools serve, or fail to serve, women and particularly Black women'],
      ['Health equity and clinical data', 'where datasets under-represent communities, and what that produces downstream'],
      ['Theme three', 'to confirm'],
      ['Theme four', 'to confirm'],
    ]), 'working', 'Two real themes and two to fill in. Do not present the placeholders — either add the themes or cut the rows, because an agenda that is half blank reads as an agenda that is half imagined.\n\nThe pack also asks for published outputs, working papers and studies in progress. A partner funding research wants to see what your research actually looks like before they fund more of it.'),
    put(pointsSlide(on('working'), 'Why partner with the Institute', [
      ['Communities research fails to reach', 'Recruitment into health research from Black and minority communities is a known, documented problem. We have earned the trust to do it — as partners with those communities, not extractors of data.'],
      ['Applied output, not shelf-ware', 'Hackathons produce prototypes. Courses produce trained people. Reports are written to be used.'],
      ['Cross-sector convening', 'Clinicians, patients, academics and engineers in one room is harder to arrange than it sounds. It is most of what we do.'],
      ['Credible impact reporting', 'Specific, evidenced and defensible — including under Social Value Model requirements in public procurement.'],
    ]), 'working', 'The fourth one closes deals with procurement teams and nobody else. Know which of the four the person in front of you is buying.'),
    put(sectionSlide(on('loud'), 'Partners fund our work.\nPartners do not determine our findings.', 'Research independence'), 'loud',
      'The most important slide in the deck and the one to slow right down on. It is on the green because it is the thing you want the room to look up at.\n\nThe argument, if it is challenged: a report a sponsor could have edited is a marketing document, and everyone reading it knows that. Independence is not a constraint on the value — it is the value.'),
    put(pointsSlide(on('working'), 'What that means in practice', [
      ['Questions agreed jointly', 'At the outset, and documented.'],
      ['Conclusions rest with us', 'Methodology, analysis and conclusions sit with the Institute and its academic collaborators.'],
      ['You see it first', 'Partners see findings before publication and may correct factual errors about their own organisation. They may not require changes to conclusions.'],
      ['Funding is disclosed', 'In the published output, every time.'],
      ['We publish the inconvenient', 'Including when it is inconvenient to a funder.'],
    ]), 'working', 'Five rules, revealed one at a time. This is standard practice for a credible research institute — say that, because it reframes the terms from awkward to professional.'),
    put(tableSlide(on('working'), 'Partnership routes · placeholder costs', [
      'Route\tScope\tPlaceholder cost',
      'Research\tInsight brief\t£15,000',
      'Research\tFull study\t£45,000',
      'Research\tMulti-year programme\t£100,000+',
      'Programme\tCourse development\tfrom £20,000',
      'Programme\tCohort delivery\tfrom £12,000',
      'Hackathon\tLead partner\t£30,000',
      'Hackathon\tSupporting partner\t£10,000',
    ].join('\n')), 'working', 'PLACEHOLDER COSTS, and research scope varies enormously — treat these as the shape of the offer, not the number. Set your own before this goes to a partner and change the title when you do.\n\nThe detail is for saying, not showing — an insight brief is desk research plus a community survey with a launch webinar; a full study adds primary fieldwork, academic collaboration, a launch event and media outreach at around forty pages; the multi-year programme runs two to three years with annual outputs. Lead hackathon partners co-define the challenge and take a named, full participating role; supporting partners get presence, mentor places and prize sponsorship.\n\nAlso available and not on the slide: in-kind hackathon support — venue, technical mentors, compute credits, clinical expertise — valued case by case. And learner bursaries at £500 a head, which needs your actual per-learner cost.'),
    put(cardsSlide(on('working'), 'Institute Partner · the annual route', [
      ['Associate · £25,000', '12 months. One insight brief, supporting hackathon role, observer status, five volunteering places.'],
      ['Core · £60,000', '24 months. One full study, lead on a hackathon each year, one course, advisory board observer, fifteen places.'],
      ['Founding · £120,000+', '36 months. Two or more studies, lead plus challenge-setting, two courses and a bursary fund, full board seat, unlimited places.'],
    ]), 'working', 'For organisations wanting a sustained relationship across all three strands rather than one commission. Every figure is a placeholder. All three include being named on Institute outputs, early access to findings, and an annual impact report written for your own reporting.'),
    put(pointsSlide(on('quiet'), 'What partnership does not buy', [
      ['Editorial control', 'over findings.'],
      ['Exclusive access', 'or embargoed access to data beyond the agreed pre-publication window.'],
      ['Endorsement', 'of your products or services by the Institute.'],
      ['Participant data', 'for commercial purposes.'],
      ['Association', 'with our community without a genuine contribution to it.'],
    ]), 'quiet', 'Stated plainly so there are no difficult conversations later. It reads as confidence rather than as restriction when it comes straight after the independence slide, which is why it sits here and not at the end.\n\nAnd the one that costs nothing: universities, NHS trusts, patient organisations and charities are not charged to collaborate. Those relationships run on shared contribution — access, expertise, data, ethics approval, co-authorship, venue.'),
    put(journeySlide(on('working'), 'How it works', 'Six steps, and ethics before fieldwork', [
      ['Scoping conversation', 'What you need to achieve, what we are already working on, and whether there is a genuine overlap. We will say so if there is not.'],
      ['Written proposal', 'Scope, method, timeline, cost, outputs — and the independence terms restated in full.'],
      ['Agreement and ethics', 'Contract signed. Where research involves human participants, ethics approval is secured through our academic partner before any fieldwork begins.'],
      ['Delivery', 'With agreed checkpoints. You will know if timelines move, and why.'],
      ['Publication and launch', 'Joint launch event, media outreach, output published openly.'],
      ['Impact reporting', 'In a format that goes straight into your CSR, ESG or social value reporting.'],
    ]), 'working', 'Step three is the one that separates this from a marketing engagement. Do not rush past it.'),
    put(pointsSlide(on('quiet'), 'Where this comes from', [
      ['UKBT Institute', 'ukblacktech.com/ukbt-institute'],
      ['UK Black Tech', 'ukblacktech.com'],
    ]), 'quiet', 'Add the booking link for a scoping conversation, and your contact details — name, role, email, phone, LinkedIn. The pack leaves all of them to confirm and so does this deck.'),
  ];
  return framed({ id: uid(), title: 'UKBT Institute — partnership pack', width: 1920, height: 1080, version: 1, theme: 'guide', styleGuide: guide, slides: finish(slides) }, guide.marks[0].src, 'UKBT Institute · Partnership pack');
}
