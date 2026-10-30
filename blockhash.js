import { route, send, heliusKey, rpc, UpstreamError } from './_lib.js';

export default route(async (req, res) => {
  const r = await rpc(heliusKey(), 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
  const v = r && r.value;
  if (!v || typeof v.blockhash !== 'string' || !Number.isSafeInteger(v.lastValidBlockHeight)) throw new UpstreamError('mainnet.helius-rpc.com', 'unexpected shape');
  send(res, 200, { blockhash: v.blockhash, lastValidBlockHeight: v.lastValidBlockHeight }, 0);
});
