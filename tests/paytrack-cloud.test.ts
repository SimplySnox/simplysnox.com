import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { defaultStore, validateStore } from '../src/lib/paytrack/model';

const owner = '11111111-1111-4111-8111-111111111111';

/** Exercise the real helper module with only its external Supabase client replaced. */
function helpers(fakeClient: unknown): typeof import('../src/lib/paytrack/cloud') {
  const filename = resolve(process.cwd(), 'src/lib/paytrack/cloud.ts');
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Script(compiled, { filename }).runInNewContext({
    module, exports: module.exports,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key' } },
    crypto: { randomUUID },
    require(name: string) {
      if (name === '@supabase/supabase-js') return { createClient: () => fakeClient };
      if (name === './model') return { defaultStore, validateStore };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return module.exports as typeof import('../src/lib/paytrack/cloud');
}

function uploadClient(userId = owner) {
  const uploads: { path: string; options: { contentType: string; upsert: boolean } }[] = [];
  return {
    uploads,
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    storage: { from: (bucket: string) => {
      assert.equal(bucket, 'paytrack-stubs');
      return { upload: async (path: string, _file: unknown, options: { contentType: string; upsert: boolean }) => {
        uploads.push({ path, options }); return { error: null };
      } };
    } },
  };
}

function file(name: string, type: string, size = 123): File {
  return { name, type, size } as File;
}

test('document-provider files with empty MIME use the allowed extension and private generated paths', async () => {
  const client = uploadClient();
  const cloud = helpers(client);
  const uploaded = await cloud.uploadStub(file('Personal Paystub.PDF', ''), owner);
  assert.match(uploaded.attachmentId, new RegExp(`^${owner}/[0-9a-f-]{36}\\.pdf$`));
  assert.equal(uploaded.attachmentName, 'Personal Paystub.PDF');
  assert.equal(client.uploads[0].options.contentType, 'application/pdf');
  assert.equal(client.uploads[0].options.upsert, false);
  await cloud.uploadStub(file('camera.JPEG', ''), owner);
  assert.equal(client.uploads[1].options.contentType, 'image/jpeg');
  assert.match(client.uploads[1].path, /\.jpg$/);
});

test('explicit MIME mismatches, unsupported extensions, empty files, and oversized files are rejected', async () => {
  const client = uploadClient();
  const cloud = helpers(client);
  await assert.rejects(cloud.uploadStub(file('stub.pdf', 'text/plain'), owner), /must be a PDF/);
  await assert.rejects(cloud.uploadStub(file('stub.png', 'application/pdf'), owner), /must be a PDF/);
  await assert.rejects(cloud.uploadStub(file('stub.html', ''), owner), /must be a PDF/);
  await assert.rejects(cloud.uploadStub(file('stub.pdf', '', 0), owner), /nonempty/);
  await assert.rejects(cloud.uploadStub(file('stub.pdf', '', 10 * 1024 * 1024 + 1), owner), /10 MB/);
  assert.equal(client.uploads.length, 0);
});

test('an account switch before upload prevents sending the original file', async () => {
  const client = uploadClient('22222222-2222-4222-8222-222222222222');
  await assert.rejects(helpers(client).uploadStub(file('stub.pdf', 'application/pdf'), owner), /Sign in again/);
  assert.equal(client.uploads.length, 0);
});

test('record writes bind both the intended owner and the displayed revision', async () => {
  let call: { name: string; payload: Record<string, unknown> } | null = null;
  const state = defaultStore();
  const cloud = helpers({ rpc: async (name: string, payload: Record<string, unknown>) => {
    call = { name, payload };
    return { data: [{ data: state, revision: 8 }], error: null };
  } });
  const result = await cloud.writeAccount(7, state, owner);
  assert.equal(call!.name, 'save_paytrack');
  assert.equal(call!.payload.expected_revision, 7);
  assert.equal(call!.payload.expected_user, owner);
  assert.deepEqual(call!.payload.payload, state);
  assert.equal(result.revision, 8);
});

test('a stale server revision is surfaced instead of retried with newer records', async () => {
  let requests = 0;
  const cloud = helpers({ rpc: async () => {
    requests += 1;
    return { data: null, error: { message: 'paytrack_conflict', code: 'P0001' } };
  } });
  await assert.rejects(cloud.writeAccount(3, defaultStore(), owner), { message: 'paytrack_conflict', code: 'P0001' });
  assert.equal(requests, 1);
});

test('simultaneous first access reads the winning account without overwriting it', async () => {
  let reads = 0;
  let inserts = 0;
  const existing = defaultStore();
  existing.settings.regularRate = 17;
  const cloud = helpers({ from: (table: string) => {
    assert.equal(table, 'paytrack_accounts');
    return {
      select: () => ({ eq: (_column: string, userId: string) => {
        assert.equal(userId, owner);
        return { maybeSingle: async () => ({ data: ++reads === 1 ? null : { data: existing, revision: 4 }, error: null }) };
      } }),
      insert: () => {
        inserts += 1;
        return { select: () => ({ single: async () => ({ data: null, error: { code: '23505', message: 'already exists' } }) }) };
      },
    };
  } });
  const result = await cloud.readAccount(owner);
  assert.equal(result.data.settings.regularRate, 17);
  assert.equal(result.revision, 4);
  assert.equal(inserts, 1);
  assert.equal(reads, 2);
});
