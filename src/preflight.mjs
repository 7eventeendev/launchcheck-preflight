export function parseMarkup(source) {
  const template = document.createElement('template');
  // Template descendants remain inert. Preserve root language in a custom tag
  // because fragment parsing otherwise discards html/head/body wrappers.
  template.innerHTML = source.replace(/<(\/?)html(?=[\s/>])/gi,'<$1x-launchcheck-html');
  const root=template.content;
  return {documentElement:root.querySelector('x-launchcheck-html') || {getAttribute:()=>null},querySelector:root.querySelector.bind(root),querySelectorAll:root.querySelectorAll.bind(root),getElementById:root.getElementById.bind(root)};
}

export function analyzeDocument(doc) {
  const findings = [];
  const add = (name,passed,detail,fix,targets=[]) => findings.push({name,passed,detail,fix,targets});
  // Ordinals describe the pasted source, without copying values, URLs or HTML.
  // Keep this inside the function: the offline kit serializes it with toString().
  const cues = (matches,all,label) => matches.slice(0,3).map(el => `${label} ${all.indexOf(el)+1}: ${el.tagName.toLowerCase()}${el.tagName.toLowerCase()==='input' ? ` (type=${el.type})` : ''}`);
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  add('Page title', !!title, title || 'No title element found.', 'Add a specific title describing this page.');
  const description = doc.querySelector('meta[name="description" i]')?.getAttribute('content')?.trim() || '';
  add('Search description', !!description, description || 'No non-empty description found.', 'Write a short, accurate meta description.');
  const lang = doc.documentElement.getAttribute('lang')?.trim() || '';
  add('Document language', !!lang, lang ? `Language is ${lang}.` : 'No document language.', 'Set the appropriate lang attribute on html.');
  const viewport = doc.querySelector('meta[name="viewport" i]')?.getAttribute('content') || '';
  add('Mobile viewport', /width\s*=\s*device-width/i.test(viewport), viewport || 'No viewport metadata.', 'Use width=device-width, initial-scale=1 and allow zoom.');
  const h1s = [...doc.querySelectorAll('h1')];
  add('Main heading', h1s.length === 1 && !!h1s[0]?.textContent?.trim(), `${h1s.length} h1 elements found.`, 'Use one clear main heading and review the outline.', cues(h1s,h1s,'Heading'));
  const images = [...doc.querySelectorAll('img')];
  const missingAlt = images.filter(img => !img.hasAttribute('alt'));
  add('Image text alternatives', missingAlt.length === 0, `${missingAlt.length} images without alt. Empty alt is valid for decoration.`, 'Describe meaningful images; use empty alt for decorative images.', cues(missingAlt,images,'Image'));
  const labels = [...doc.querySelectorAll('label')];
  const inputs = [...doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]),select,textarea')];
  function referencedName(el) { const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean); return ids.length && ids.every(id => doc.getElementById(id)?.textContent?.trim()); }
  const htmlNamespace = 'http://www.w3.org/1999/xhtml';
  const labelableNames = new Set(['button','input','meter','output','progress','select','textarea']);
  const isLabelable = el => !!el && el.namespaceURI === htmlNamespace && labelableNames.has(el.localName) && !(el.localName === 'input' && el.type === 'hidden');
  // Explicit labels target the first matching ID, even if that node cannot be labeled.
  const firstIds = new Map();
  for (const el of doc.querySelectorAll('[id]')) {
    const id = el.getAttribute('id');
    if (id && !firstIds.has(id)) firstIds.set(id,el);
  }
  const labeledControls = new Set();
  for (const label of labels) {
    if (label.namespaceURI !== htmlNamespace || !label.textContent?.trim()) continue;
    // Native label.control is unreliable for explicit labels in an inert template.
    // A present for attribute always wins; empty or invalid values have no fallback.
    const control = label.hasAttribute('for')
      ? firstIds.get(label.getAttribute('for'))
      : [...label.querySelectorAll('button,input,meter,output,progress,select,textarea')].find(isLabelable);
    if (isLabelable(control)) labeledControls.add(control);
  }
  const unlabeled = inputs.filter(input => !input.getAttribute('aria-label')?.trim() && !referencedName(input) && !labeledControls.has(input));
  add('Form labels', unlabeled.length === 0, `${unlabeled.length} fields without a detectable label.`, 'Give each field its own visible label; use unique IDs for explicit labels. Placeholders are insufficient.', cues(unlabeled,inputs,'Field'));
  const buttons = [...doc.querySelectorAll('button')];
  const unnamed = buttons.filter(button => !button.textContent?.trim() && !button.getAttribute('aria-label')?.trim() && !referencedName(button) && ![...button.querySelectorAll('img[alt]')].some(img => img.getAttribute('alt')?.trim()));
  add('Button names', unnamed.length === 0, `${unnamed.length} buttons without a detectable name.`, 'Add visible text or an accurate accessible label.', cues(unnamed,buttons,'Button'));
  const canonicalEl = doc.querySelector('link[rel~="canonical" i]');
  const canonical = (canonicalEl?.getAttribute('href') || canonicalEl?.getAttribute('data-inert-href') || '').trim();
  let absoluteCanonical = false;
  if (/^https?:\/\//i.test(canonical)) {
    try {
      const parsed = new URL(canonical);
      absoluteCanonical = ['http:','https:'].includes(parsed.protocol) && !!parsed.hostname;
    } catch { /* A protocol prefix alone does not establish a parseable URL. */ }
  }
  add('Canonical hint', absoluteCanonical, canonical || 'No absolute HTTP(S) canonical found. This may be intentional.', 'If appropriate, specify this page’s preferred absolute HTTP(S) URL. This checks URL syntax, not the destination.');
  const social = doc.querySelector('meta[property="og:title" i]')?.getAttribute('content')?.trim();
  add('Social preview title', !!social, social ? `Open Graph title: ${social}` : 'No Open Graph title found.', 'Add accurate sharing metadata when relevant.');
  return findings;
}
export const exampleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Studio North — email updates</title>
    <meta name="description" content="A fictional email-signup page for the LaunchCheck demonstration.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="https://example.invalid/email-updates">
    <meta property="og:title" content="Studio North — email updates">
  </head>
  <body>
    <main>
      <p>Fictional example for a source-only review.</p>
      <h1>Get Studio North updates</h1>
      <p>Sign up for occasional studio news.</p>
      <form>
        <input id="demo-email" type="email" placeholder="you@example.invalid" autocomplete="email">
        <button type="submit">Sign up for updates</button>
      </form>
    </main>
  </body>
</html>`;

export const fixedExampleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Studio North — email updates</title>
    <meta name="description" content="A fictional email-signup page for the LaunchCheck demonstration.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="https://example.invalid/email-updates">
    <meta property="og:title" content="Studio North — email updates">
  </head>
  <body>
    <main>
      <p>Fictional example for a source-only review.</p>
      <h1>Get Studio North updates</h1>
      <p>Sign up for occasional studio news.</p>
      <form>
        <label for="demo-email">Email address</label>
        <input id="demo-email" type="email" placeholder="you@example.invalid" autocomplete="email">
        <button type="submit">Sign up for updates</button>
      </form>
    </main>
  </body>
</html>`;
