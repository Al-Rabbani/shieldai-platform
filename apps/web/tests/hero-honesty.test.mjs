import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* The dashboard hero asserted four things no store on this platform can support: threat actors tracking GDS, LockBit
 * victims per month, EU MSPs on a leak site, and a credential dump containing the GDS domain. It also put "$2.4M" on a
 * real incident and counted down to a hardcoded GDPR date. The same screen reported "0 dark web alerts".
 *
 * Assertions run on comment-stripped source, because the docstring above names every removed claim.
 */

function code(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("the hero invents no adversary, victim count, leak-site claim or credential-dump claim", () => {
  const hero = code("../src/components/home/GlobeHero.jsx");
  for (const banned of ["threat actors tracking", "victims/month", "named on leak site", "found in credential dump",
                        "LockBit", "Scattered Spider", "Volt Typhoon", "The Gentlemen"]) {
    assert.ok(!hero.includes(banned), `hero must not claim: ${banned}`);
  }
});

test("the hero attaches no invented money or regulatory deadline to an incident", () => {
  const hero = code("../src/components/home/GlobeHero.jsx");
  assert.ok(!hero.includes("$2.4M"));
  assert.ok(!hero.includes("GdprMiniCountdown"));
  assert.match(hero, /No financial impact or breach-notification deadline is recorded/);
});

test("the hero plots real estate regions and says where the numbers come from", () => {
  const hero = code("../src/components/home/GlobeHero.jsx");
  assert.match(hero, /region_or_location/);
  assert.match(hero, /REGION_COORDS/);
  assert.match(hero, /assets without a recorded region|without a recorded region/);
});

test("the hero states the absence of threat-intel stores instead of drawing an adversary", () => {
  const hero = code("../src/components/home/GlobeHero.jsx");
  assert.match(hero, /Not measured here/);
  assert.match(hero, /no threat-actor, ransomware, leak-site or credential-dump records/);
});

test("stars no longer move on every render", () => {
  const hero = code("../src/components/home/GlobeHero.jsx");
  assert.ok(!/Math\.random\(/.test(hero), "Math.random during render made the sky jump");
});

test("the page passes the estate and incidents into the hero", () => {
  const page = code("../src/pages/CommandCenter.jsx");
  /* Slice the element rather than regex across it: [^>]* stops at the > inside an arrow function. */
  const element = page.split("<GlobeHero ")[1].split("/>")[0];
  assert.match(element, /assets=\{assets\}/);
  assert.match(element, /incidents=\{incidents\}/);
});
