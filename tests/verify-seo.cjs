const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================');
console.log('ORBITAL EYE — COMPLETE SEO VALIDATION SUITE');
console.log('========================================================\n');

const canonicalPages = [
  { file: 'public/index.html', route: '/', canonical: 'https://orbitaleye.in/' },
  { file: 'public/solar-system.html', route: '/solar-system', canonical: 'https://orbitaleye.in/solar-system' },
  { file: 'public/earth.html', route: '/earth', canonical: 'https://orbitaleye.in/earth' },
  { file: 'public/deep-space.html', route: '/deepspace', canonical: 'https://orbitaleye.in/deepspace' },
  { file: 'public/asteroids.html', route: '/asteroids', canonical: 'https://orbitaleye.in/asteroids' },
  { file: 'public/kisanmitra.html', route: '/kisanmitra', canonical: 'https://orbitaleye.in/kisanmitra' },
  { file: 'public/air-quality.html', route: '/air-quality', canonical: 'https://orbitaleye.in/air-quality' },
  { file: 'public/alert.html', route: '/alert', canonical: 'https://orbitaleye.in/alert' }
];

let totalChecks = 0;
let passedChecks = 0;

function check(desc, condition) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

const seenTitles = new Set();
const seenDescriptions = new Set();
const seenCanonicals = new Set();

console.log('--- 1. Individual Page SEO Metadata & Uniqueness ---');

for (const p of canonicalPages) {
  const content = fs.readFileSync(path.resolve(p.file), 'utf8');

  // Title checks
  const titleMatches = content.match(/<title>([^<]+)<\/title>/gi);
  check(`${p.file} has exactly one <title>`, titleMatches && titleMatches.length === 1);
  const title = titleMatches[0].replace(/<\/?title>/gi, '').trim();
  check(`${p.file} title is unique ("${title}")`, !seenTitles.has(title));
  seenTitles.add(title);
  check(`${p.file} title contains 'Orbital Eye'`, title.includes('Orbital Eye'));

  // Meta description checks
  const descMatches = content.match(/<meta\s+name="description"\s+content="([^"]+)"\s*\/?>/gi);
  check(`${p.file} has exactly one meta description`, descMatches && descMatches.length === 1);
  const descContent = descMatches ? descMatches[0].match(/content="([^"]+)"/i)[1] : '';
  check(`${p.file} description is non-empty (>40 chars)`, descContent.length > 40);
  check(`${p.file} description is unique`, !seenDescriptions.has(descContent));
  seenDescriptions.add(descContent);

  // Canonical link checks
  const canonicalMatches = content.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/gi);
  check(`${p.file} has exactly one canonical link`, canonicalMatches && canonicalMatches.length === 1);
  const canonicalHref = canonicalMatches ? canonicalMatches[0].match(/href="([^"]+)"/i)[1] : '';
  check(`${p.file} canonical link equals "${p.canonical}"`, canonicalHref === p.canonical);
  check(`${p.file} canonical link is unique`, !seenCanonicals.has(canonicalHref));
  seenCanonicals.add(canonicalHref);

  // Open Graph URL
  const ogUrlMatches = content.match(/<meta\s+property="og:url"\s+content="([^"]+)"\s*\/?>/gi);
  check(`${p.file} has og:url matching canonical`, ogUrlMatches && ogUrlMatches[0].includes(p.canonical));

  // Twitter URL
  const twitterUrlMatches = content.match(/<meta\s+name="twitter:url"\s+content="([^"]+)"\s*\/?>/gi);
  check(`${p.file} has twitter:url matching canonical`, twitterUrlMatches && twitterUrlMatches[0].includes(p.canonical));

  // No stale domain names
  check(`${p.file} does NOT contain 'your-domain.com'`, !content.includes('your-domain.com'));
  check(`${p.file} does NOT contain 'onrender.com'`, !content.includes('onrender.com'));

  // Visible H1
  const h1Matches = content.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi);
  check(`${p.file} contains at least one H1 heading`, h1Matches && h1Matches.length >= 1);

  // Language & Viewport
  check(`${p.file} declares lang="en"`, content.includes('<html lang="en">') || content.includes('<html lang="en"'));
  check(`${p.file} includes responsive viewport meta tag`, content.includes('name="viewport"'));

  // Valid JSON-LD
  const jsonLdMatches = content.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  check(`${p.file} has JSON-LD structured data block`, jsonLdMatches && jsonLdMatches.length >= 1);
  if (jsonLdMatches) {
    for (const block of jsonLdMatches) {
      const rawJson = block.replace(/<script\s+type="application\/ld\+json">/i, '').replace(/<\/script>/i, '').trim();
      let parsed = null;
      try {
        parsed = JSON.parse(rawJson);
      } catch (err) {
        parsed = null;
      }
      check(`${p.file} JSON-LD parses as valid JSON`, parsed !== null);
      if (parsed) {
        check(`${p.file} JSON-LD has schema context`, parsed['@context'] === 'https://schema.org');
      }
    }
  }
}

console.log('\n--- 2. Static and Dynamic Sitemap.xml Verification ---');
const staticSitemap = fs.readFileSync(path.resolve('public/sitemap.xml'), 'utf8');
check('public/sitemap.xml contains <urlset', staticSitemap.includes('<urlset'));
for (const p of canonicalPages) {
  check(`public/sitemap.xml contains canonical URL ${p.canonical}`, staticSitemap.includes(`<loc>${p.canonical}</loc>`));
}
check('public/sitemap.xml does NOT contain sentinel or admin', !staticSitemap.includes('sentinel'));
check('public/sitemap.xml does NOT contain old routes', !staticSitemap.includes('/weather<') && !staticSitemap.includes('/orbitalert<'));

console.log('\n--- 3. Static and Dynamic Robots.txt Verification ---');
const staticRobots = fs.readFileSync(path.resolve('public/robots.txt'), 'utf8');
check('public/robots.txt contains User-agent: *', staticRobots.includes('User-agent: *'));
check('public/robots.txt allows all canonical viewports', 
  staticRobots.includes('Allow: /solar-system') && 
  staticRobots.includes('Allow: /earth') && 
  staticRobots.includes('Allow: /deepspace') && 
  staticRobots.includes('Allow: /asteroids') && 
  staticRobots.includes('Allow: /kisanmitra') && 
  staticRobots.includes('Allow: /air-quality') && 
  staticRobots.includes('Allow: /alert')
);
check('public/robots.txt disallows /sentinel', staticRobots.includes('Disallow: /sentinel'));
check('public/robots.txt disallows /api/', staticRobots.includes('Disallow: /api/'));
check('public/robots.txt disallows /.env', staticRobots.includes('Disallow: /.env'));
check('public/robots.txt points to canonical sitemap', staticRobots.includes('Sitemap: https://orbitaleye.in/sitemap.xml'));

console.log('\n--- 4. OpenSearch XML Verification ---');
const openSearch = fs.readFileSync(path.resolve('public/opensearch.xml'), 'utf8');
check('public/opensearch.xml uses Orbital Eye name', openSearch.includes('<ShortName>Orbital Eye</ShortName>'));
check('public/opensearch.xml uses canonical https://orbitaleye.in/', openSearch.includes('https://orbitaleye.in/'));
check('public/opensearch.xml does not contain onrender.com', !openSearch.includes('onrender.com'));

console.log('\n========================================================');
console.log(`SEO VALIDATION COMPLETE: ${passedChecks} / ${totalChecks} CHECKS PASSED`);
console.log('========================================================');
