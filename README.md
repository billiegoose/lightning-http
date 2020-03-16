Goal: Recreate an "Express" like framework using only:
1. the "http.request" API described here: https://isomorphic-git.org/docs/en/http#implementing-your-own-http-client
2. the Node "net" module

Rationale: This closely approximates what would be required to do git HTTP requests over a pure WebRTC stream

# Usage

1. start the server: `npm start`
2. in another terminal, run `node client.js`

The HTTP server should echo the response, but capitalized.

3. In a browser, navigate to http://localhost:8081/hello.html

The HTTP server should serve an HTML page (represented as an array of Uint8Arrays in `server.js`), and a favicon image (represented as an async iterable stream via `fs.createReadStream` in Node.js >= 10).

4. In a browser (or with cURL or whatever) open http://localhost:8081/hello/foobar

The HTTP server should return a text/plain message 'Hello, foobar!' to demonstrate that parsing and matching against path parameters in routes works.

# About

A streaming parser means the data can be chopped arbitrarily in the transport layer.

A high-level async iterable API is exposed that is converted seamlessly to HTTP/1.1 chunked transfer-encoding to provide streaming control at the application layer.

An Express-like route registration API simplifies writing servers. Hopefully it can be quickly adapted to work over WebRTC and to work inside Service Workers.
