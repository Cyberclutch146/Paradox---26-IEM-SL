# Risk-Scoring Agent: a plain-language briefing

*For someone joining to help improve it. No machine-learning background needed for sections 1 to 4; section 7 is where your help matters most.*

## 1. What this is, and where it fits

We are building an early-warning platform for landslides in North East India (SIH 2026, problem SIH26001, Ministry of Development of North Eastern Region). It is made of four cooperating "agents":

1. **Risk-Scoring Agent (this document):** looks at rainfall, soil wetness, season and terrain, and says how risky each small patch of land is today.
2. **Community & Reporting Agent:** a village chat where people report cracks or slope movement, and other people confirm them.
3. **Satellite/GIS Agent:** produces terrain and land-cover layers and the map.
4. **Alert & Routing Agent:** writes multilingual alerts for officials and villagers.

The platform's main idea is **trust**: we never show a bare number. Every risk score must come with a range showing how unsure we are, and a one-line reason.

## 2. What the agent does, in one sentence

For any patch of land (a 1 km by 1 km square, called a "zone") on any day, it answers: **"How much more dangerous than usual is this zone today, how sure are we, and why?"**

## 3. What we built and how

**The data.** One table with about 16,900 rows. Each row is one zone on one day, with a yes/no label: did a landslide happen? There are only **57 landslides** in it (roughly 1 in 296 rows), across 2022 to 2025 and the seven North East states. The other rows are "ordinary" zone-days that we sampled on purpose: some from the same places on other days, some from other places on the same days, and many random ones, all kept at least 25 km and 3 days away from any landslide.

**What the model looks at (10 clues per row).**

- Rain: today, the last 3 days, the 7 days before, the 30 days before
- Soil wetness (top 7 cm) and how much it changed over 3 days
- Time of year (so it knows monsoon from winter)
- Terrain: average slope and the height difference across the zone

**The model.** We used XGBoost, a standard method that builds many small decision trees, each one correcting the mistakes of the ones before. We kept the trees small (two questions deep) on purpose, because we have very few landslides and a big model would just memorize them.

**How we tested it honestly.** We used "leave one year out": train on three years, test on the fourth, and repeat for each year. We also kept 2025 as a final exam. This tests whether it works on a year it has never seen.

**Extra layers that make the output trustworthy.**

- **Calibration (Platt scaling):** adjusts the raw model output so it behaves like a smooth risk scale.
- **A range:** we trained 30 slightly different copies of the model. If they all agree, the range is narrow. If they disagree, it's wide. The range is the spread of their answers (10th to 90th percentile).
- **A reason:** a technique called SHAP finds which clue pushed the score up most, and we turn it into one line such as "heavy rain in the last 3 days".
- **Tiers:** Danger, Warning, Watch and Low, set from how many past landslides each level would have flagged.

## 4. What it returns

For each zone-day it returns:

- **Risk score:** a small number (about 0.003 to 0.013 in our data). Higher means riskier compared with an ordinary day.
- **Range:** a low and a high value around the score.
- **Tier:** Danger, Warning, Watch or Low.
- **Confident flag:** true if the low end of the range is still in the same tier.
- **Driver:** the one-line reason.

An illustrative example (the exact field names are in `risk_agent.py`): *"Zone 27_54, Danger tier, risk 0.014 (range 0.007 to 0.026), not fully confident, driven mostly by 3-day rainfall."*

It ships as a folder of 32 small `.json` model files plus a `risk_agent.py` wrapper. Your code calls `RiskAgent(folder).score(rows)` and gets the above back.

## 5. How well does it work? (honest version)

**Good news**

- It **ranks days well.** If you pick one landslide day and one ordinary day at random, the model gives the landslide day the higher risk about **80% to 93% of the time** depending on the test year (**about 89% on the untouched 2025 test**). This measure is called ROC-AUC.
- It is **about 11 times better than random guessing** at surfacing landslides near the top of the list (PR-AUC 0.039 versus 0.0034 for random).
- Its error measure (log loss) is about **18% better than just always guessing the average rate**, in all four test years.
- Training was stable. Loss curves show it stops improving on new data after about **130 rounds of learning**, and we trained for 300. Extra rounds only help it memorize the training landslides (its training score keeps climbing to 0.3 to 0.4 while its score on unseen years stays around 0.03 to 0.05).

