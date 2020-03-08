const net = require('net')
const chalk = require('chalk')

const sleep = ms => new Promise(r => setTimeout(r, ms))

const Deferable = require('./Deferable.js')
const Queue = require('./Queue.js')

const { ParserStates, HttpResponseParser } = require('./HttpParser.js')
const { HttpRequestCoder } = require('./HttpCoder.js')

/**
 * @typedef {Object} GitHttpResponse
 * @property {string} url - The final URL that was fetched after any redirects
 * @property {string} [method] - The HTTP method that was used
 * @property {Object<string, string>} [headers] - HTTP response headers
 * @property {AsyncIterableIterator<Uint8Array>} [body] - An async iterator of Uint8Arrays that make up the body of the response
 * @property {number} statusCode - The HTTP status code
 * @property {string} statusMessage - The HTTP status message
 */

/**
 * @typedef {Object} GitHttpRequest
 * @property {string} url - The URL to request
 * @property {string} [method='GET'] - The HTTP method to use
 * @property {Object<string, string>} [headers={}] - Headers to include in the HTTP request
 * @property {AsyncIterableIterator<Uint8Array>} [body] - An async iterator of Uint8Arrays that make up the body of POST requests
 * @property {ProgressCallback} [onProgress] - Reserved for future use (emitting `GitProgressEvent`s)
 * @property {object} [signal] - Reserved for future use (canceling a request)
 */

/**
 * 
 * @param {GitHttpRequest} param0 
 */
function request({ url, method, headers, body }) {
  const u = new URL(url)
  const c = net.createConnection({ port: u.port }, async () => {
    const writeIt = (it) => {
      process.stdout.write(it)
      c.write(it)
    }

    let fixed = Array.isArray(body) && body.length === 1

    let req = new HttpRequestCoder(url, method, headers, fixed ? body[0] : void 0)
    writeIt(req.read())
    if (!fixed) {
      for await (const piece of body) {
        await sleep(1000)
        req.push(piece)
        writeIt(req.read())
      }
      req.end()
      writeIt(req.read())
    }
  });

  let response = new HttpResponseParser()
  const rbody = new Queue()
  let res = new Deferable()

  c.on('data', (chunk) => {
    rbody.push(...response.push(chunk))
    
    if (response.state > ParserStates.HEADERS) {
      res.resolve({
        url,
        method,
        headers: response.headers,
        body: rbody,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
      })
    }
    if (response.state === ParserStates.FIN) c.end()
  });

  c.on('end', () => {
    c.end();
    console.log(chalk.gray('---DISCONNECTED FROM SERVER---'));
  });

  return res.promise
}

request({
  url: 'http://localhost:8081/form',
  method: 'POST',
  headers:  {
    'User-Agent': 'curl/7.64.1',
    'Accept': '*/*',
  },
  body: ['Hello,', ' world!']
}).then(async res => {
  console.log(res)
  for await (chunk of res.body) {
    process.stdout.write(chalk.red(chunk.toString('utf8')))
  }
})
