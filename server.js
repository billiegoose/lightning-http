const chalk = require('chalk')

const http = require('./net')

const handle = http.handle(
  { port: 8081 }, 
  async ({ path, method, headers, body }) => {
    console.log({ path, method, headers, body })
  
    const rbody = async function * () {
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
        'Content-Type': 'text/html',
      },
      body: rbody()
      // : [
      //   '<html><body><h1>\n',
      //   '\tHello world!\n',
      //   '</h1></body></html>\n'
      // ]
    }
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
