import {analyzeDocument, parseMarkup} from './preflight.mjs';
import {validateHtmlSource} from './html-input.mjs';

/** Inspect a string in a browser DOM without rendering its HTML as a page. */
export function checkHtml(source) {
  if (typeof source !== 'string') throw new TypeError('HTML source must be a string.');
  return analyzeDocument(parseMarkup(validateHtmlSource(source)));
}

export {analyzeDocument, parseMarkup, exampleHtml, fixedExampleHtml} from './preflight.mjs';
export {MAX_HTML_BYTES, validateHtmlSource, readHtmlFile} from './html-input.mjs';
