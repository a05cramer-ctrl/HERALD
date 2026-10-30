// HERALD API shared code. Leading underscore: Vercel does not expose this file as a route.

// ==== HERALD RULES BEGIN ====
// Shared, pure HERALD rules. This block is byte-identical in engine/rules.mjs and site/api/_lib.js.
// Edit one, copy to the other (rules.test.mjs fails if they drift).

export const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const MEMO_PROGRAM_LEGACY = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';
export const MEMO_PROGRAMS = new Set([MEMO_PROGRAM, MEMO_PROGRAM_LEGACY]);
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const FX_BASE = 'https://api.fxtwitter.com/status/';

export const SUBMIT_LAMPORTS = 1_000_000n; // 0.001 SOL submission fee
export const RESERVE_LAMPORTS = 50_000_000n; // 0.05 SOL always kept in POOL
export const BUDGET_BPS = 400n; // 4% of available SOL per payout tick
export const BUDGET_CAP_LAMPORTS = 2_000_000_000n; // 2 SOL per tick
export const BUYBACK_BPS = 2_000n; // 20% of each round's spend goes to buyback (accrued as paid/4)
export const PAYOUT_CAP_LAMPORTS = 500_000_000n; // 0.5 SOL per post
export const PAYOUT_MIN_LAMPORTS = 1_000_000n; // payouts below 0.001 SOL are skipped (final)
export const MIN_ROUND_LAMPORTS = 10_000_000n; // a round whose 80% pool is below 0.01 SOL is deferred, not skipped
export const BUYBACK_MIN = 20_000_000n; // 0.02 SOL
export const SCORE_DELAY_SEC = 6 * 3600;
export const FRESH_SEC = 48 * 3600;
export const MIN_FOLLOWERS = 50;
export const MIN_ACCOUNT_AGE_SEC = 30 * 86400;
export const DAILY_CAP = 3;
export const Q_MAX = 1.5;
export const WHY_MAX = 60;
export const PAY_MAX_RECIPIENTS = 12;
export const PAY_MEMO_MAX_BYTES = 400;
export const SCORE_MEMOS_PER_TX = 8;
export const MEMO_TX_MAX_BYTES = 760; // total memo bytes in one memo-only tx (keeps it under the 1232-byte tx limit)
export const FEE_DUST_LAMPORTS = 1_000n;

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B58_MAP = (() => {
  const m = new Int16Array(128).fill(-1);
  for (let i = 0; i < B58_ALPHABET.length; i++) m[B58_ALPHABET.charCodeAt(i)] = i;
  return m;
})();
const B58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function base58Decode(str) {
  if (typeof str !== 'string') return null;
  if (str.length === 0) return new Uint8Array(0);
  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') zeros++;
  const bytes = []; // little-endian accumulator
  for (let i = zeros; i < str.length; i++) {
    const c = str.charCodeAt(i);
    const v = c < 128 ? B58_MAP[c] : -1;
    if (v < 0) return null;
    let carry = v;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[out.length - 1 - i] = bytes[i];
  return out;
}

export function base58Encode(bytes) {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = []; // little-endian base58 digits
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let s = '1'.repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) s += B58_ALPHABET[digits[i]];
  return s;
}

export function isAddress(s) {
  if (typeof s !== 'string' || s.length < 32 || s.length > 44 || !B58_RE.test(s)) return false;
  const b = base58Decode(s);
  return b !== null && b.length === 32;
}

export function lamportsToSol(l) {
  const v = BigInt(l);
  const neg = v < 0n;
  const a = neg ? -v : v;
  const n = Number(a / 1_000_000_000n) + Number(a % 1_000_000_000n) / 1e9;
  return neg ? -n : n;
}

export function toLamports(x) {
  if (typeof x === 'bigint') return x;
  if (typeof x === 'number' && Number.isSafeInteger(x)) return BigInt(x);
  if (typeof x === 'string' && /^\d{1,20}$/.test(x)) return BigInt(x);
  return 0n;
}

export function uiSolToLamports(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0) return 0n;
  return BigInt(Math.round(n * 1e9));
}

export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function uiToRaw(ui, decimals) {
  const n = Number(ui);
  if (!Number.isFinite(n) || n <= 0 || n >= 1e20) return 0n;
  const [i, d = ''] = n.toFixed(decimals).split('.');
  return BigInt(i + d);
}

export function rawToUi(raw, decimals) {
  const d = 10n ** BigInt(decimals);
  const r = BigInt(raw);
  return Number(r / d) + Number(r % d) / Number(d);
}

