# URL File

Convert a `URL` to a `W3C File` like object, for consumption by other libraries. 

This is only a `File` lookalike which implements 1:1 the same functionality, but it's not compatible by any built-in browser API's which expect a `File` object. If you want that functionality use the `blob` function, however that loads all the data into memory!

The remote URL needs to be CORS enabled!

# Usage

```js
import URLFile, { fromURL } from '@thaunknown/url-file'

// if you know the exact file information
const file = new URLFile('https://avatars.githubusercontent.com/u/6506529?v=4', 195311)

// if you want to provide extra metadata ad options
import fetchPolyfill from 'node-fetch'

const file = new URLFile('https://avatars.githubusercontent.com/u/6506529?v=4', 195311, { type: 'image/jpeg', lastModifiedDate: new Date(), lastModified: Date.now(), name: 'My Image', fetch: fetchPolyfill })

// or if you want the library to do everything for you
// file.type, file.lastModifiedDate and file.size are all resolved based on response headers
// if the headers don't return content-length this will fail!
const file = await fromURL('https://avatars.githubusercontent.com/u/6506529?v=4')

// if you need a true W3C File/Blob and not a lookalike:
// this loads all data into memory, doesn't stream it!
const blob = await file.blob()

console.log(blob instanceof globalThis.Blob) // true
```

# Real-World Example

```js
import read from 'zip-go'
import { fromURL } from '@thaunknown/url-file'

for await (const entry of read(await fromURL('https://example.com/file.zip'))) {
  // from zip-go readme:
  console.log(entry)
  console.log(entry.name)
  console.log(entry.size)
  console.log(entry.type)
  console.log(entry.directory)

  const ab = await entry.arrayBuffer()
  const text = await entry.text()
  const readableStream = entry.stream()

  // returns a real web File Object, if the entry is uncompressed
  // it will just slice the zip with it's start/end position
  const file = await entry.file()
}
```

This allows you to stream the contents of a zip file using streams, from a remote URL, without loading all the data into memory!