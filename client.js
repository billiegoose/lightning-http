const chalk = require('chalk')

const http = require('./net')

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function * makeBody () {
  await sleep(1000)
  yield 'Hello,\n'
  await sleep(1000)
  yield 'world!\n'
}

http.request({
  url: 'http://localhost:8081/form',
  method: 'POST',
  headers:  {
    'User-Agent': 'curl/7.64.1',
    'Accept': '*/*',
  },
  body: makeBody()
}).then(async res => {
  console.log(res)
  for await (chunk of res.body) {
    if (chunk) {
      process.stdout.write(chalk.red(chunk.toString('utf8')))
    }
  }
})