export function chunk(list, n) {
  const out = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

export function decodeMemoData(data) {
  const raw = base58Decode(data);
  if (raw === null) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(raw);
  } catch {
    return null;
  }
}

// All memo texts in a Helius enhanced tx (top-level and inner instructions), in order.
export function extractMemos(tx) {
  const out = [];
  const visit = (ix) => {
    if (!ix || typeof ix !== 'object') return;
    if (MEMO_PROGRAMS.has(ix.programId) && typeof ix.data === 'string') {
      const t = decodeMemoData(ix.data);
      if (t !== null) out.push(t);
    }
    if (Array.isArray(ix.innerInstructions)) ix.innerInstructions.forEach(visit);
  };
  if (Array.isArray(tx?.instructions)) tx.instructions.forEach(visit);
  return out;
}

// ---- tweet ids, urls, wallet codes ----
const TWEET_ID_RE = /^\d{1,20}$/;
export const isTweetId = (s) => typeof s === 'string' && TWEET_ID_RE.test(s) && !/^0/.test(s);

const TWEET_HOSTS = new Set([
  'x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com',
  'fxtwitter.com', 'www.fxtwitter.com', 'fixupx.com', 'www.fixupx.com', 'vxtwitter.com', 'www.vxtwitter.com',
  'fixvx.com', 'www.fixvx.com', 'd.fxtwitter.com', 'd.vxtwitter.com',
]);

// Status id from an x.com / twitter.com / mobile.twitter.com / fxtwitter / vxtwitter URL, or null.
export function extractTweetId(input) {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (!s || s.length > 500) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!TWEET_HOSTS.has(u.hostname.toLowerCase())) return null;
  const m = /^\/(?:[A-Za-z0-9_]{1,15}|i(?:\/web)?)\/status(?:es)?\/(\d{1,20})(?:\/|$)/.exec(u.pathname);
  return m && isTweetId(m[1]) ? m[1] : null;
}

export const walletCode = (wallet) => (typeof wallet === 'string' && wallet.length >= 6 ? `h-${wallet.slice(0, 6)}` : null);

// ---- memos ----
// Score: up to 2 decimals, no trailing zeros ("12.5", "0", "1043.07").
export function fmtDec(v) {
  const n = Math.round(Number(v) * 100) / 100;
  if (!Number.isFinite(n) || n < 0) throw new Error(`bad decimal ${v}`);
  return String(n.toFixed(2)).replace(/\.?0+$/, '') || '0';
}
export function cleanWhy(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E]+/g, ' ')
    .replace(/,/g, ';')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, WHY_MAX)
    .trim();
}

export const submitMemo = (tweetId) => {
  if (!isTweetId(tweetId)) throw new Error('bad tweet id');
  return `HERALD:SUBMIT:${tweetId}`;
};
// SCORE carries the model's short reason after the q so the board can show it (empty allowed).
export function scoreMemo(tweetId, score, q, why = '') {
  if (!isTweetId(tweetId)) throw new Error('bad tweet id');
  if (!(q >= 0 && q <= Q_MAX)) throw new Error('bad q');
  return `HERALD:SCORE:${tweetId}:${fmtDec(score)}:${fmtDec(q)}:${cleanWhy(why)}`;
}
export function payMemo(ids) {
  if (!ids.length || !ids.every(isTweetId)) throw new Error('bad pay ids');
  return `HERALD:PAY:${ids.join(',')}`;
}
export function skipMemo(ids) {
  if (!ids.length || !ids.every(isTweetId)) throw new Error('bad skip ids');
  return `HERALD:SKIP:${ids.join(',')}`;
}
export const buybackMemo = (lamports) => `HERALD:BUYBACK:${BigInt(lamports)}`;
export const burnMemo = (amountRaw) => `HERALD:BURN:${BigInt(amountRaw)}`;

const ID = '([1-9]\\d{0,19})';
const DEC = '(\\d{1,12}(?:\\.\\d{1,2})?)';
const SUBMIT_RE = new RegExp(`^HERALD:SUBMIT:${ID}$`);
const SCORE_RE = new RegExp(`^HERALD:SCORE:${ID}:${DEC}:${DEC}(?::([\\x20-\\x7E]{0,${WHY_MAX}}))?$`);
const LIST_RE = (k) => new RegExp(`^HERALD:${k}:(${ID.slice(1, -1)}(?:,${ID.slice(1, -1)})*)$`);
const PAY_RE = LIST_RE('PAY');
const SKIP_RE = LIST_RE('SKIP');

