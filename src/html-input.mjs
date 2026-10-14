export const MAX_HTML_BYTES = 1_000_000;

export function validateHtmlSource(source) {
  if (!source.trim()) throw new Error('Add your HTML or try the example.');
  if (source.includes('\0')) throw new Error('Choose UTF-8 HTML text, rather than a binary file.');
  if (new TextEncoder().encode(source).byteLength > MAX_HTML_BYTES) {
    throw new Error('HTML must be no larger than 1,000,000 UTF-8 bytes (1 MB).');
  }
  return source;
}

export async function readHtmlFile(file) {
  if (!/\.html?$/i.test(file.name)) throw new Error('Choose a .html or .htm file. You can also paste HTML below.');
  if (file.size > MAX_HTML_BYTES) throw new Error('This file exceeds 1 MB. Choose a smaller HTML file or page.');
  let bytes;
  try { bytes = await file.arrayBuffer(); }
  catch { throw new Error('This file could not be read. Choose it again or paste its HTML.'); }
  if (bytes.byteLength > MAX_HTML_BYTES) throw new Error('This file exceeds 1 MB. Choose a smaller HTML file or page.');
  let source;
  try { source = new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
  catch { throw new Error('This file is not UTF-8. Export or save it as UTF-8 HTML and try again.'); }
  return validateHtmlSource(source);
}
