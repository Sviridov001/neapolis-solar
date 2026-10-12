import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { startServer } from '../desktop/server.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = process.argv.slice(2);
const fixture = fileURLToPath(new URL('../tests/fixtures/minimal-wall.ifc', import.meta.url));
const { server, base } = await startServer(path.join(root, 'dist'));
try {
  const response = await fetch(base + 'ifc-worker.js');
  assert.equal(response.status, 200);
  const policy = response.headers.get('content-security-policy');
  assert(policy.includes("'wasm-unsafe-eval'"));
  assert(!policy.includes("'unsafe-eval'"));
  const code = await response.text();
  for (const file of [fixture, ...files]) {
    const buffer = await fs.readFile(file);
    let resolveResult;
    const finished = new Promise(resolve => { resolveResult = resolve; });
    const errors = [];
    const context = vm.createContext({
      self: { location: { href: base + 'ifc-worker.js' }, crossOriginIsolated: true },
      WorkerGlobalScope: function WorkerGlobalScope() {},
      location: { href: base + 'ifc-worker.js' },
      console: { log() {}, warn() {}, error: (...args) => errors.push(args.join(' ')) },
      fetch, URL, TextDecoder, TextEncoder, performance, setTimeout, clearTimeout,
      postMessage: message => {
        if (message.type === 'model' || message.type === 'error') resolveResult(message);
      }
    }, { codeGeneration: { strings: false, wasm: true } });
    // Control: this context really rejects the operation reported by the user.
    assert.throws(() => vm.runInContext('new Function("return 1")', context), /Code generation from strings disallowed/);
    const module = new vm.SourceTextModule(code, {
      context,
      identifier: base + 'ifc-worker.js',
      initializeImportMeta: meta => { meta.url = base + 'ifc-worker.js'; }
    });
    await module.link(() => { throw Error('The browser importer must be self-contained'); });
    await module.evaluate();
    await context.self.onmessage({ data: {
      name: path.basename(file), buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    } });
    const result = await finished;
    assert.equal(result.type, 'model', result.message || errors.join('\n'));
    assert(result.meta.elements.length > 0, 'IFC must contain real mesh geometry');
    for (const array of result.arrays) assert(array.every(Number.isFinite));
    if (file === fixture) {
      assert.equal(result.meta.schema, 'IFC4');
      assert.equal(result.meta.meshedElementCount, 1);
      const size = result.meta.bounds[1].map((v, i) => v - result.meta.bounds[0][i]);
      for (const [i, expected] of [2, 3, .2].entries()) assert(Math.abs(size[i] - expected) < 1e-5, `Y-up wall size ${size}`);
      assert(Math.abs(result.meta.latitude - (44 + 56 / 60 + 53 / 3600)) < 1e-8);
    }
    console.log(`PASS: browser IFC worker with string evaluation disabled: ${path.basename(file)} (${result.meta.meshedElementCount} mesh elements)`);
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
