const sseService = require('../services/sse.service');

// Opens the event stream. The response is never "finished"; we keep writing to it.
function stream(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // stops nginx from buffering the stream
  });
  res.flushHeaders();

  res.write('retry: 3000\n\n'); // if the connection drops, the browser retries after 3 seconds
  sseService.addClient(req.user, res);
}

module.exports = { stream };
