# Drystone — explanation run sheet

You are being asked to explain patterns in a formal model. **This is a blind run.**

## Rules

1. **Do not read any source code, search the repository, or look anything up.**
   Everything you need is in the prompts below. If you go looking for the model's
   implementation, the run is void — the whole point is that your explanations
   come from the mechanism descriptions and the observed pattern, not from
   reading the answer.
2. Answer each prompt **independently**. Do not let one answer shape the next.
3. Reply to each with **JSON only**, in the shape the prompt specifies.
4. Do not tell us which explanation you think is right. Ablation decides that,
   and a confident preference in the record is noise.

## Output

Save your answers as a single JSON file, `responses.json`, shaped:

```json
{
  "responses": {"1": "<your JSON for prompt 1>", "2": "…"},
  "recognised": "…"
}
```

Each value is the JSON **as a string**, exactly as you produced it.

`recognised` is a separate, honest question, and it matters more than it looks:
**do you recognise any of these models from the published literature?** If so,
name the paper. We need to know whether an explanation was inferred from the
pattern or recalled from something you have read — a benchmark that recovers a
published result is only evidence if the answer was not already known to you.
Say "no" if you do not recognise it. There is no wrong answer.

---

## Prompt 1 of 3
```
A formal model named "purpose" has been swept over its parameter space.
Its behaviour is produced entirely by the mechanisms below, each of which can be
switched off independently.

MECHANISMS
- purpose_vulnerability_reduction: Purpose integration reduces stakeholders' exposure to opportunism, lowering the risk premium they demand. Lowers opportunity cost and raises willingness-to-pay.
- commitment_credibility: Purpose backed by governance rather than declared is credible, so stakeholders make firm-specific investments they would otherwise withhold. Below the threshold of credibility, purpose is cheap talk.
- decision_cost: Enfranchising more stakeholders raises the informational and deliberative burden on the central authority, and does so at an increasing rate.
- principal_competence_cost: Joint decision-making generates honest mistakes from lack of expertise, information or talent among the principals.
- principal_conflict_cost: Principals decide in their own interest against the interests of others, which is the opportunism stakeholders anticipate and price in.
- agent_conflict_cost: The classical agency problem: managers pursue their own agenda, and a wider enfranchisement gives them more room to play principals off against each other.
- contractibility: Determines what fraction of what stakeholders are owed can be specified ex ante, and therefore held as control rather than residual rights.
- ai_contractibility_shift: AI intensity raises contractibility: more of what is conceded can be written down and verified ex ante, so the control channel widens.
- ai_agency_cost_reduction: AI lowers the cost of monitoring agents, reducing agent-side conflict costs.
- principal_cost_incidence: Principal costs are charged against the residual channel only, never the control channel. Residual rights are the ones exercised at discretion, so the cost of a principal deciding badly falls there.
- agency_cost_incidence: Agency costs are charged against both channels, because delegation degrades what is contracted as well as what is left to discretion.

Mechanisms believed to substitute for one another (switching off only one of a group may change nothing, because the others compensate):
- {purpose_vulnerability_reduction, ai_contractibility_shift}

OBSERVED — what moves "A"
- alpha lowers A (rank correlation -0.81; Sobol first-order 0.63, total 0.68)
- principal_competence raises A (rank correlation +0.46; Sobol first-order 0.20, total 0.21)
- principal_conflict raises A (rank correlation +0.27; Sobol first-order 0.08, total 0.12)

Propose 4 DIFFERENT explanations for why this is so. Compete with each other: do
not restate one account in four ways. At least one should be an explanation you
consider unlikely but not impossible. An explanation may cover more than one of
the effects above if the same mechanisms account for them.

Each explanation must name the mechanisms responsible, using their exact names from
the list above and no others, and must predict what happens to the effects it
covers when precisely those mechanisms are switched off:

- "vanishes"  - the effect disappears
- "weakens"   - the effect shrinks substantially but survives
- "reverses"  - the effect changes sign
- "unchanged" - the effect persists; these mechanisms are not responsible

Reply with JSON only, matching this shape exactly:

{
  "explanations": [
    {
      "claim":       "one sentence, in the vocabulary of the theory, saying why this occurs",
      "explains":    ["which of the observed effects this covers, by PARAMETER name"],
      "mechanisms":  ["names of the mechanisms responsible, drawn ONLY from the list above"],
      "prediction":  "vanishes | weakens | reverses | unchanged",
      "rationale":   "why switching those mechanisms off should have that consequence"
    }
  ]
}
```