export function parseHeraldMemo(text) {
  if (typeof text !== 'string' || text.length > 600) return null;
  let m;
  if ((m = SUBMIT_RE.exec(text))) return { kind: 'submit', tweetId: m[1] };
  if ((m = SCORE_RE.exec(text))) {
    const q = Number(m[3]);
    if (q > Q_MAX) return null;
    return { kind: 'score', tweetId: m[1], score: Number(m[2]), q, why: m[4] || '' };
  }
  if ((m = PAY_RE.exec(text))) return { kind: 'pay', ids: m[1].split(',') };
  if ((m = SKIP_RE.exec(text))) return { kind: 'skip', ids: m[1].split(',') };
  if ((m = /^HERALD:BUYBACK:(\d{1,20})$/.exec(text))) return { kind: 'buyback', lamports: BigInt(m[1]) };
  if ((m = /^HERALD:BURN:(\d{1,30})$/.exec(text))) return { kind: 'burn', amountRaw: BigInt(m[1]) };
  return null;
}

// Pack memos into memo-only txs: at most perTx memos and maxBytes memo bytes per tx.
export function packMemos(memos, perTx = SCORE_MEMOS_PER_TX, maxBytes = MEMO_TX_MAX_BYTES) {
  const out = [];
  let cur = [];
  let bytes = 0;
  for (const m of memos) {
    const b = new TextEncoder().encode(m).length;
    if (cur.length && (cur.length >= perTx || bytes + b > maxBytes)) {
      out.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(m);
    bytes += b;
  }
  if (cur.length) out.push(cur);
  return out;
}

// Comma-joined id lists split so each memo stays within maxBytes (prefix included).
export function splitIdList(prefix, ids, maxBytes) {
  const out = [];
  let cur = [];
  let len = prefix.length;
  for (const id of ids) {
    const add = (cur.length ? 1 : 0) + id.length;
    if (cur.length && len + add > maxBytes) {
      out.push(cur);
      cur = [];
      len = prefix.length;
    }
    len += (cur.length ? 1 : 0) + id.length;
    cur.push(id);
  }
  if (cur.length) out.push(cur);
  return out;
}

// Payout txs: ≤ PAY_MAX_RECIPIENTS transfers each, memo ≤ PAY_MEMO_MAX_BYTES. payouts keep their order.
export function batchPayouts(payouts) {
  const out = [];
  let cur = [];
  for (const p of payouts) {
    const next = [...cur, p];
    if (cur.length && (next.length > PAY_MAX_RECIPIENTS || payMemo(next.map((x) => x.tweetId)).length > PAY_MEMO_MAX_BYTES)) {
      out.push(cur);
      cur = [p];
    } else cur = next;
  }
  if (cur.length) out.push(cur);
  return out;
}

// ---- pool history ----
// Classify one Helius enhanced tx touching POOL into records (array, possibly empty).
//  submit: a tx NOT signed by POOL with a SUBMIT memo and >= 0.001 SOL from its fee payer to POOL.
//  score/skip/pay/buyback/burn: only on txs POOL itself signed (fee payer), so nobody can fake them.
//  fee: any other inbound SOL above dust (creator fees).
export function classifyPoolTx(tx, pool, mint) {
  if (!tx || tx.transactionError || typeof tx.signature !== 'string' || !Number.isFinite(tx.timestamp)) return [];
  const base = { sig: tx.signature, t: tx.timestamp, slot: Number(tx.slot) || 0 };
  const nt = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : [];
  const tt = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
  const memos = extractMemos(tx);

  if (tx.feePayer === pool) {
    const out = [];
    const outs = nt.filter((x) => x && x.fromUserAccount === pool && x.toUserAccount && x.toUserAccount !== pool).map((x) => ({ to: x.toUserAccount, lamports: toLamports(x.amount) }));
    for (const text of memos) {
      const tag = parseHeraldMemo(text);
      if (!tag || tag.kind === 'submit') continue;
      const rec = { ...base, ...tag };
      if (tag.kind === 'pay') {
        // One SystemProgram.transfer per id, in memo order. If the counts don't line up, amounts are unknown.
        const total = outs.reduce((a, x) => a + x.lamports, 0n);
        rec.total = total;
        rec.items = tag.ids.map((id, i) => (outs.length === tag.ids.length ? { tweetId: id, wallet: outs[i].to, lamports: outs[i].lamports } : { tweetId: id, wallet: null, lamports: null }));
      } else if (tag.kind === 'buyback') {
        let raw = null;
        let ui = 0;
        if (mint) {
          for (const x of tt) {
            if (!x || x.mint !== mint || x.toUserAccount !== pool || x.fromUserAccount === pool) continue;
            ui += num(x.tokenAmount) || 0;
            if (x.rawTokenAmount && /^\d+$/.test(String(x.rawTokenAmount.tokenAmount))) raw = (raw || 0n) + BigInt(x.rawTokenAmount.tokenAmount);
          }
        }
        rec.receivedRaw = raw;
        rec.receivedUi = mint ? ui : null;
      }
      out.push(rec);
    }
    return out;
  }

  let fromPayer = 0n;
  let inbound = 0n;
  for (const x of nt) {
    if (!x || x.toUserAccount !== pool || x.fromUserAccount === pool) continue;
    const l = toLamports(x.amount);
    inbound += l;
    if (x.fromUserAccount === tx.feePayer) fromPayer += l;
  }
  for (const x of tt) if (x && x.mint === SOL_MINT && x.toUserAccount === pool && x.fromUserAccount !== pool) inbound += uiSolToLamports(x.tokenAmount);
  if (isAddress(tx.feePayer) && fromPayer >= SUBMIT_LAMPORTS) {
    for (const text of memos) {
      const tag = parseHeraldMemo(text);
      if (tag && tag.kind === 'submit') return [{ ...base, kind: 'submit', tweetId: tag.tweetId, wallet: tx.feePayer, lamports: fromPayer }];
    }
  }
  if (inbound > FEE_DUST_LAMPORTS) return [{ ...base, kind: 'fee', lamports: inbound }];
  return [];
}

// Records oldest first (Helius pages are newest first), deduped by signature.
export function poolRecords(txs, pool, mint) {
  const seen = new Set();
  const out = [];
  let i = 0;
  for (const tx of txs || []) {
    if (!tx || seen.has(tx.signature)) continue;
    seen.add(tx.signature);
    for (const r of classifyPoolTx(tx, pool, mint)) out.push({ r, i: i++ });
  }
  // newest-first input: larger i = older; stable sort by time then reverse input order
  return out.sort((a, b) => a.r.t - b.r.t || a.r.slot - b.r.slot || b.i - a.i).map((x) => x.r);
}

// Replay records (oldest first) into the HERALD ledger.
// Buyback queue: every PAY tx adds a quarter of the SOL it paid (20% of the round's spend vs 80% paid out).
export function replayPool(records, mintDecimals = null) {
  const submissions = new Map(); // tweetId -> {tweetId, wallet, sig, t}
  const scores = new Map(); // tweetId -> {score, q, why, sig, t}
  const skipped = new Map(); // tweetId -> {sig, t}
  const paid = new Map(); // tweetId -> {lamports|null, wallet, sig, t}
  let queue = 0n, buyback = 0n, burned = 0n, burnable = 0n, fees = 0n, paidTotal = 0n, subLamports = 0n;
  for (const r of records) {
    if (!r) continue;
    if (r.kind === 'submit') {
      if (!submissions.has(r.tweetId)) {
        submissions.set(r.tweetId, { tweetId: r.tweetId, wallet: r.wallet, sig: r.sig, t: r.t });
        subLamports += r.lamports;
      } else fees += r.lamports;
    } else if (r.kind === 'score') {
      if (!scores.has(r.tweetId)) scores.set(r.tweetId, { score: r.score, q: r.q, why: r.why, sig: r.sig, t: r.t });
    } else if (r.kind === 'skip') {
      for (const id of r.ids) if (!skipped.has(id) && !paid.has(id)) skipped.set(id, { sig: r.sig, t: r.t });
    } else if (r.kind === 'pay') {
      for (const it of r.items) if (!paid.has(it.tweetId)) paid.set(it.tweetId, { lamports: it.lamports, wallet: it.wallet, sig: r.sig, t: r.t });
      paidTotal += r.total;
      queue += r.total / 4n;
    } else if (r.kind === 'buyback') {
      queue -= r.lamports;
      if (queue < 0n) queue = 0n;
      buyback += r.lamports;
      const got = r.receivedRaw ?? (mintDecimals !== null && r.receivedUi > 0 ? uiToRaw(r.receivedUi, mintDecimals) : 0n);
      if (got > 0n) burnable += got;
    } else if (r.kind === 'burn') {
      burned += r.amountRaw;
      burnable -= r.amountRaw;
      if (burnable < 0n) burnable = 0n;
    } else if (r.kind === 'fee') {
      fees += r.lamports;
    }
  }
  return {
    submissions, scores, skipped, paid,
    queueLamports: queue,
    burnableRaw: burnable,
    stats: {
      submissions: submissions.size, scored: scores.size, paidLamports: paidTotal, paidPosts: paid.size,
      buybackLamports: buyback, burnedRaw: burned, feesLamports: fees, submitLamports: subLamports,
    },
  };
}

// ---- FxTwitter ----
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
// "Mon Jan 01 00:00:00 +0000 2024" -> unix sec (falls back to Date.parse for other formats).
export function parseTwitterDate(s) {
  if (typeof s !== 'string') return null;
  const m = /^[A-Z][a-z]{2} ([A-Z][a-z]{2}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2}) (\d{4})$/.exec(s.trim());
  if (m && m[1] in MONTHS) {
    const off = (m[6] === '-' ? -1 : 1) * (Number(m[7]) * 3600 + Number(m[8]) * 60);
    return Math.floor(Date.UTC(Number(m[9]), MONTHS[m[1]], Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])) / 1000) - off;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

