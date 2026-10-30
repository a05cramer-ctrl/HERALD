import {
  route, send, poolConfig, fetchPoolTxs, getPoolLamports, getTweet, peekTweet, mapLimit, logSoft, nowSec,
  poolRecords, replayPool, assessSubmissions, payoutBudget, payPoolOf, sol, round,
} from './_lib.js';

const S_MAXAGE = 20;
const SHOW = 60;
const FRESH_FETCHES = 25;

const emptyStats = () => ({ submissions: 0, scored: 0, paidSol: 0, paidPosts: 0, buybackSol: 0, burnedRaw: '0', payingNextSol: null });

export default route(async (req, res) => {
  const cfg = poolConfig();
  const now = nowSec();
  if (!cfg) return send(res, 200, { pool: null, updatedAt: now, poolSol: null, stats: emptyStats(), posts: [], leaders: [] }, S_MAXAGE);

  const [hist, lamports] = await Promise.all([
    fetchPoolTxs(cfg),
    getPoolLamports(cfg).catch((e) => (logSoft('balance', e), null)),
  ]);
  const L = replayPool(poolRecords(hist.txs, cfg.address, cfg.mint));
  const subs = [...L.submissions.values()].sort((a, b) => b.t - a.t || (a.tweetId < b.tweetId ? 1 : -1));
  const shown = subs.slice(0, SHOW);
  const shownIds = new Set(shown.map((s) => s.tweetId));
  const paidElsewhere = [...L.paid.keys()].filter((id) => !shownIds.has(id));

  // Fresh FxTwitter fetches for the shown posts first, then paid posts (leaderboard), ≤25 per request.
  const budget = { left: FRESH_FETCHES };
  const want = [...shown.map((s) => s.tweetId), ...paidElsewhere];
  const tweets = new Map();
  const got = await mapLimit(want, 5, (id) => getTweet(id, { budget }));
  want.forEach((id, i) => got[i] && tweets.set(id, got[i]));
  for (const s of subs) if (!tweets.has(s.tweetId) && peekTweet(s.tweetId)) tweets.set(s.tweetId, peekTweet(s.tweetId));

  const scored = new Set([...L.scores.keys(), ...L.paid.keys()]);
  const assessed = assessSubmissions(subs, tweets, scored, now);

  const posts = shown.map((s) => {
    const tw = tweets.get(s.tweetId);
    const live = tw && !tw.deleted ? tw : null;
    const a = assessed.get(s.tweetId);
    const sc = L.scores.get(s.tweetId) || null;
    const pd = L.paid.get(s.tweetId) || null;
    let status;
    let reason = null;
    if (pd) status = 'paid';
    else if (sc) {
      status = 'scored';
      if (L.skipped.has(s.tweetId)) reason = 'unpaid: too small';
    } else if (a.state === 'rejected') {
      status = 'rejected';
      reason = a.reason;
    } else if (a.state === 'waiting') status = 'scoring_at';
    else status = 'pending';
    return {
      tweetId: s.tweetId,
      url: live ? live.url : `https://x.com/i/status/${s.tweetId}`,
      wallet: s.wallet,
      submittedAt: s.t,
      status,
      scoreAt: a.scoreAt,
      score: sc ? sc.score : null,
      q: sc ? sc.q : null,
      why: sc && sc.why ? sc.why : null,
      paidSol: pd && pd.lamports !== null ? round(sol(pd.lamports)) : null,
      paySig: pd ? pd.sig : null,
      author: live ? { screen_name: live.author.screen_name, name: live.author.name, avatar_url: live.author.avatar_url, followers: live.author.followers } : null,
      text: live ? live.text : null,
      metrics: live ? { views: live.views, likes: live.likes, retweets: live.retweets, replies: live.replies } : { views: null, likes: null, retweets: null, replies: null },
      reason,
    };
  });

  const byAuthor = new Map();
  for (const [id, pd] of L.paid) {
    const tw = tweets.get(id);
    if (!tw || tw.deleted) continue;
    const k = tw.author.screen_name.toLowerCase();
    const cur = byAuthor.get(k) || { screen_name: tw.author.screen_name, avatar_url: tw.author.avatar_url, posts: 0, lamports: 0n };
    cur.posts++;
    if (pd.lamports !== null) cur.lamports += pd.lamports;
    byAuthor.set(k, cur);
  }
  const leaders = [...byAuthor.values()]
    .sort((a, b) => (b.lamports > a.lamports ? 1 : b.lamports < a.lamports ? -1 : b.posts - a.posts))
    .slice(0, 10)
    .map((x) => ({ screen_name: x.screen_name, avatar_url: x.avatar_url, posts: x.posts, paidSol: round(sol(x.lamports)) }));

  const st = L.stats;
  send(res, 200, {
    pool: cfg.address,
    updatedAt: now,
    poolSol: lamports === null ? null : round(sol(lamports)),
    stats: {
      submissions: st.submissions,
      scored: st.scored,
      paidSol: round(sol(st.paidLamports)),
      paidPosts: st.paidPosts,
      buybackSol: round(sol(st.buybackLamports)),
      burnedRaw: st.burnedRaw.toString(),
      payingNextSol: lamports === null ? null : round(sol(payPoolOf(payoutBudget(lamports, L.queueLamports)))),
    },
    posts,
    leaders,
  }, S_MAXAGE);
});
