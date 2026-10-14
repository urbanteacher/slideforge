// The two frameworks' stages as Nodes holds them (the-teaching-model, src/data/frameworks: technical-analysis
// and gcse-cs), on the CPU, as starters for the Framework format. Each stage keeps its own question, task,
// outcome and backbone (U Understand, A Apply, C Compare and analyse, X Challenge, J Judge and transfer).
import type { FrameworkRun } from './framework';

export const TECHNICAL_ANALYSIS: FrameworkRun = {
 "framework": "Technical Analysis",
 "topic": "The CPU: “5.2 GHz, faster than you’ll ever need”",
 "recall": [
  {
   "term": "CPU",
   "meaning": "The component that executes a program’s instructions."
  },
  {
   "term": "Clock speed",
   "meaning": "Cycles per second, in hertz: 5.2 GHz is 5.2 billion cycles each second."
  },
  {
   "term": "Cores",
   "meaning": "Separate processing units: more cores can work on more tasks at once."
  },
  {
   "term": "Cache",
   "meaning": "Small, fast memory close to the processor, for frequently used data."
  },
  {
   "term": "Fetch-decode-execute",
   "meaning": "The cycle the CPU repeats for every instruction."
  },
  {
   "term": "Performance",
   "meaning": "Clock speed, cores and cache together, not clock speed alone."
  }
 ],
 "stages": [
  {
   "name": "Term",
   "ask": "What is it?",
   "task": "The advert says “5.2 GHz”. What is the technical term, and what does it mean?",
   "outcome": "An accurate definition",
   "backbone": "U"
  },
  {
   "name": "Features",
   "ask": "What are its characteristics and parts?",
   "task": "Describe the parts of a CPU that affect how fast it works.",
   "outcome": "Components with their roles",
   "backbone": "U"
  },
  {
   "name": "Process",
   "ask": "How does it work, and why?",
   "task": "Explain how clock speed relates to the fetch-decode-execute cycle.",
   "outcome": "A causal explanation",
   "backbone": "U"
  },
  {
   "name": "Context",
   "ask": "What problem needs solving, for whom, and under what constraints?",
   "task": "Who is this laptop for, and what must it do? Specify the requirements.",
   "outcome": "A requirements list",
   "backbone": "C"
  },
  {
   "name": "Data",
   "ask": "What data is needed? Can we trust it? What is missing, and what could be the bottleneck?",
   "task": "Convert 5.2 GHz into cycles per second. What other data would you need before trusting the claim?",
   "outcome": "A calculation and a data checklist",
   "backbone": "A"
  },
  {
   "name": "Trace",
   "ask": "What happens step by step? What could explain the result?",
   "task": "Trace LOAD 7, ADD 5, SUB 2, OUTPUT. If each instruction takes three cycles, how many cycles does the program use?",
   "outcome": "A trace and an inference",
   "backbone": "A"
  },
  {
   "name": "Design",
   "ask": "What matters, what can be omitted, and how should the solution be structured?",
   "task": "Design a fair test of “faster than you’ll ever need”. What do you keep, and what do you leave out?",
   "outcome": "A test design with the abstraction stated",
   "backbone": "C"
  },
  {
   "name": "Represent",
   "ask": "How can we communicate the structure or logic precisely?",
   "task": "Represent your test as pseudocode.",
   "outcome": "Pseudocode of the test",
   "backbone": "A"
  },
  {
   "name": "Build",
   "ask": "Can we build and run the solution?",
   "task": "Step through a CPU simulator, then implement your timing test in Python.",
   "outcome": "A working program and its output",
   "backbone": "A"
  },
  {
   "name": "Test",
   "ask": "Does it meet the requirements, including difficult cases?",
   "task": "Test your program with normal, boundary and invalid inputs. What broke, and how did you fix it?",
   "outcome": "A test table with fixes",
   "backbone": "X"
  },
  {
   "name": "Pros and cons",
   "ask": "What are the benefits and limitations, and for whom?",
   "task": "Discuss the advantages and disadvantages of a 5.2 GHz clock for this user. Explain how two or more factors together limit its performance, for example waiting for data, heat, and software that cannot use all the cores.",
   "outcome": "Benefits and limitations in context",
   "backbone": "C"
  },
  {
   "name": "Compare",
   "ask": "How does it compare with alternatives against shared criteria?",
   "task": "Compare the Velox 14 with a 3.8 GHz eight-core laptop on the same export.",
   "outcome": "A comparison on shared criteria",
   "backbone": "C"
  },
  {
   "name": "Impacts",
   "ask": "Who is affected? What assumptions, responsibilities and risks arise?",
   "task": "Who could be misled by the advert, and what is the risk?",
   "outcome": "Impacts with an assumption named",
   "backbone": "X"
  },
  {
   "name": "Judge",
   "ask": "Which solution is most suitable, and what supports that conclusion?",
   "task": "Is “faster than you’ll ever need” justified for this user? Make a recommendation.",
   "outcome": "A recommendation with its evidence",
   "backbone": "J"
  },
  {
   "name": "Transfer",
   "ask": "Can the principle or solution work in another situation?",
   "task": "Apply the same test to a phone advert claiming “the fastest chip ever”.",
   "outcome": "The method adapted to a new case",
   "backbone": "J"
  },
  {
   "name": "Review",
   "ask": "How well did the student perform, and what should improve next?",
   "task": "Review your analysis against the criteria: secure, developing or emerging?",
   "outcome": "Self-review with a next step",
   "backbone": "J"
  }
 ]
};