## Prompt 2 of 3
```
A formal model named "purpose" has been swept over its parameter space.
Its behaviour is produced entirely by the mechanisms below, each of which can be
switched off independently.

MECHANISMS
- purpose_vulnerability_reduction: Purpose integration reduces stakeholders' exposure to opportunism, lowering the risk premium they demand. Lowers opportunity cost and raises willingness-to-pay.
- commitment_credibility: Purpose backed by governance rather than declared is credible, so stakeholders make firm-specific investments they would otherwise withhold. Below the threshold of credibility, purpose is cheap talk.
- decision_cost: Enfranchising more stakeholders raises the informational and deliberative burden on the central authority, and does so at an increasing rate.
- principal_competence_cost: Joint decision-making generates honest mistakes from lack of expertise, information or talent among the principals.
- principal_conflict_cost: Principals decide in their own interest against the interests of others, which is the opportunism stakeholders anticipate and price in.
- agent_conflict_cost: The classical agency problem: managers pursue their own agenda, and a wider enfranchisement gives them more room to play principals off against each other.
- contractibility: Determines what fraction of what stakeholders are owed can be specified ex ante, and therefore held as control rather than residual rights.
- ai_contractibility_shift: AI intensity raises contractibility: more of what is conceded can be written down and verified ex ante, so the control channel widens.
- ai_agency_cost_reduction: AI lowers the cost of monitoring agents, reducing agent-side conflict costs.
- principal_cost_incidence: Principal costs are charged against the residual channel only, never the control channel. Residual rights are the ones exercised at discretion, so the cost of a principal deciding badly falls there.
- agency_cost_incidence: Agency costs are charged against both channels, because delegation degrades what is contracted as well as what is left to discretion.

Mechanisms believed to substitute for one another (switching off only one of a group may change nothing, because the others compensate):
- {purpose_vulnerability_reduction, ai_contractibility_shift}

OBSERVED — what moves "B"
- principal_conflict raises B (rank correlation +0.74; Sobol first-order 0.51, total 0.65)
- alpha raises B (rank correlation +0.28; Sobol first-order 0.11, total 0.25)
- agent_conflict lowers B (rank correlation -0.48; Sobol first-order 0.20, total 0.21)

Propose 4 DIFFERENT explanations for why this is so. Compete with each other: do
not restate one account in four ways. At least one should be an explanation you
consider unlikely but not impossible. An explanation may cover more than one of
the effects above if the same mechanisms account for them.

Each explanation must name the mechanisms responsible, using their exact names from
the list above and no others, and must predict what happens to the effects it
covers when precisely those mechanisms are switched off:

- "vanishes"  - the effect disappears
- "weakens"   - the effect shrinks substantially but survives
- "reverses"  - the effect changes sign
- "unchanged" - the effect persists; these mechanisms are not responsible

Reply with JSON only, matching this shape exactly:

{
  "explanations": [
    {
      "claim":       "one sentence, in the vocabulary of the theory, saying why this occurs",
      "explains":    ["which of the observed effects this covers, by PARAMETER name"],
      "mechanisms":  ["names of the mechanisms responsible, drawn ONLY from the list above"],
      "prediction":  "vanishes | weakens | reverses | unchanged",
      "rationale":   "why switching those mechanisms off should have that consequence"
    }
  ]
}
```

## Prompt 3 of 3
```
A formal model named "purpose" has been swept over its parameter space.
Its behaviour is produced entirely by the mechanisms below, each of which can be
switched off independently.

MECHANISMS
- purpose_vulnerability_reduction: Purpose integration reduces stakeholders' exposure to opportunism, lowering the risk premium they demand. Lowers opportunity cost and raises willingness-to-pay.
- commitment_credibility: Purpose backed by governance rather than declared is credible, so stakeholders make firm-specific investments they would otherwise withhold. Below the threshold of credibility, purpose is cheap talk.
- decision_cost: Enfranchising more stakeholders raises the informational and deliberative burden on the central authority, and does so at an increasing rate.
- principal_competence_cost: Joint decision-making generates honest mistakes from lack of expertise, information or talent among the principals.
- principal_conflict_cost: Principals decide in their own interest against the interests of others, which is the opportunism stakeholders anticipate and price in.
- agent_conflict_cost: The classical agency problem: managers pursue their own agenda, and a wider enfranchisement gives them more room to play principals off against each other.
- contractibility: Determines what fraction of what stakeholders are owed can be specified ex ante, and therefore held as control rather than residual rights.
- ai_contractibility_shift: AI intensity raises contractibility: more of what is conceded can be written down and verified ex ante, so the control channel widens.
- ai_agency_cost_reduction: AI lowers the cost of monitoring agents, reducing agent-side conflict costs.
- principal_cost_incidence: Principal costs are charged against the residual channel only, never the control channel. Residual rights are the ones exercised at discretion, so the cost of a principal deciding badly falls there.
- agency_cost_incidence: Agency costs are charged against both channels, because delegation degrades what is contracted as well as what is left to discretion.

Mechanisms believed to substitute for one another (switching off only one of a group may change nothing, because the others compensate):
- {purpose_vulnerability_reduction, ai_contractibility_shift}

OBSERVED — what moves "pi_star"
- principal_competence raises pi_star (rank correlation +0.74; Sobol first-order 0.55, total 0.64)
- agent_conflict lowers pi_star (rank correlation -0.54; Sobol first-order 0.28, total 0.35)
- principal_conflict raises pi_star (rank correlation +0.26; Sobol first-order 0.04, total 0.15)
- alpha no clear direction pi_star (rank correlation -0.05; Sobol first-order 0.03, total 0.06)

Propose 4 DIFFERENT explanations for why this is so. Compete with each other: do
not restate one account in four ways. At least one should be an explanation you
consider unlikely but not impossible. An explanation may cover more than one of
the effects above if the same mechanisms account for them.

Each explanation must name the mechanisms responsible, using their exact names from
the list above and no others, and must predict what happens to the effects it
covers when precisely those mechanisms are switched off:

- "vanishes"  - the effect disappears
- "weakens"   - the effect shrinks substantially but survives
- "reverses"  - the effect changes sign
- "unchanged" - the effect persists; these mechanisms are not responsible

Reply with JSON only, matching this shape exactly:

{
  "explanations": [
    {
      "claim":       "one sentence, in the vocabulary of the theory, saying why this occurs",
      "explains":    ["which of the observed effects this covers, by PARAMETER name"],
      "mechanisms":  ["names of the mechanisms responsible, drawn ONLY from the list above"],
      "prediction":  "vanishes | weakens | reverses | unchanged",
      "rationale":   "why switching those mechanisms off should have that consequence"
    }
  ]
}
```
