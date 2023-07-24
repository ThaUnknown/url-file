import mime from 'mime/lite.js'

export default class URLFile {
  constructor (url, size, { type, lastModifiedDate, lastModified, name, fetch = globalThis.fetch, _size } = {}, { start = 0, end = size } = {}) {
    if (size == null || isNaN(size)) throw new Error('Size is required!')
    this.url = new URL(url)
    this.size = size // instance size - sliced, fake
    this._size = _size ?? size // true remote file size
    const hasExtension = this.url.pathname.lastIndexOf('.') !== -1
    this.name = name ?? hasExtension ? this.url.pathname.slice(this.url.pathname.lastIndexOf('/') + 1, this.url.pathname.lastIndexOf('.')) : this.url.pathname.slice(this.url.pathname.lastIndexOf('/') + 1)
    this.type = type ?? hasExtension ? mime.getType(this.name) : ''
    this.lastModifiedDate = lastModifiedDate
    this.lastModified = lastModified
    this.start = start // inclusive
    this.end = Math.min(end, size) // non-inclusive
    this.fetch = fetch
  }

  _get () {
    return this.fetch(this.url, {
      headers: {
        range: `bytes=${this.start}-${this.end - 1}/${this._size}`, // -1 as end is non-inclusive, and http requires inclusive
        'Content-Range': `bytes ${this.start}-${this.end - 1}/${this._size}`,
        'Content-Length': `${this.end - this.start}`,
        'Cache-Control': 'no-store' // try forcing backpressure
      }
    })
  }

  /**
   * @param  {Number} start slice start position, inclusive
   * @param  {Number} end=this.size slice end position, non-inclusive, W3C slice's end is non-inclusive, but HTTP's and Node's ends are inclusive, be careful!!!
   */
  slice (start, end = this.size) {
    if (start == null || this.size === 0) return this
    if (end === 0) return new URLFile(this.url, 0, this)

    const safeEnd = Math.min(this.size, end)
    const safeStart = Math.min(start, safeEnd)

    const newSize = safeEnd - safeStart

    if (newSize === 0) return new URLFile(this.url, 0, this)

    if (newSize === this.size) return this

    return new URLFile(this.url, newSize, this, { start: this.start + safeStart, end: this.start + safeEnd })
  }

  async stream () {
    if (this.size === 0) return new ReadableStream()
    const { body } = await this._get()
    return body
  }

  async text () {
    if (this.size === 0) return ''
    const { text } = await this._get()
    return await text()
  }

  async arrayBuffer () {
    if (this.size === 0) return new ArrayBuffer()
    const { arrayBuffer } = await this._get()
    return await arrayBuffer()
  }

  async blob () {
    if (this.size === 0) return new Blob([], { type: this.type })
    const { blob } = await this._get()
    return await blob()
  }
}
/**
 * @param  {String} url
 */
export async function fromURL (url) {
  const { headers } = await fetch(url, { method: 'HEAD' })
  const lastModifiedDate = Date.parse(headers.get('last-modified')) || new Date()
  return new URLFile(url, Number(headers.get('content-length')), { type: headers.get('content-type'), lastModifiedDate, lastModified: +lastModifiedDate })
}
