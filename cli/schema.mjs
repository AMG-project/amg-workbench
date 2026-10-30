/* A JSON Schema checker covering the subset artifact/schema uses, and NOTHING
   else: it fails loudly on a keyword it does not know.

   A validator that silently passes what it cannot read reports success for a
   file it never looked at, which is worse than no validator. The subset is
   `type`, `required`, `properties`, `items`, `enum`, `const`, `minimum`,
   `minItems`, `additionalProperties`, `oneOf` and `$ref` into `$defs`.

   One copy: the CLI validates with it and tests/schema.test.mjs imports it.
*/
const KNOWN = new Set(["$schema", "$id", "title", "description", "$defs", "$ref",
  "type", "required", "properties", "items", "enum", "const", "minimum",
  "minItems", "additionalProperties", "oneOf"]);

function check(node, val, schema, path, out) {
  for (const k of Object.keys(node))
    if (!KNOWN.has(k)) out.push(`${path}: schema uses an unsupported keyword "${k}"`);

  if (node.$ref) {
    const m = /^#\/\$defs\/(.+)$/.exec(node.$ref);
    if (!m) { out.push(`${path}: cannot follow $ref ${node.$ref}`); return; }
    return check(schema.$defs[m[1]], val, schema, path, out);
  }
  if (node.oneOf) {
    const hits = node.oneOf.filter(s => { const e = []; check(s, val, schema, path, e); return !e.length; });
    if (hits.length !== 1) out.push(`${path}: matched ${hits.length} of oneOf, wanted exactly 1`);
    return;
  }
  if ("const" in node && val !== node.const)
    out.push(`${path}: ${JSON.stringify(val)} is not ${JSON.stringify(node.const)}`);
  if (node.enum && !node.enum.includes(val))
    out.push(`${path}: ${JSON.stringify(val)} is not one of ${node.enum.join(", ")}`);

  const t = node.type;
  if (t) {
    const is = val === null ? "null" : Array.isArray(val) ? "array"
      : Number.isInteger(val) && t === "integer" ? "integer" : typeof val;
    const want = t === "integer" ? ["integer"] : t === "number" ? ["number"] : [t];
    if (!want.includes(is === "number" && t === "number" ? "number" : is))
      { out.push(`${path}: ${is}, wanted ${t}`); return; }
  }
  if (typeof val === "number" && node.minimum != null && val < node.minimum)
    out.push(`${path}: ${val} below minimum ${node.minimum}`);
  if (Array.isArray(val)) {
    if (node.minItems != null && val.length < node.minItems)
      out.push(`${path}: ${val.length} items, wanted ${node.minItems}`);
    if (node.items) val.forEach((v, i) => check(node.items, v, schema, `${path}[${i}]`, out));
  }
  if (val && typeof val === "object" && !Array.isArray(val)) {
    for (const r of node.required || [])
      if (!(r in val)) out.push(`${path}: missing required "${r}"`);
    for (const [k, v] of Object.entries(val))
      if (node.properties && node.properties[k])
        check(node.properties[k], v, schema, `${path}.${k}`, out);
      else if (node.additionalProperties === false && node.properties)
        out.push(`${path}: unexpected "${k}"`);
  }
}

export function validate(schema, val) {
  const out = [];
  check(schema, val, schema, "$", out);
  return out;
}
