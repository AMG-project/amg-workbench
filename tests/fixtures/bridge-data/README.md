A dataset that is not anybody's data.

`firm-survey.csv` is 420 rows generated from a known model: `employee_welfare = 2 + 1.35 ×
stated_purpose + 0.08 × firm_size + 0.02 × sector_code + ε`, with ε normal and a standard
deviation of 0.28, seeded at 20261025. The coefficient the bridge should recover is therefore
**+1.35**, and `tests/bridge.mjs` asserts that both runtimes recover it with an interval that
excludes zero.

It is here so the bridge can be tested end to end without anybody's real data in the
repository, and so a reader can see what the two routes do before pointing them at their own
file. The column names are plausible and the numbers are not real. Nothing in this file is
evidence about purpose, or about anything else.
