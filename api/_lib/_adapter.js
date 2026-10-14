/**
 * Universal Serverless Adapter for Vercel, Netlify, and Local Node.js
 */

'use strict';

function makeUniversalHandler(fn) {
  return async function universalHandler(reqOrEvent, resOrContext) {
    // 1. Check if invoked as Vercel / Express (req, res)
    if (resOrContext && typeof resOrContext.status === 'function') {
      const req = reqOrEvent;
      const res = resOrContext;

      const event = {
        httpMethod: req.method || 'GET',
        headers: req.headers || {},
        body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
        queryStringParameters: req.query || {},
        rawQuery: req.url && req.url.includes('?') ? req.url.split('?')[1] : ''
      };

      try {
        const result = await fn(event, {});
        if (result.headers) {
          for (const [k, v] of Object.entries(result.headers)) {
            res.setHeader(k, v);
          }
        }
        res.status(result.statusCode || 200);
        if (typeof result.body === 'string') {
          res.send(result.body);
        } else {
          res.json(result.body);
        }
      } catch (err) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
      return;
    }

    // 2. Netlify / Lambda style (event, context)
    return await fn(reqOrEvent, resOrContext || {});
  };
}

module.exports = { makeUniversalHandler };
