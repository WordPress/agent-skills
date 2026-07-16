#!/usr/bin/env bash
# Live smoke test for skills/wp-ai-plugin against real WordPress + the
# canonical AI plugin in WordPress Playground. Requires Node >= 20.18 and
# network access (downloads WP + the ai plugin zip on each run).
set -euo pipefail
cd "$(dirname "$0")"

rm -f mu-plugins/result.json
npx -y @wp-playground/cli@latest run-blueprint \
  --blueprint=./blueprint.json \
  --mount="$PWD/mu-plugins:/wordpress/wp-content/mu-plugins"

node --input-type=module -e '
import fs from "node:fs";
const r = JSON.parse(fs.readFileSync("mu-plugins/result.json", "utf8"));
const failures = [];
if (!r.abstract_feature) failures.push("WordPress\\AI\\Abstracts\\Abstract_Feature class missing");
if (!r.smoke_ability) failures.push("downstream ability smoke/echo not registered (filter -> Loader -> register() chain broke)");
if (r.smoke_exec !== "hi") failures.push(`smoke/echo execute returned ${JSON.stringify(r.smoke_exec)} (expected "hi")`);
for (const k of ["read_content", "read_users", "read_settings", "suggest_reply"]) {
  if (!r[k]) failures.push(`${k} ability missing`);
}
if (failures.length) {
  console.error("SMOKE FAIL:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`SMOKE OK (AI plugin ${r.wpai_version})`);
'
