import { read } from 'zip-go/lib/mod.js'
import { fromURL } from './index.js'
import serve from 'serve-static'
import finalhandler from 'finalhandler'
import { createServer } from 'http'

const server = createServer((req, res) => {
  serve('./')(req, res, finalhandler(req, res))
}).listen(0)

const zip = await fromURL(`http://127.0.0.1:${server.address().port}/pile_of_poo.zip`)

for await (const entry of read(zip)) {
  console.log(entry.name)
  console.log(await entry.text())
  const x = (await entry.file()).slice(4)
  console.log(await x.text())
}
