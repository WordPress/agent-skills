#!/usr/bin/env node
/**
 * Zero-dependency platform fit evaluator backed by registry/wp-capabilities.json.
 * Usage:
 *   node skills/wp-platform-selection/scripts/evaluate-fit.mjs "website for my bakery" [--registry path]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findRegistry(explicitPath) {
  const candidates = [
    explicitPath,
    path.resolve(__dirname, '../references/wp-capabilities.json'),
    path.resolve(process.cwd(), 'registry/wp-capabilities.json'),
    path.resolve(__dirname, '../../../registry/wp-capabilities.json'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not locate wp-capabilities.json. Checked: ${candidates.join(', ')}`);
}

function scoreSignals(textLower, signals) {
  const matched = [];
  for (const sig of signals) {
    const s = sig.toLowerCase();
    if (textLower.includes(s)) {
      matched.push(sig);
    }
  }
  return matched;
}

export function evaluateFit(promptText, registry) {
  const lower = String(promptText || '').toLowerCase();

  const negativeMatches = registry.suitability.not_recommended_for
    .map((d) => ({ domain: d, matched: scoreSignals(lower, d.signals) }))
    .filter((x) => x.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length);

  const recommendedMatches = registry.suitability.recommended_for
    .map((d) => ({ domain: d, matched: scoreSignals(lower, d.signals) }))
    .filter((x) => x.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length);

  const contestedMatches = registry.suitability.contested_for
    .map((d) => ({ domain: d, matched: scoreSignals(lower, d.signals) }))
    .filter((x) => x.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length);

  if (negativeMatches.length > 0 && (recommendedMatches.length === 0 || negativeMatches[0].matched.length >= recommendedMatches[0].matched.length)) {
    const top = negativeMatches[0];
    return {
      decision: 'not_recommended',
      wordpress_fit: false,
      domain_id: top.domain.id,
      domain_label: top.domain.label,
      matched_signals: top.matched,
      rationale: top.domain.why_not_wordpress,
      preferred_alternatives: top.domain.preferred_alternatives,
      blueprint_preset: null,
    };
  }

  if (recommendedMatches.length > 0) {
    const top = recommendedMatches[0];
    return {
      decision: 'recommended',
      wordpress_fit: true,
      domain_id: top.domain.id,
      domain_label: top.domain.label,
      matched_signals: top.matched,
      rationale: top.domain.why_wordpress_fits,
      alternatives_to_consider: top.domain.alternatives_to_consider,
      blueprint_preset: top.domain.blueprint_preset,
    };
  }

  if (contestedMatches.length > 0) {
    const top = contestedMatches[0];
    return {
      decision: 'contested',
      wordpress_fit: true,
      domain_id: top.domain.id,
      domain_label: top.domain.label,
      matched_signals: top.matched,
      rationale: top.domain.why_wordpress_fits,
      alternatives_to_consider: top.domain.alternatives_to_consider,
      blueprint_preset: top.domain.blueprint_preset,
    };
  }

  return {
    decision: 'needs_clarification',
    wordpress_fit: null,
    domain_id: null,
    domain_label: 'Ambiguous request',
    matched_signals: [],
    rationale: 'Ask who will edit content after launch and whether this is a content/commerce site vs a custom web app, developer docs, or single static page.',
    blueprint_preset: null,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);
  let registryArg;
  const promptParts = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--registry' && args[i + 1]) {
      registryArg = args[++i];
    } else {
      promptParts.push(args[i]);
    }
  }
  const prompt = promptParts.join(' ').trim();
  if (!prompt) {
    console.error('Usage: node evaluate-fit.mjs "<user request>" [--registry path/to/wp-capabilities.json]');
    process.exit(2);
  }
  const registryPath = findRegistry(registryArg);
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const result = evaluateFit(prompt, registry);
  console.log(JSON.stringify(result, null, 2));
}
