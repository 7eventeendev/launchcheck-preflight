import {writeFile} from 'node:fs/promises';
import {analyzeDocument, parseMarkup, exampleHtml, fixedExampleHtml} from '../src/preflight.mjs';
import {MAX_HTML_BYTES, validateHtmlSource} from '../src/html-input.mjs';

// Escape HTML delimiters and JavaScript line separators in embedded source examples.
const inlineJSON = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const helpers = [parseMarkup, analyzeDocument, validateHtmlSource].map(fn => 'const ' + fn.name + ' = ' + fn.toString() + ';').join('\n');
if (/<\/script/i.test(helpers)) throw new Error('A helper contains an unsafe inline-script delimiter.');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; object-src 'none'; form-action 'none'; base-uri 'none'">
  <title>LaunchCheck — free source preflight</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f6f5ee; color: #213c31; font: 16px/1.6 Arial, sans-serif; }
    main, footer { max-width: 920px; margin: auto; padding: 32px 24px; }
    h1, h2 { font-family: Georgia, serif; line-height: 1.2; }
    h1 { font-size: clamp(30px, 5vw, 44px); margin: 8px 0 16px; }
    h2 { font-size: 28px; }
    h3 { font-size: 18px; margin: 0 0 8px; }
    p { margin: 12px 0; }
    a { color: inherit; }
    label { display: block; font-weight: bold; margin: 24px 0 8px; }
    textarea { display: block; width: 100%; min-height: 280px; resize: vertical; padding: 12px; border: 1px solid #526159; background: #fffef9; color: #213c31; font: 14px/1.5 monospace; }
    button { padding: 11px 16px; border: 1px solid #213c31; background: #213c31; color: #fff; font: inherit; cursor: pointer; }
    button.secondary { background: #fffef9; color: #213c31; }
    button:focus-visible, textarea:focus-visible, a:focus-visible, .focus-target:focus { outline: 3px solid #947121; outline-offset: 3px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
    .small { font-size: 14px; }
    .eyebrow { font-size: 12px; letter-spacing: .08em; }
    .notice { border-left: 4px solid #526159; padding: 12px 16px; background: #e0e9d7; }
    .error { border-left: 4px solid #8a3b25; padding: 12px 16px; }
    .focus-target { scroll-margin-top: 24px; }
    .results { list-style: none; margin: 20px 0 0; padding: 0; }
    .finding { padding: 20px 0; border-top: 1px solid #b4c2ae; }
    .finding p:last-child { margin-bottom: 0; }
    .result-text, h1, h2, h3, footer { overflow-wrap: anywhere; }
    footer { border-top: 1px solid #b4c2ae; padding-top: 20px; }
    [hidden] { display: none; }
    @media (max-width: 390px) { main, footer { padding-left: 20px; padding-right: 20px; } }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">FREE SOURCE CHECKER / BY 7EVENTEEN</p>
    <h1>LaunchCheck source preflight</h1>
    <p>Inspect pasted HTML with 10 source heuristics. This demo works offline: HTML stays in this tab, is never uploaded, and is not rendered as a page. It does not save your source or results.</p>
    <p class="notice">A pass means this source check found its expected markup. These checks do not test a rendered website, keyboard use, contrast, performance or security. Actual browser testing is still needed; this is not accessibility certification or a launch guarantee.</p>

    <label for="source">HTML source</label>
    <textarea id="source" spellcheck="false" autocomplete="off" aria-describedby="input-help input-error" placeholder="Paste HTML here. Avoid credentials and private client data."></textarea>
    <p id="input-help" class="small">Maximum 1,000,000 UTF-8 bytes (1 MB). Example buttons replace the HTML source and run the checks.</p>
    <p id="input-error" class="error" role="alert" hidden></p>
    <div class="actions">
      <button id="check" type="button">Check HTML</button>
      <button id="example" class="secondary" type="button">Try fictional example</button>
      <button id="labeled" class="secondary" type="button">Show labeled version</button>
    </div>
    <p id="source-context" class="small">The Studio North examples are fictional. The labeled version adds a visible label to the email input.</p>

    <section aria-labelledby="results-heading">
      <h2 id="results-heading" class="focus-target" tabindex="-1">Source observations</h2>
      <p id="summary" role="status" aria-atomic="true">No checks run yet. Paste HTML or try the fictional example.</p>
      <ol id="results" class="results"></ol>
    </section>
  </main>
  <footer>
    <p class="small">AI assistance was used to develop this software. <a href="https://launch.7eventeen.dev">LaunchCheck by 7eventeen (website; internet required)</a>.</p>
  </footer>
  <script>
    'use strict';
    const MAX_HTML_BYTES = ${MAX_HTML_BYTES};
    ${helpers}
    const exampleHtml = ${inlineJSON(exampleHtml)};
    const fixedExampleHtml = ${inlineJSON(fixedExampleHtml)};
    const byId = id => document.getElementById(id);
    function setText(id, text) { if (byId(id).textContent !== text) byId(id).textContent = text; }
    function element(tag, text, parent) {
      const node = document.createElement(tag);
      node.textContent = text;
      parent.appendChild(node);
      return node;
    }
    function clearError() {
      byId('input-error').hidden = true;
      byId('input-error').textContent = '';
      byId('source').removeAttribute('aria-invalid');
    }
    function checkSource() {
      clearError();
      byId('results').replaceChildren();
      let findings;
      try { findings = analyzeDocument(parseMarkup(validateHtmlSource(byId('source').value))); }
      catch (error) {
        byId('source').setAttribute('aria-invalid', 'true');
        byId('input-error').textContent = error.message;
        byId('input-error').hidden = false;
        setText('summary', 'No results. Check the HTML input.');
        byId('source').focus();
        return;
      }
      const passed = findings.filter(finding => finding.passed).length;
      setText('summary', passed + ' of ' + findings.length + ' source checks passed · ' + (findings.length - passed) + ' need review. A pass does not verify the rendered website.');
      for (const finding of findings) {
        const row = document.createElement('li');
        row.className = 'finding result-text';
        byId('results').appendChild(row);
        element('h3', (finding.passed ? 'PASS: ' : 'REVIEW: ') + finding.name, row);
        element('p', finding.detail, row);
        if (!finding.passed) {
          if (finding.targets.length) element('p', 'Where to look in your source: ' + finding.targets.join('; '), row);
          element('p', 'Next step: ' + finding.fix, row);
        }
      }
      byId('results-heading').focus({preventScroll: true});
      byId('results-heading').scrollIntoView({block: 'start'});
    }
    byId('check').onclick = checkSource;
    byId('example').onclick = () => {
      byId('source').value = exampleHtml;
      setText('source-context', 'Fictional Studio North example: the email input has no detectable label. This is demonstration source, not a customer website.');
      checkSource();
    };
    byId('labeled').onclick = () => {
      byId('source').value = fixedExampleHtml;
      setText('source-context', 'Fictional Studio North labeled version: a visible Email address label is associated with the email input. Passing all 10 source checks does not establish website accessibility or launch readiness.');
      checkSource();
    };
    byId('source').oninput = () => {
      clearError();
      byId('results').replaceChildren();
      setText('source-context', 'Edited HTML stays in this tab. Check it again to update the source observations.');
      setText('summary', 'Source changed. Choose Check HTML to run the 10 source checks.');
    };
  </script>
</body>
</html>`;

await writeFile(new URL('../demo.html', import.meta.url), html);
console.log('Built self-contained demo.html (' + Buffer.byteLength(html, 'utf8') + ' bytes).');