const int0 = (v) => {
  const n = num(v);
  return n !== null && n >= 0 ? Math.floor(n) : 0;
};

// FxTwitter /status/<id> JSON -> normalized tweet, {deleted:true} (code 404), or null (unusable).
export function normalizeFx(j, tweetId) {
  if (!j || typeof j !== 'object') return null;
  if (j.code === 404) return { id: tweetId, deleted: true };
  const t = j.tweet;
  if (j.code !== 200 || !t || typeof t !== 'object' || String(t.id) !== String(tweetId)) return null;
  const a = t.author;
  const created = num(t.created_timestamp);
  if (!a || typeof a !== 'object' || typeof a.screen_name !== 'string' || created === null) return null;
  const views = num(t.views);
  return {
    id: String(t.id),
    url: typeof t.url === 'string' && /^https:\/\//.test(t.url) ? t.url : `https://x.com/${a.screen_name}/status/${t.id}`,
    text: typeof t.text === 'string' ? t.text : '',
    created_timestamp: Math.floor(created),
    likes: int0(t.likes),
    retweets: int0(t.retweets),
    replies: int0(t.replies),
    views: views === null || views < 0 ? null : Math.floor(views),
    author: {
      screen_name: a.screen_name,
      name: typeof a.name === 'string' ? a.name : a.screen_name,
      followers: int0(a.followers),
      joined: typeof a.joined === 'string' ? a.joined : null,
      joinedTs: parseTwitterDate(a.joined),
      avatar_url: typeof a.avatar_url === 'string' && /^https:\/\//.test(a.avatar_url) ? a.avatar_url : null,
    },
  };
}

