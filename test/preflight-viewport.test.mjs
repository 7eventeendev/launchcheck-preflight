import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDocument} from '../src/preflight.mjs';

// This isolates the actual source heuristic. Browser tests cover inert parsing.
function viewportFinding(content) {
  const meta = {getAttribute:()=>content};
  const doc = {
    documentElement:{getAttribute:()=>null},
    querySelector:selector=>selector === 'meta[name="viewport" i]' ? meta : null,
    querySelectorAll:()=>[],getElementById:()=>null,
  };
  return analyzeDocument(doc).find(f=>f.name==='Mobile viewport');
}

test('whole device-width entries allow ASCII spacing, case and existing separators',()=>{
  for (const content of [
    'width=device-width','WIDTH = DEVICE-WIDTH',
    '\twidth\r=\n device-width\t',
    'initial-scale=1, width=device-width',
    'initial-scale=1; width=device-width',
    'width=device-width initial-scale=1',
    'width=device-width,width=device-width',
  ]) assert.equal(viewportFinding(content).passed,true,content);
});

test('lookalike keys, embedded/suffixed values and missing device width need review',()=>{
  for (const content of [
    'notwidth=device-width','my-width=device-width',
    'width=notdevice-width','width=device-width-extra','width=device-widthx',
    'foo=width=device-width','initial-scale=1width=device-width',
    'width=980','width=','initial-scale=1','',null,
    'width\u00a0=\u00a0device-width',
  ]) assert.equal(viewportFinding(content).passed,false,String(content));
});

test('conflicting explicit width entries need review rather than implying an effective mobile viewport',()=>{
  for (const content of [
    'width=device-width,width=980','width=980,width=device-width',
    'width=device-width;width=device-height',
  ]) assert.equal(viewportFinding(content).passed,false,content);
});
