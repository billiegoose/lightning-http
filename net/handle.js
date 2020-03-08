const net = require('net')

const Queue = require('../Queue.js')

const { ParserStates, HttpRequestParser } = require('../HttpParser.js')
const { HttpResponseCoder } = require('../HttpCoder.js')

module.exports = function (options, callback, errHandler) {

  const server = net.createServer(async c => {  
    let once = false
    let request = new HttpRequestParser()
    const rbody = new Queue()
  
    c.on('data', async (chunk) => {
      rbody.push(...request.push(chunk))
  
      if (request.state === ParserStates.FIN) {
        rbody.end()
      }
  
      if (request.state > ParserStates.HEADERS) {
        if (once) return
        once = true
        let { statusCode, statusMessage, headers, body } = await callback({ path: request.path, method: request.method, headers: request.headers, body: rbody })
  
        let fixed = Array.isArray(body) && body.length === 1
  
        const res = new HttpResponseCoder(statusCode, statusMessage, headers, fixed ? body[0] : void 0)
        c.write(res.read())
  
        if (!fixed) {
          for await (const piece of body) {
            res.push(piece)
            c.write(res.read())
          }
          res.end()
          c.write(res.read())
        }
        c.end()
      }
    });
  
  });
  
  server.listen(options.port);

  server.on('error', (err) => {
    errHandler(err)
    server.close()
  });

  return {
    dispose () {
      server.close()
    }
  }
}