// ---- eligibility ----
const CASHTAG_RE = /\$herald(?![A-Za-z0-9_])/i;

// Hard checks of one post for one wallet submitted at submitT (unix sec). Order is fixed.
// wallet null -> the code check passes only if the text carries some h- code (can't match it yet).
export function hardChecks(tw, wallet, submitT) {
  const code = walletCode(wallet);
  const text = tw.text || '';
  const age = tw.author.joinedTs === null ? null : tw.created_timestamp - tw.author.joinedTs;
  return [
    { key: 'cashtag', pass: CASHTAG_RE.test(text), label: 'Mentions $HERALD' },
    code
      ? { key: 'code', pass: text.includes(code), label: `Contains your wallet code ${code}` }
      : { key: 'code', pass: /(^|[^A-Za-z0-9])h-[1-9A-HJ-NP-Za-km-z]{6}/.test(text), label: 'Contains a wallet code h-XXXXXX (add your wallet to match it)' },
    { key: 'followers', pass: tw.author.followers >= MIN_FOLLOWERS, label: `Author has ${MIN_FOLLOWERS}+ followers` },
    { key: 'age', pass: age !== null && age >= MIN_ACCOUNT_AGE_SEC, label: 'Account at least 30 days old' },
    { key: 'fresh', pass: submitT - tw.created_timestamp <= FRESH_SEC, label: 'Posted within 48 h of submitting' },
  ];
}

const REASONS = {
  cashtag: 'missing $HERALD',
  code: 'missing wallet code',
  followers: `author under ${MIN_FOLLOWERS} followers`,
  age: 'account under 30 days old',
  fresh: 'submitted more than 48 h after posting',
};
export function firstFailReason(checks) {
  const f = checks.find((c) => !c.pass);
  return f ? REASONS[f.key] : null;
}

export const utcDay = (t) => Math.floor(t / 86400);

// Normalized text for duplicate detection: lowercase, no urls/mentions/wallet codes/punctuation.
export function normText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@[a-z0-9_]+/g, ' ')
    .replace(/(^|[^a-z0-9])h-[1-9a-z]{6}/g, ' ')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}$]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// tweets: [{id, text, created_timestamp}] -> Set of ids whose normalized text matches an earlier post.