export const GCSE_CS: FrameworkRun = {
 "framework": "Computer Science (GCSE)",
 "topic": "The CPU",
 "recall": [
  {
   "term": "CPU",
   "meaning": "The component that executes a program’s instructions."
  },
  {
   "term": "Clock speed",
   "meaning": "Cycles per second, in hertz: 5.2 GHz is 5.2 billion cycles each second."
  },
  {
   "term": "Cores",
   "meaning": "Separate processing units: more cores can work on more tasks at once."
  },
  {
   "term": "Cache",
   "meaning": "Small, fast memory close to the processor, for frequently used data."
  },
  {
   "term": "Fetch-decode-execute",
   "meaning": "The cycle the CPU repeats for every instruction."
  },
  {
   "term": "Performance",
   "meaning": "Clock speed, cores and cache together, not clock speed alone."
  }
 ],
 "stages": [
  {
   "name": "Define",
   "ask": "What is it?",
   "task": "Define the CPU and explain it in your own words.",
   "outcome": "Definition plus own-words explanation",
   "backbone": "U"
  },
  {
   "name": "Describe",
   "ask": "What are its characteristics?",
   "task": "Describe the main components of the CPU.",
   "outcome": "A list of components, each with its specific role",
   "backbone": "U"
  },
  {
   "name": "Calculate",
   "ask": "What can be worked out?",
   "task": "Calculate the time for one clock cycle at 3.2 GHz, in nanoseconds.",
   "outcome": "Working, final answer and unit",
   "backbone": "A"
  },
  {
   "name": "Draw",
   "ask": "How can we show our understanding?",
   "task": "Write your design as pseudocode.",
   "outcome": "Pseudocode in the required notation",
   "backbone": "A"
  },
  {
   "name": "Complete",
   "ask": "What happens when it runs?",
   "task": "Trace this program: LOAD 7, ADD 5, SUB 2, OUTPUT.",
   "outcome": "Completed trace table and output",
   "backbone": "A"
  },
  {
   "name": "Discuss",
   "ask": "What are the benefits and limitations?",
   "task": "Discuss the advantages and disadvantages of a higher clock speed for the media department.",
   "outcome": "Benefits and drawbacks, in context",
   "backbone": "C"
  },
  {
   "name": "Explain",
   "ask": "How and why does it work?",
   "task": "Explain the fetch stage, and why the PC is advanced.",
   "outcome": "Stages linked to their reasons",
   "backbone": "U"
  },
  {
   "name": "Suggest",
   "ask": "Where and why is it used?",
   "task": "A school media department edits video. What do its users need from a CPU, and under what constraints?",
   "outcome": "Users, needs and constraints identified",
   "backbone": "A"
  },
  {
   "name": "Compare",
   "ask": "How does it compare with alternatives?",
   "task": "Compare a 4 GHz dual-core with a 3 GHz quad-core.",
   "outcome": "Comparison against shared criteria",
   "backbone": "C"
  },
  {
   "name": "Evaluate",
   "ask": "Who is affected?",
   "task": "Who is affected when CPUs are marketed on GHz alone?",
   "outcome": "Impacts, with an assumption and a missing perspective named",
   "backbone": "X"
  },
  {
   "name": "Justify",
   "ask": "Which option is most suitable, and why?",
   "task": "Which laptop should the department buy? Justify your answer.",
   "outcome": "Justified recommendation against the requirements",
   "backbone": "J"
  },
  {
   "name": "Design",
   "ask": "How could we construct a solution?",
   "task": "Plan a simulator of the CPU. What will you keep, and what will you leave out?",
   "outcome": "Decomposition, abstraction and an outline design",
   "backbone": "C"
  },
  {
   "name": "Refine",
   "ask": "Does the solution work?",
   "task": "Test your simulator, then fix any failure.",
   "outcome": "A test table with expected and actual results, and any fault found, fixed and retested",
   "backbone": "X"
  }
 ]
};

