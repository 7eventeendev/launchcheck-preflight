import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_HTML_BYTES,validateHtmlSource,readHtmlFile} from '../src/html-input.mjs';

test('source limit counts UTF-8 bytes, including exact boundary',()=>{
  assert.equal(validateHtmlSource('x'.repeat(MAX_HTML_BYTES)).length,MAX_HTML_BYTES);
  assert.equal(validateHtmlSource('é'.repeat(MAX_HTML_BYTES/2)).length,MAX_HTML_BYTES/2);
  assert.throws(()=>validateHtmlSource('é'.repeat(MAX_HTML_BYTES/2)+'x'),/1,000,000 UTF-8 bytes/);
  assert.throws(()=>validateHtmlSource(' \n\t'),/Add your HTML/);
  assert.throws(()=>validateHtmlSource('<html>\0</html>'),/binary/);
});

test('HTML files decode Unicode and optional UTF-8 BOM',async()=>{
  const source='<html lang="fr"><h1>Étude 🧭</h1></html>';
  assert.equal(await readHtmlFile(new File([source],'page.HTML')),source);
  assert.equal(await readHtmlFile(new File([new Uint8Array([0xef,0xbb,0xbf]),source],'page.htm')),source);
});

test('wrong extensions and oversized files are rejected before reading',async()=>{
  let reads=0;
  const arrayBuffer=async()=>{reads++;return new ArrayBuffer(0);};
  await assert.rejects(readHtmlFile({name:'page.zip',size:10,arrayBuffer}),/\.html or \.htm/);
  await assert.rejects(readHtmlFile({name:'page.html',size:MAX_HTML_BYTES+1,arrayBuffer}),/exceeds 1 MB/);
  assert.equal(reads,0);
  await assert.rejects(readHtmlFile({name:'page.html',size:1,arrayBuffer:async()=>new ArrayBuffer(MAX_HTML_BYTES+1)}),/exceeds 1 MB/);
});

test('malformed encoding, binary, empty and failed reads give actionable errors',async()=>{
  for(const bytes of [new Uint8Array([0xc3,0x28]),new Uint8Array([0xff,0xfe,0x3c,0x00])]){
    await assert.rejects(readHtmlFile(new File([bytes],'page.html')),/not UTF-8/);
  }
  await assert.rejects(readHtmlFile(new File(['<html>\0</html>'],'page.html')),/binary/);
  await assert.rejects(readHtmlFile(new File(['  '],'page.html')),/Add your HTML/);
  await assert.rejects(readHtmlFile({name:'page.html',size:1,arrayBuffer:async()=>{throw new Error('private path');}}),/Choose it again or paste/);
});