**Modest or weak**

- **Most alerts would be false alarms.** In the 2025 test, "Warning or above" caught 12 of the 20 landslides but raised 628 alerts, so about 2 in every 100 alerts were real. In real life it would be lower still, because our table has far more landslide days than reality.
- **The score is not a real probability.** Because we chose the ordinary days ourselves, "0.014" does not mean "1.4% chance today". Use it for ranking and tiers, not as a percentage.
- **The calibration barely beats a coin-flip baseline** on the Brier score (0.00334 versus 0.00337), which is normal for very rare events but means the fine-grained numbers shouldn't be over-trusted.
- **The Warning and Watch tiers are almost the same threshold**, so they behave alike and each flags roughly one day in five.
- **Only 57 landslides** means every number here is uncertain. The 2023 test year had just 5 landslides, so its results are noise.

## 6. Current state

**Done**

- Data table, model, calibration, range models, driver line, tiers, export bundle and wrapper module
- Year-by-year testing and a 2025 final exam
- Loss curves and a check that terrain inputs can be rebuilt from raw satellite elevation data: the Copernicus 30 m elevation model reproduces our training terrain values almost exactly (elevation error under 0.01 m, slope error about 0.2 degrees)

**Known and pending**

- Retrain with about 130 rounds instead of 300, regenerate the bundle, and re-check the numbers
- Fix a stale comment in the notebook (it mentions a rate of 1 in 398; the data is 1 in 296)
- No simple-rule comparison yet (see section 7)
- No live feature builder: the model can score rows already in the table, but nothing yet turns a live rain feed into those 10 clues
- Tiers need redefining (see section 7)
- **Not yet written down:** which parts of the data are real measurements and which are synthetic or simulated. Our project rules require this to be stated clearly.

## 7. Where a helper could add the most value

In rough order of value for effort:

1. **A simple baseline.** Build the classic "alert if rain over N days exceeds X mm" rule, which is how landslide thresholds are often set, and compare it with our model on the same years. A judge will ask "is the AI better than a rainfall rule?" and we need to know the answer.
2. **Tiers by alert budget.** Instead of tiers chosen to catch 50/75/90% of past landslides, define them by how many alerts we're willing to send, for example Danger for the top 2% of zone-days, Warning for 5%, Watch for 10%, and report how many landslides each level catches. This is a small edit to `config.json`, with no retraining.
3. **Test on new places, not just new years.** Our tests move across time but never hold out a whole region. Because terrain values are constant per zone, the model may partly recognize places. Try leaving out a whole state or district.
4. **Real-world probabilities.** Work out the true base rate of landslides per zone-day, and correct the scores for the fact that we sampled ordinary days. That would turn "ranking scores" into honest percentages.
5. **Better rainfall.** Rain and soil moisture currently come from just **7 state capitals**, shared with zones up to about 100 km away. A gridded rainfall product (for example satellite rainfall) could sharpen this a lot.
6. **More clues and more events.** Ideas: land-cover change, soil or rock type, distance to roads and streams. Also look for more landslide records (for example the NASA Global Landslide Catalog) to get past 57 events.
7. **A better "how sure are we" measure.** Our range shows model disagreement, not a guaranteed statistical interval. Methods such as conformal prediction give ranges with a proper guarantee.
8. **Reliability check.** Plot predicted risk against observed landslide frequency, in bins, to show whether the calibration means something.

## 8. Things to know before you touch anything

- **Coverage:** the seven North East states only. Sikkim is not in the training data, so don't score it.
- **Weather is coarse** (7 capital cities) and three landslides happened on days recorded as 0 mm of rain, so the labels or dates may be imperfect.
- **The model files are machine-generated.** Edit `config.json` if you need to change tiers, but don't hand-edit the model files. Keep all 32 model files together. Use the same xgboost version (3.2.0 or newer) to load them.
- **Please don't present it as "predicts landslides" or "gives the probability of a landslide".** The accurate claim is: *it ranks zone-days by relative landslide risk, about 89% pairwise accuracy on held-out 2025, with a range and a reason for each score.*

**Files to ask for:** `agent1_risk_scoring.ipynb` (the whole notebook), `agent1_bundle.zip` (models plus wrapper), `ne_landslide_training_new.csv` (the data), `zones_reference.csv` (terrain per zone).