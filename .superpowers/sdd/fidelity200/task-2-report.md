# Task 2 report — Number and logic pack

Implemented and registered ten playable new games in scripts/fidelity-logic.js: sudoku-9x9, nonogram-picross, fifteen-puzzle, lights-out, mastermind-code, takuzu-binary, futoshiki-inequality, kenken-cages, slitherlink-loop, and hashi-bridges. The pack uses only the provided NP_Fidelity registry and createStage; it has no external runtime dependencies. The models are exported as each registry definition's model and are the same rule operations used by the canvas input and DOM buttons.

## Model API

- Sudoku: createGame(seed), canPlace(state,row,col,value), place(state,row,col,value), isSolved(state).
- Nonogram: createGame(seed), setMode(state,mode), setCell(state,row,col,value), isSolved(state).
- Fifteen: createGame(seed), move(state,tileIndex), isSolved(state).
- Lights Out: createGame(seed), toggle(state,row,col), isSolved(state).
- Mastermind: createGame(secret), choose(state,slot,color), submit(state), isSolved(state).
- Takuzu: createGame(), legal(state,row,col,value), set(state,row,col,value), isSolved(state).
- Futoshiki: createGame(), place(state,row,col,value), isSolved(state).
- KenKen: createGame(), place(state,row,col,value), isSolved(state).
- Slitherlink: createGame(), setEdge(state,edge,value), cycle(state,edge), isSolved(state).
- Hashi: createGame(), neighbors(islandA,islandB), setBridge(state,islandA,islandB,count), connect(state,islandA,islandB), isSolved(state).

Sudoku rejects conflicts while preserving clues, and the known unique puzzle is transformed by valid digit/row/column symmetries for subsequent starts. Nonogram uses clue-derived row/column run validation, with two fixed, solution-checked layouts. Fifteen is scrambled through legal slides and stores the reverse path; Lights Out uses legal toggle scrambles. Mastermind allows repeated colors and counts exact-position matches before duplicate-aware color-only matches, then reveals the secret on the tenth miss. Takuzu enforces balance, no triples, immutable clues, and distinct complete rows and columns. Futoshiki checks a 5×5 Latin square and visible strict inequalities. KenKen checks a 4×4 Latin square and arithmetic cages with addition, multiplication, difference, and exact division. Slitherlink checks clue counts and one connected, nonbranching degree-two cycle; a second disjoint loop is rejected. Hashi uses nearest islands only, allows at most two parallel bridges, checks target degrees, and requires a single connected network.

## Verification

Focused RED/GREEN command: node --test tests/fidelity-logic.test.cjs. The first run exposed two defects (incorrect Slitherlink clue derivation and Fifteen board rendering); after correction the final focused run passed 13/13 tests. The tests cover rule violations, immutable clues, legal completion, unique Sudoku solutions for both Sudoku layouts, both Nonogram presets, puzzle scrambles, duplicate-safe Mastermind feedback and terminal handling, disconnected Slitherlink/Hashi false wins, direct launch for all ten IDs, animation pause/resume/cleanup, and functional number/mode/color/submit buttons.

Full suite: node --test tests/*.test.cjs passed 148/148 tests after the final code and test refinements.

## Primary rule references inspected

- Sudoku, Nikoli: https://www.nikoli.co.jp/en/puzzles/sudoku/
- Nonogram / Pattern, Simon Tatham: https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/pattern.html
- Fifteen, Simon Tatham: https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/fifteen.html
- Lights Out / Flip, Simon Tatham: https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/flip.html
- Mastermind, Hasbro product page and linked two-page instructions: https://instructions.hasbro.com/en-in/instruction/mastermind and https://instructions.hasbro.com/api/download/44220_en-in_mastermind.pdf
- Takuzu / Unruly, Simon Tatham: https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/unruly.html
- Futoshiki / Unequal, Simon Tatham: https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/unequal.html
- KenKen, official rules: https://www.kenkenpuzzle.com/learning
- Slitherlink, Nikoli: https://www.nikoli.co.jp/en/puzzles/slitherlink/
- Hashiwokakero, Nikoli: https://www.nikoli.co.jp/en/puzzles/Hashiwokakero/

Simon Tatham's manuals identify the underlying rule sets; the web tool timed out opening the Keen manual page, so the official Keen search result and official KenKen rules page were used for cage operations. The Mastermind PDF was available as a two-page Hasbro download but did not expose searchable text in the web reader; this pack implements the classic four-slot/six-color, ten-guess rules specified in the task brief. Takuzu's no-duplicate completed-line rule is deliberately added on top of Unruly's published balance and no-triples rules, as the brief requires.

## Scope limits and concerns

The puzzles are compact custom canvas renderings with Vietnamese control hints, not reproductions of the referenced publishers' artwork, UI, sound, or campaign content. Sudoku is a verified unique preset plus symmetry-derived variants; Nonogram has two finite verified presets; Fifteen and Lights Out use legal-move/toggle scrambles. The remaining games use one fixed playable preset each, not runtime generation or a difficulty ladder. Hashi is a compact 3×3 island puzzle and Slitherlink a compact 4×4 loop puzzle; these are practice-sized boards rather than campaign content.
