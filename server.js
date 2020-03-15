const fs = require('fs')

const chalk = require('chalk')
const { encode } = require('isomorphic-textencoder')

const http = require('./net')
const Express = require('./lightning-express')

const app = new Express()
console.log(app)

app.get('/hello.html', () => ({
  statusCode: 200,
  statusMessage: 'OK',
  headers: {
    'Connection': 'close',
    'Content-Type': 'text/html',
  },
  body: [
    encode('<html><body><h1>\n'),
    encode('\tHello world!\n'),
    encode('</h1></body></html>\n')
  ]
}))

app.get('/favicon.ico', () => ({
  statusCode: 200,
  statusMessage: 'OK',
  headers: {
    'Connection': 'close',
    'Content-Type': 'image/x-icon',
  },
  body: fs.createReadStream('./public/favicon.ico')
}))

app.post('/uppercase', ({ body }) => {
  const rBody = async function * () {
    for await (const chunk of body) {
      if (chunk) {
        process.stdout.write(chalk.red(chunk.toString('utf8')))
        yield encode(chunk.toString('utf8').toUpperCase())
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
})

app.get('/hello/:user', ({ params }) => ({
  statusCode: 200,
  statusMessage: 'OK',
  headers: {
    'Connection': 'close',
    'Content-Type': 'text/plain',
  },
  body: [encode(`Hello, ${params.user}!`)]
}))

const handle = http.handle(
  { port: 8081 },
  app.handle,
  (err) => {
    console.log(err)
    handle.dispose()
  }
)

process.on('SIGINT', () => {
  console.log(chalk.gray('---SHUTTING DOWN GRACEFULLY---'));
  handle.dispose()
})
