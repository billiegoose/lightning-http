require('../typedefs.js')

const net = require('net')

const Deferable = require('../Deferable.js')
const Queue = require('../Queue.js')
const { ParserStates, HttpResponseParser } = require('../HttpParser.js')
const { HttpRequestCoder } = require('../HttpCoder.js')

/**
 * @param {GitHttpRequest} request
 * @returns {Promise<GitHttpResponse>}
 */
function request({ url, method, headers, body }) {
  const u = new URL(url)
  const c = net.createConnection({ port: u.port }, async () => {
    let fixed = Array.isArray(body) && body.length === 1

    let req = new HttpRequestCoder(url, method, headers, fixed ? body[0] : void 0)
    c.write(req.read())
    if (!fixed) {
      for await (const piece of body) {
        req.push(piece)
        c.write(req.read())
      }
      req.end()
      c.write(req.read())
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
  });

  return res.promise
}

module.exports = request
