# Lemonade Tycoon — PC edition (Hexacto, circa 2002)

**Reference scope:** single-player Windows PC version of *Lemonade Tycoon*, identified by a 2009 PC FAQ that attributes the game to Hexacto and says the series began around 2002. It is a secondary gameplay guide, not a publisher specification. Read 2026-10-11: [GameFAQs PC FAQ](https://gamefaqs.gamespot.com/pc/930814-lemonade-tycoon/faqs/57197). This profile does not claim to match a particular executable build, difficulty setting or save file.

## What the source supports

The guide describes a day-planning loop: choose a selling location; set a lemon, sugar and ice recipe; set the cup price; buy stock; respond to weather, forecasts and local news; then review sales and cash. It identifies cups, lemons, sugar and ice as stock, notes that ice melts and lemons spoil, and discusses advertising and location. The guide distinguishes a 30-day Challenge that starts with $280 from Career mode, which starts with $40. The implementation borrows this visible decision loop, not the source's exact simulation.

The source does not establish one canonical set of demand, spoilage, customer satisfaction, price elasticity, upgrade, event or location formulas for every PC build. Those values are therefore not treated as observed reference facts here.

## Local implementation scope

- Ten-day browser season; $40 start; $100 end-cash target. These are local challenge settings, not a claim about the PC edition's career length or win threshold.
- Each planning day shows temperature/rain and local news. The player picks one of three locations, adjusts lemon/sugar/ice quantities, sets price and advertising, buys stock, then opens the stand once.
- The day report exposes demand, cups served, revenue, fixed rent/ad spend, satisfaction and closing cash. Ice is discarded and remaining lemons spoil at a locally chosen rate.
- Local original canvas illustration, DOM controls, procedural effect hooks, keyboard/pointer-accessible buttons, restart after season end, and best-cash persistence. No live weather, employee/stand upgrades, multiple save slots, supply vendors, 30-day mode, rival or customer-by-customer queue are implemented.
- Model values and the 10-day objective are original tuning. They have not been calibrated against the PC game's source code or a verified PC playthrough.

## Input and art/assets

All decisions use labeled buttons sized for touch; browser click/tap uses the same action. The small stand scene and customers are drawn with local Canvas primitives. No PC game art, music, screenshots, map or code was copied. Audio calls use the repository's existing muted-by-default synthesized effects.

## Verification boundary

See [`../qa/lemonade-dr-mario-batch-20261011/report.md`](../qa/lemonade-dr-mario-batch-20261011/report.md) for model and browser evidence, viewports, screenshots and remaining checks. A seeded 10-day model win is not evidence that a human player or the original PC version would use the same strategy.
