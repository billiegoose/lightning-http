Goal: Recreate an "Express" like framework using only:
1. the "http.request" API described here: https://isomorphic-git.org/docs/en/http#implementing-your-own-http-client
2. the Node "net" module

Rationale: This closely approximates what would be required to do git HTTP requests over a pure WebRTC stream

# Usage

1. start the server: `npm start`
2. in another terminal, run `node client.js`

The HTTP server should echo the response, but capitalized.

A streaming parser means the data can be chopped arbitrarily in the transport layer.

A high-level async iterable API is exposed that is converted seamlessly to HTTP/1.1 chunked transfer-encoding to provide streaming control at the application layer.
