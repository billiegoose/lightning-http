const express = require('express')
const chalk = require('chalk')

const sleep = ms => new Promise(r => setTimeout(r, ms))

const app = express();
app.use(express.json())
// app.use(express.static('public'))
app.post('/form', (req, res) => {
  console.log(req.body)
  res.json({"my":"thanks"})
})
app.get('/hello.html', async (req, res) => {
  res.type('html')
  res.status(200)
  res.write('<html><body><h1>')
  await sleep(1000)
  res.write('Hello world!')
  await sleep(1000)
  res.write('</h1></body></html>')
  res.end()
})
app.listen(8081)
