const net = require('net')
const chalk = require('chalk')

const sleep = ms => new Promise(r => setTimeout(r, ms))

const Queue = require('./Queue.js')

const { ParserStates, HttpRequestParser } = require('./HttpParser.js')
const { HttpResponseCoder } = require('./HttpCoder.js')

const callback = async ({ path, method, headers, body }) => {
  console.log({ path, method, headers })

  const rbody = async function * () {
    for await (const chunk of body) {
      if (chunk) {
        process.stdout.write(chalk.red(chunk.toString('utf8')))
        yield chunk.toString('utf8').toUpperCase()
      }
    } 
  }

  // for await (const chunk of body) {
  //   if (chunk) {
  //     process.stdout.write(chalk.red(chunk.toString('utf8')))
  //   }
  // }
  return {
    statusCode: 200,
    statusMessage: 'OK',
    headers: {
      'Connection': 'close',
      'Content-Type': 'text/html',
    },
    body: rbody()
    // : [
    //   '<html><body><h1>\n',
    //   '\tHello world!\n',
    //   '</h1></body></html>\n'
    // ]
  }
}

const server = net.createServer(async c => {
  console.log(chalk.gray('---CLIENT CONNECTED---'))
  c.on('end', () => {
    console.log(chalk.gray('---CLIENT DISCONNECTED---'));
  });

  const writeIt = (it) => {
    process.stdout.write(it)
    c.write(it)
  }

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
      writeIt(res.read())

      if (!fixed) {
        for await (const piece of body) {
          // await sleep(1000)
          res.push(piece)
          writeIt(res.read())
        }
        res.end()
        writeIt(res.read())
      }
      c.end()
    }
  });

});

server.on('error', (err) => {
  throw err;
});

server.listen(8081, () => {
  console.log(chalk.gray('---SERVER LISTENING---'));
});


process.on('SIGINT', () => {
  console.log(chalk.gray('---SHUTTING DOWN GRACEFULLY---'));
  server.close()
})
