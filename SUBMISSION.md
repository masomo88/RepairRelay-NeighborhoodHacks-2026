# Devpost submission draft — Repair Relay

Status: draft only. No registration or submission has been made.

## One-line pitch

Repair Relay helps neighbourhood organisers turn repair requests and volunteer skills into a safe, workable schedule.

## Inspiration and problem

Repair days are hard to coordinate: an organiser needs to know what is coming, who can help, how long fixes may take, and what needs safety review. ISTAT reports repair or preparation-for-reuse centres in only 19.6% of Italian provincial-capital municipalities in 2024 (https://www.istat.it/comunicato-stampa/ambiente-urbano-anno-2024/). This provides broader context, not evidence of a local pilot.

## Specific local evidence required before submission

The official kickoff prompt asks for a problem personally seen in the entrant's community (https://neighborhood-hacks-2026.devpost.com/updates/47044-neighborhood-hacks-starts-now). The entrant has agreed to test the app and provide a real observation plus one requested improvement. That evidence has not arrived yet. Add only verified first-hand details here before submitting; the ISTAT statistic above cannot substitute for this requirement.

## What it does

Organisers create a repair day, add requests and volunteer skills, and receive a time-based schedule. Unmatched requests appear on a waitlist. Safety-flagged cases are held for qualified review. Organisers can record outcomes, print a plan, or export/import JSON. A labelled fictional example makes the flow easy to inspect.

## How it was built

Vanilla HTML, CSS, and JavaScript with an ES module matching engine. Optional Node HTTP endpoint at POST /api/schedule. The browser app works on static hosting, uses localStorage, and has no paid API. OpenAI Codex assisted with coding, testing, interface design, and writing during the event window. The matching itself is a deterministic heuristic.

## What makes it useful

The interface separates planned matches, safety holds, waitlisted requests, and self-reported completed repairs. Fictional entries cannot inflate the outcome metrics. It can be used from one laptop and a printed schedule without any account.

## Challenges and learning

Capacity and safety constraints need to be visible. The tool displays waitlisted and held requests instead of silently dropping them. It avoids calling an item's weight waste saved because the app cannot prove that.

## Next steps

Pilot with a real neighbourhood group, improve skill and station modelling, and consider consent-aware multi-device collaboration. These are future plans, not shipped features.

## Before submission

- Review the existing 2:21 screen capture and add a truthful spoken explanation if the organisers require one.
- Live demo: https://masomo88.github.io/RepairRelay-NeighborhoodHacks-2026/
- Public source: https://github.com/masomo88/RepairRelay-NeighborhoodHacks-2026
- Demo video for Devpost: https://youtu.be/kOVYe9LRZQk (unlisted, 2:22 on YouTube)
- Submission screenshots: `assets/preview.png`, `assets/planning-board.png`, `assets/safety-review.png` (all fictional or empty UI).
- Add the entrant's first-hand local observation and incorporate their requested app improvement.
- Have the entrant review the AI disclosure and final application.

AI authorship note: Codex generated substantial code and text. The entrant must review, understand, and make their own meaningful contribution before claiming the work meets the FAQ expectation that it is primarily theirs. Do not claim interviews, pilot use, or personal observations that have not occurred.


A 2:21 captioned screen recording exists at https://masomo88.github.io/RepairRelay-NeighborhoodHacks-2026/video.html . Devpost accepts the unlisted YouTube link above in its video field. The GitHub Pages WebM remains a review copy. See https://help.devpost.com/article/85-uploading-a-demo-video .

On 17 October, we [asked the organisers publicly](https://neighborhood-hacks-2026.devpost.com/forum_topics/45580-clarification-on-ai-assistance-and-primarily-your-own-work) whether this workflow satisfies the FAQ's 'primarily your own' requirement. The question discloses Codex's substantial role. There was no reply when this draft was updated; eligibility on that point remains unresolved.
