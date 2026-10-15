import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDocument} from '../src/preflight.mjs';

// A supplied canonical element isolates the source heuristic from unrelated DOM checks.
// Real-browser cases separately exercise relation-token selection and inert parsing.
function canonicalFinding(href) {
  const link = {getAttribute:name=>name==='href'?href:null};
  const doc = {
    documentElement:{getAttribute:()=>null},
    querySelector:selector=>selector.startsWith('link[')?link:null,
    querySelectorAll:()=>[],
    getElementById:()=>null,
  };
  return analyzeDocument(doc).find(f=>f.name==='Canonical hint');
}

test('canonical hints accept parseable explicit HTTP(S) URLs without fetching them',()=>{
  for (const href of [
    'https://example.invalid/page','http://example.invalid/',
    ' HTTPS://example.invalid/canonical ', '\nhttps://example.invalid/a?b=c#part\t',
    'https://例え.invalid/道','https://[2001:db8::1]:8443/',
  ]) assert.equal(canonicalFinding(href).passed,true,href);
});

test('protocol text, malformed hosts/ports and non-HTTP or relative references need review',()=>{
  for (const href of [
    'https://','https://#fragment','https://:443',
    'https://exa mple.invalid/','https://exa%23mple.invalid/',
    'https://[2001:db8::1/','https://example.invalid:99999/',
    '/page','//example.invalid/page','https:example.invalid/page',
    'ftp://example.invalid/page','javascript:alert(1)','',null,
  ]) assert.equal(canonicalFinding(href).passed,false,String(href));
});
