import { read } from 'zip-go/lib/mod.js'
import { fromURL } from './index.js'

const zip = await fromURL('https://github.com/Stuk/jszip/raw/main/test/ref/pile_of_poo.zip')

for await (const entry of read(zip)) {
  console.log(entry.name)
  console.log(await entry.text())
  const x = (await entry.file()).slice(4)
  console.log(await x.text())
}
