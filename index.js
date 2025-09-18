import mime from 'mime/lite.js'

/**
 * @class
 * @implements {File}
*/
export default class URLFile {
  /** @type {globalThis.fetch} */
  fetch
  /**
   * @param {string | URL} url
   * @param {number} size
   */
  constructor (url, size, { type, lastModifiedDate = new Date(), lastModified = 0, name = '', fetch = globalThis.fetch.bind(globalThis), _size = size, webkitRelativePath = '' } = {}, { start = 0, end = size } = {}) {
    if (size == null || isNaN(size)) throw new Error('Size is required!')
    this.url = new URL(url)
    this.size = size // instance size - sliced, fake
    this._size = _size // true remote file size
    this.webkitRelativePath = webkitRelativePath || this.url.pathname.slice(1, this.url.pathname.lastIndexOf('/'))
    const hasExtension = this.url.pathname.lastIndexOf('.') !== -1
    this.name = name || hasExtension ? this.url.pathname.slice(this.url.pathname.lastIndexOf('/') + 1, this.url.pathname.lastIndexOf('.')) : this.url.pathname.slice(this.url.pathname.lastIndexOf('/') + 1)
    this.type = type ?? hasExtension ? mime.getType(this.name) ?? '' : ''
    this.lastModifiedDate = lastModifiedDate
    this.lastModified = lastModified
    this.start = start // inclusive
    this.end = end // non-inclusive
    this.fetch = fetch
  }

  _get () {
    return this.fetch(this.url, {
      headers: {
        range: `bytes=${this.start}-${this.end - 1}`, // -1 as end is non-inclusive, and http requires inclusive
        'Content-Range': `bytes ${this.start}-${this.end - 1}/${this._size}`,
        'Cache-Control': 'no-store' // try forcing backpressure
      }
    })
  }

  /**
   * @param  {Number=} start slice start position, inclusive
   * @param  {Number=} end=this.size slice end position, non-inclusive, W3C slice's end is non-inclusive, but HTTP's and Node's ends are inclusive, be careful!!!
   * @param  {string=} contentType=this.type MIME type
   */
  slice (start = 0, end = this.size, contentType = this.type) {
    if (start == null || this.size === 0) return this
    if (end < 0) end = Math.max(this.size + end, 0)
    if (start < 0) start = Math.max(this.size + start, 0)

    if (end === 0) return new URLFile(this.url, 0, { ...this, type: contentType })

    const safeEnd = Math.min(this._size, end)
    const safeStart = Math.min(start, safeEnd)

    const newSize = safeEnd - safeStart

    if (newSize === 0) return new URLFile(this.url, 0, { ...this, type: contentType })

    if (newSize === this.size) return this

    return new URLFile(this.url, newSize, { ...this, type: contentType }, { start: this.start + safeStart, end: this.start + safeEnd })
  }

  stream () {
    if (this.size === 0) return new ReadableStream()
    const ts = new TransformStream()
    this._get().then(res => res.body?.pipeTo(ts.writable))
    return ts.readable
  }

  async text () {
    if (this.size === 0) return ''
    const res = await this._get()
    return await res.text()
  }

  async arrayBuffer () {
    if (this.size === 0) return new ArrayBuffer(0)
    const res = await this._get()
    return await res.arrayBuffer()
  }

  async blob () {
    if (this.size === 0) return new Blob([], { type: this.type ?? '' })
    const res = await this._get()
    return await res.blob()
  }

  async bytes() {
    if (this.size === 0) return new Uint8Array(0)
    return new Uint8Array(await this.arrayBuffer())
  }
}
/**
 * @param  {string | URL} url
 */
export async function fromURL (url) {
  const { headers } = await fetch(url, { method: 'HEAD' })
  if (headers.get('accept-ranges') === 'none') throw new Error('Range requests not supported by remote')
  const lastModifiedDate = new Date(headers.get('last-modified') ?? Date.now())
  return new URLFile(url, Number(headers.get('content-length')), { type: headers.get('content-type'), lastModifiedDate, lastModified: +lastModifiedDate })
}
