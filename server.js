const fs = require('fs')

const chalk = require('chalk')

const http = require('./net')

const bodies = {
  '/hello.html': {
    GET () {
      return {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {
          'Connection': 'close',
          'Content-Type': 'text/html',
        },
        body: [
          '<html><body><h1>\n',
          '\tHello world!\n',
          '</h1></body></html>\n'
        ]
      }
    }
  },
  '/favicon.ico': {
    GET () {
      return {
        statusCode: 404,
        statusMessage: 'Not found',
        headers: {
          'Connection': 'close',
        },
      }
    }
  },
  '/uppercase': {
    POST (body) {
      const rBody = async function * () {
        for await (const chunk of body) {
          if (chunk) {
            process.stdout.write(chalk.red(chunk.toString('utf8')))
            yield chunk.toString('utf8').toUpperCase()
          }
        } 
      }

      return {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {
          'Connection': 'close',
          'Content-Type': 'text/plain',
        },
        body: rBody()
      }
    }
  }
}

const handle = http.handle(
  { port: 8081 }, 
  async ({ path, method, headers, body }) => {
    console.log({ path, method, headers, body })

    return bodies[path][method](body)
  },
  (err) => {
    console.log(err)
    handle.dispose()
  }
)

process.on('SIGINT', () => {
  console.log(chalk.gray('---SHUTTING DOWN GRACEFULLY---'));
  handle.dispose()
})