// A model answer for each stage, on the same CPU case: what a secure answer looks like, shown on the stage's last click
// (written for SlideForge; Nodes holds the tasks and outcomes, not answers).
const withModels = (run: FrameworkRun, models: string[]) => { run.stages.forEach((s, i) => { if (models[i]) s.model = models[i]; }); };

withModels(TECHNICAL_ANALYSIS, [
  'Clock speed: how many cycles the CPU’s clock completes each second. 5.2 GHz is 5.2 billion cycles per second.',
  'The clock sets the pace of cycles. Each core runs instructions, so more cores can run more at once. Cache is fast memory beside the CPU, so it waits less for data.',
  'Each fetch-decode-execute cycle takes clock cycles, so a faster clock completes more cycles per second, which means more instructions per second, as long as the CPU is not waiting for data.',
  'A student editing video: needs fast exports, a full day’s battery and a quiet fan, for under £800.',
  '5.2 GHz = 5,200,000,000 cycles per second. Before trusting the claim: the number of cores, the cache size, whether 5.2 GHz lasts or is a short boost, and timings on real tasks.',
  'LOAD 7 → 7; ADD 5 → 12; SUB 2 → 10; OUTPUT 10. Four instructions × 3 cycles = 12 cycles.',
  'Time the same export on each laptop, three runs, the same file and settings. Keep: the task, the time, the conditions. Leave out: colour, screen and price.',
  'start ← time()\nrun the export\nelapsed ← time() − start\nrepeat 3 times, then OUTPUT the mean',
  'A Python program that wraps the export in time.perf_counter(), runs it three times and prints each time and the mean: 41.2 s.',
  'Normal: a one-minute clip gives a time. Boundary: an empty file gives 0 s. Invalid: a missing file crashed it, so I added a check and a message, and retested.',
  'For: quick single-core tasks such as opening apps. Against: an export waits for data from memory, the chip slows when hot, and software using one core leaves the rest idle, so 5.2 GHz alone will not make it fast.',
  'On the same export, the eight-core at 3.8 GHz shares the work across more cores, so it can finish sooner; the 5.2 GHz chip is only faster per core. Criteria: export time, heat, battery.',
  'Buyers who judge on GHz alone could overspend or buy the wrong laptop. The advert assumes clock speed is performance.',
  'Not justified for a video editor: core count and the measured export time matter more than GHz. I recommend the laptop with the shorter export time.',
  'The same test on phones: time one real task on each, with the same settings, and check cores, heat and battery, not the headline claim.',
  'Developing: my definition and calculation are secure, and my comparison used shared criteria, but without measured data. Next: run the timing test on both laptops.',
]);

withModels(GCSE_CS, [
  'The CPU is the component that fetches, decodes and executes a program’s instructions. In my words: it is the part that runs the program, one instruction after another.',
  'Control unit: decodes instructions and sends control signals. ALU: arithmetic and logic. Registers: tiny fast stores (the PC holds the next instruction’s address). Cache: fast memory for frequently used data. Clock: sets the pace.',
  'Time = 1 ÷ frequency = 1 ÷ (3.2 × 10⁹) = 3.125 × 10⁻¹⁰ s = 0.3125 ns.',
  'total ← 7\ntotal ← total + 5\ntotal ← total − 2\nOUTPUT total',
  'LOAD 7: ACC = 7. ADD 5: ACC = 12. SUB 2: ACC = 10. OUTPUT: 10.',
  'A higher clock speed means more instructions per second, so shorter renders. But it uses more power and makes more heat, the CPU may slow when hot, and gains are small if the software uses few cores or waits for memory.',
  'The address in the PC is copied to the MAR and the instruction is fetched from memory into the MDR, then the CIR. The PC is advanced so that it points at the next instruction for the next cycle.',
  'Editors need fast rendering and smooth playback, so many cores and enough RAM. Constraints: the budget, noise in a classroom, and software licensed for these machines.',
  'The 3 GHz quad-core can run four threads at once; the 4 GHz dual-core is faster per core. For rendering, which uses many cores, the quad-core is likely faster; for single-threaded tasks, the dual-core.',
  'Buyers, and schools on tight budgets, may pay for GHz that does not speed up their work. Assumption: GHz means speed. Missing perspective: the technician who maintains them.',
  'The quad-core: rendering uses many cores, so it exports faster and stays within budget. Single-threaded tasks may be a little slower, but they are not the department’s main need.',
  'Keep: the fetch-decode-execute cycle, the PC, the accumulator and memory. Leave out: cache, pipelining and timing. Outline: a loop that fetches from a list, decodes the opcode and executes it.',
  'LOAD 7, ADD 5: expected 12, actual 12. LOAD 7, SUB 9 (below zero): expected −2, actual a crash. Fixed to allow negatives; retested, passes.',
]);