export function dupeLosers(tweets) {
  const firstBy = new Map();
  const sorted = [...tweets].filter((x) => x && x.id && typeof x.text === 'string').sort((a, b) => a.created_timestamp - b.created_timestamp || (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const losers = new Set();
  for (const tw of sorted) {
    const k = normText(tw.text);
    if (!k) continue;
    if (firstBy.has(k) && firstBy.get(k) !== tw.id) losers.add(tw.id);
    else firstBy.set(k, tw.id);
  }
  return losers;
}

// Status of every submission.
//  subs: [{tweetId, wallet, t}] (any order); tweets: Map id -> normalized | {deleted} | absent; scored: Set of ids with SCORE.
//  -> Map id -> {state: 'scored'|'rejected'|'waiting'|'due'|'unknown', reason, scoreAt}
// Daily caps (per author and per wallet, per UTC day of the post): scored posts take slots first, then
// eligible unscored posts in submission order.
export function assessSubmissions(subs, tweets, scored, now) {
  const out = new Map();
  const ordered = [...subs].sort((a, b) => a.t - b.t || (a.tweetId < b.tweetId ? -1 : 1));
  const used = new Map();
  const keys = (s, tw) => [`a:${tw.author.screen_name.toLowerCase()}:${utcDay(tw.created_timestamp)}`, `w:${s.wallet}:${utcDay(tw.created_timestamp)}`];
  for (const s of ordered) {
    const tw = tweets.get(s.tweetId);
    if (!scored.has(s.tweetId) || !tw || tw.deleted) continue;
    for (const k of keys(s, tw)) used.set(k, (used.get(k) || 0) + 1);
  }
  for (const s of ordered) {
    const tw = tweets.get(s.tweetId);
    const scoreAt = tw && !tw.deleted ? tw.created_timestamp + SCORE_DELAY_SEC : null;
    if (scored.has(s.tweetId)) {
      out.set(s.tweetId, { state: 'scored', reason: null, scoreAt });
      continue;
    }
    if (!tw) {
      out.set(s.tweetId, { state: 'unknown', reason: null, scoreAt: null });
      continue;
    }
    if (tw.deleted) {
      out.set(s.tweetId, { state: 'rejected', reason: 'post deleted', scoreAt: null });
      continue;
    }
    const reason = firstFailReason(hardChecks(tw, s.wallet, s.t));
    if (reason) {
      out.set(s.tweetId, { state: 'rejected', reason, scoreAt });
      continue;
    }
    const ks = keys(s, tw);
    if (ks.some((k) => (used.get(k) || 0) >= DAILY_CAP)) {
      out.set(s.tweetId, { state: 'rejected', reason: `daily limit (${DAILY_CAP} per author and per wallet)`, scoreAt });
      continue;
    }
    for (const k of ks) used.set(k, (used.get(k) || 0) + 1);
    out.set(s.tweetId, { state: now >= scoreAt ? 'due' : 'waiting', reason: null, scoreAt });
  }
  return out;
}

// ---- scoring & payouts ----
export function baseScore(tw) {
  return (tw.views === null ? 0 : tw.views / 1000) + tw.likes + 2 * tw.retweets + tw.replies;
}
export const finalScore = (base, q) => Math.round(base * q * 100) / 100;

// Payout budget for one tick from POOL's native balance and the unspent buyback queue.
export function payoutBudget(balanceLamports, queueLamports) {
  const avail = BigInt(balanceLamports) - RESERVE_LAMPORTS - BigInt(queueLamports);
  if (avail <= 0n) return 0n;
  const b = (avail * BUDGET_BPS) / 10_000n;
  return b > BUDGET_CAP_LAMPORTS ? BUDGET_CAP_LAMPORTS : b;
}
export const payPoolOf = (budget) => (BigInt(budget) * (10_000n - BUYBACK_BPS)) / 10_000n;

// posts: [{tweetId, wallet, score}] scored and not yet paid/skipped.
// -> {budget, payPool, payouts:[{tweetId, wallet, lamports}], skipped:[tweetId], deferred:boolean}
export function planPayouts(posts, balanceLamports, queueLamports) {
  const budget = payoutBudget(balanceLamports, queueLamports);
  const payPool = payPoolOf(budget);
  if (!posts.length) return { budget, payPool, payouts: [], skipped: [], deferred: false };
  if (payPool < MIN_ROUND_LAMPORTS) return { budget, payPool, payouts: [], skipped: [], deferred: true };
  const cents = (s) => BigInt(Math.max(0, Math.round(Number(s) * 100)));
  const total = posts.reduce((a, p) => a + cents(p.score), 0n);
  const payouts = [];
  const skipped = [];
  for (const p of posts) {
    let l = total > 0n ? (payPool * cents(p.score)) / total : 0n;
    if (l > PAYOUT_CAP_LAMPORTS) l = PAYOUT_CAP_LAMPORTS;
    if (l < PAYOUT_MIN_LAMPORTS) skipped.push(p.tweetId);
    else payouts.push({ tweetId: p.tweetId, wallet: p.wallet, lamports: l });
  }
  return { budget, payPool, payouts, skipped, deferred: false };
}
// ==== HERALD RULES END ====

// ==== API HELPERS (Vercel functions only) ====

const HELIUS_TX_BASE = 'https://api-mainnet.helius-rpc.com/v0/addresses';
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/';
const HELIUS_HOST = 'api-mainnet.helius-rpc.com';
const RPC_HOST = 'mainnet.helius-rpc.com';
const FX_HOST = 'api.fxtwitter.com';
const MAX_HISTORY_PAGES = 6;
export const HISTORY_SEC = 4 * 86400;
export const TWEET_TTL_MS = 10 * 60 * 1000;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export class UpstreamError extends Error {
  constructor(host, detail) {
    super(`${host}: ${detail}`);
    this.host = host;
    this.detail = detail;
  }
}

export const nowSec = () => Math.floor(Date.now() / 1000);

const scrub = (s) => String(s).replace(/api-key=[^&\s"']+/gi, 'api-key=***');

// ---- tiny TTL cache (module scope, survives warm invocations) ----
class TTLCache {
  constructor(max) {
    this.max = max;
    this.m = new Map();
  }
  get(k) {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (e.exp < Date.now()) {
      this.m.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k, v, ttlMs) {
    if (!this.m.has(k) && this.m.size >= this.max) this.m.delete(this.m.keys().next().value);
    this.m.set(k, { v, exp: Date.now() + ttlMs });
    return v;
  }
  clear() {
    this.m.clear();
  }
}
const cache = new TTLCache(500);
const inflight = new Map();
// Tweets: id -> {v, at}. Entries older than the TTL are still served when the fresh-fetch budget is spent.
const tweetCache = new Map();
const TWEET_CACHE_MAX = 4000;
export const _clearCache = () => {
  cache.clear();
  tweetCache.clear();
};

async function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try {
      const v = await loader();
      if (ttlMs > 0) cache.set(key, v, ttlMs);
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function getJson(url, { method = 'GET', headers = {}, body, timeoutMs = 8000 } = {}) {
  const host = new URL(url).host;
  let r;
  try {
    r = await fetch(url, { method, headers: { Accept: 'application/json', ...headers }, body, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw new UpstreamError(host, e && e.name === 'TimeoutError' ? 'timeout' : 'network error');
  }
  if (!r.ok) throw new UpstreamError(host, `status ${r.status}`);
  try {
    return await r.json();
  } catch {
    throw new UpstreamError(host, 'invalid json');
  }
}

// ---- responses ----
export function send(res, status, body, sMaxAge) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', sMaxAge > 0 ? `s-maxage=${sMaxAge}, stale-while-revalidate=${2 * sMaxAge}` : 'no-store');
  res.end(JSON.stringify(body));
}

export function route(fn) {
  return async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return send(res, 405, { error: 'method not allowed' }, 0);
    }
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      await fn(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message }, 0);
      console.error(scrub(e && e.stack ? e.stack : e));
      if (e instanceof UpstreamError) return send(res, 502, { error: `upstream unavailable (${e.host})` }, 0);
      return send(res, 500, { error: 'internal error' }, 0);
    }
  };
}

export const logSoft = (what, e) => console.error(`${what}: ${scrub(e && e.message ? e.message : e)}`);

// ---- config ----
// null when POOL_WALLET is unset; throws 500 on a broken config.
export function poolConfig() {
  const address = (process.env.POOL_WALLET || '').trim();
  const mint = (process.env.HERALD_MINT || '').trim();
  if (mint && !isAddress(mint)) throw new HttpError(500, 'server misconfigured');
  if (!address) return null;
  const key = (process.env.HELIUS_API_KEY || '').trim();
  if (!isAddress(address) || !key) throw new HttpError(500, 'server misconfigured');
  return { address, key, mint: mint || null };
}
export function heliusKey() {
  const key = (process.env.HELIUS_API_KEY || '').trim();
  if (!key) throw new HttpError(500, 'server misconfigured');
  return key;
}

// ---- Helius ----
// POOL txs newest first: up to 6 pages of 100, stopping once older than the 4-day window.
export function fetchPoolTxs(cfg) {
  return cached(`helius:${cfg.address}`, 10_000, async () => {
    const cutoff = nowSec() - HISTORY_SEC;
    const txs = [];
    let before = null;
    let pagesRead = 0;
    for (let guard = 0; guard < MAX_HISTORY_PAGES * 2 && pagesRead < MAX_HISTORY_PAGES; guard++) {
      const q = new URLSearchParams({ 'api-key': cfg.key, limit: '100' });
      if (before) q.set('before', before);
      let r;
      try {
        r = await fetch(`${HELIUS_TX_BASE}/${cfg.address}/transactions?${q}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(9000) });
      } catch (e) {
        throw new UpstreamError(HELIUS_HOST, e && e.name === 'TimeoutError' ? 'timeout' : 'network error');
      }
      let j = null;
      try {
        j = await r.json();
      } catch {
        j = null;
      }
      if (!r.ok || !Array.isArray(j)) {
        // "Failed to find events within the search period... set to <sig>" -> continue from there
        const msg = j && typeof j.error === 'string' ? j.error : '';
        const m = /set to ([1-9A-HJ-NP-Za-km-z]{64,90})/.exec(msg);
        if (m) {
          before = m[1];
          continue;
        }
        throw new UpstreamError(HELIUS_HOST, `status ${r.status}`);
      }
      pagesRead++;
      if (j.length === 0) break;
      let old = false;
      for (const tx of j) {
        if (!tx || typeof tx.signature !== 'string') continue;
        if (tx.timestamp < cutoff) old = true;
        else txs.push(tx);
      }
      const last = j[j.length - 1];
      if (old || !last || typeof last.signature !== 'string' || last.signature === before) break;
      before = last.signature;
    }
    return { txs };
  });
}

export async function rpc(key, method, params) {
  const j = await getJson(`${HELIUS_RPC}?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!j || j.error || !j.result) throw new UpstreamError(RPC_HOST, j && j.error ? `rpc error ${j.error.code}` : 'unexpected shape');
  return j.result;
}

export function getPoolLamports(cfg) {
  return cached(`bal:${cfg.address}`, 10_000, async () => {
    const r = await rpc(cfg.key, 'getBalance', [cfg.address, { commitment: 'confirmed' }]);
    if (!Number.isSafeInteger(r.value)) throw new UpstreamError(RPC_HOST, 'unexpected shape');
    return BigInt(r.value);
  });
}

// ---- FxTwitter ----
// Cached tweet (normalized or {deleted}) regardless of age, without fetching.
export function peekTweet(id) {
  const e = tweetCache.get(id);
  return e ? e.v : undefined;
}

async function fetchTweet(id) {
  let r;
  try {
    r = await fetch(FX_BASE + id, { headers: { Accept: 'application/json', 'User-Agent': 'herald-board/1.0' }, signal: AbortSignal.timeout(6000) });
  } catch (e) {
    throw new UpstreamError(FX_HOST, e && e.name === 'TimeoutError' ? 'timeout' : 'network error');
  }
  let j = null;
  try {
    j = await r.json();
  } catch {
    j = null;
  }
  if (r.status === 404 || (j && j.code === 404)) return { id, deleted: true };
  if (!r.ok) throw new UpstreamError(FX_HOST, `status ${r.status}`);
  const tw = normalizeFx(j, id);
  if (!tw) throw new UpstreamError(FX_HOST, 'unexpected shape');
  return tw;
}

// Tweet by id. Fresh entries (younger than maxAgeMs) come from cache; otherwise a fetch is made while
// budget.left > 0, else the stale entry (or undefined) is returned. Fetch errors throw only if strict.
export async function getTweet(id, { budget = { left: 1 }, maxAgeMs = TWEET_TTL_MS, strict = false } = {}) {
  const e = tweetCache.get(id);
  if (e && Date.now() - e.at < maxAgeMs) return e.v;
  if (budget.left <= 0) return e ? e.v : undefined;
  budget.left--;
  const key = `fx:${id}`;
  let p = inflight.get(key);
  if (!p) {
    p = fetchTweet(id).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  try {
    const v = await p;
    if (!tweetCache.has(id) && tweetCache.size >= TWEET_CACHE_MAX) tweetCache.delete(tweetCache.keys().next().value);
    tweetCache.set(id, { v, at: Date.now() });
    return v;
  } catch (err) {
    if (strict) throw err;
    logSoft(`fxtwitter ${id}`, err);
    return e ? e.v : undefined;
  }
}

export const sol = (l) => (l === null || l === undefined ? null : lamportsToSol(l));
export const round = (v, d = 6) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
