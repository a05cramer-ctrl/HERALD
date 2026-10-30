import {
  route, send, HttpError, poolConfig, fetchPoolTxs, getTweet, peekTweet, mapLimit, nowSec,
  poolRecords, replayPool, extractTweetId, isAddress, walletCode, hardChecks, dupeLosers,
} from './_lib.js';

const S_MAXAGE = 30;
const DUPE_FETCHES = 15;

export default route(async (req, res, url) => {
  const tweetId = extractTweetId(url.searchParams.get('url') || '');
  if (!tweetId) throw new HttpError(400, 'url must be an x.com or twitter.com post link');
  const walletParam = (url.searchParams.get('wallet') || '').trim();
  if (walletParam && !isAddress(walletParam)) throw new HttpError(400, 'wallet is not a valid Solana address');
  const wallet = walletParam || null;
  const cfg = poolConfig();
  const now = nowSec();

  const [tw, hist] = await Promise.all([
    getTweet(tweetId, { budget: { left: 1 }, maxAgeMs: 30_000, strict: true }),
    cfg ? fetchPoolTxs(cfg) : null,
  ]);
  if (!tw || tw.deleted) throw new HttpError(404, 'post not found or deleted');

  let alreadySubmitted = false;
  let dupe = false;
  if (hist) {
    const L = replayPool(poolRecords(hist.txs, cfg.address, cfg.mint));
    alreadySubmitted = L.submissions.has(tweetId);
    const others = [...L.submissions.values()].filter((s) => s.tweetId !== tweetId).sort((a, b) => b.t - a.t);
    const budget = { left: DUPE_FETCHES };
    const got = await mapLimit(others, 5, (s) => peekTweet(s.tweetId) || getTweet(s.tweetId, { budget }));
    const list = [tw, ...got.filter((x) => x && !x.deleted)];
    dupe = dupeLosers(list).has(tweetId);
  }

  const checks = hardChecks(tw, wallet, now);
  checks.push({ key: 'dupe', pass: !dupe, label: 'Original text (not a copy of an earlier submitted post)' });

  send(res, 200, {
    ok: checks.every((c) => c.pass) && !alreadySubmitted,
    tweetId,
    tweet: {
      text: tw.text,
      url: tw.url,
      created_timestamp: tw.created_timestamp,
      author: { screen_name: tw.author.screen_name, name: tw.author.name, avatar_url: tw.author.avatar_url, followers: tw.author.followers, joined: tw.author.joined },
      metrics: { views: tw.views, likes: tw.likes, retweets: tw.retweets, replies: tw.replies },
    },
    checks,
    code: walletCode(wallet),
    alreadySubmitted,
  }, S_MAXAGE);
});
