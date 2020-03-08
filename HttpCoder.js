/**
 * 
 * @param {GitHttpRequest} req 
 */
function writeRequestHead (u, method = 'GET') {
  return `${method.toUpperCase()} ${u.pathname}${u.search}${u.hash} HTTP/1.1\r
Host: ${u.host}\r
`
}

/**
 * 
 * @param {number} statusCode
 * @param {string} statusMessage
 */
function writeResponseHead (statusCode = 200, statusMessage = 'OK') {
  return `HTTP/1.1 ${statusCode} ${statusMessage}\r
`
}

/**
 * 
 * @param {Object<string, string>} headers
 * @returns {string}
 */
function writeHeaders(headers) {
  return Object.entries(headers).reduce((acc, [key, value]) => {
    return acc + key + ': ' + value + '\r\n'
  }, '')
}

function writeChunk(chunk) {
  return `${chunk.length.toString(16).toUpperCase()}\r
${chunk}\r
`
}

function finalChunk() {
  return `0\r
`
}

class HttpResponseCoder {
  #text = ''
  constructor(statusCode, statusMessage, headers, body) {
    this.#text += writeResponseHead(statusCode, statusMessage)
    this.#text += writeHeaders({ 'Date': new Date().toUTCString() })
    this.#text += writeHeaders(headers)
    if (body) {
      this.#text += writeHeaders({
        'Content-Length': body.length
      })
    } else {
      this.#text += writeHeaders({
        'Transfer-Encoding': 'chunked'
      })
    }
    this.#text += '\r\n'
    if (body) {
      this.#text += body
    }
  }
  push (chunk) {
    this.#text += writeChunk(chunk)
  }
  end () {
    this.#text += finalChunk()
    this.#text += '\r\n'
  }
  read () {
    let text = this.#text
    this.#text = ''
    return text
  }
}

class HttpRequestCoder {
  #text = ''
  constructor(url, method, headers, body) {
    const u = new URL(url)
    this.#text += writeRequestHead(u, method)
    this.#text += writeHeaders(headers)
    if (body) {
      this.#text += writeHeaders({
        'Content-Length': body.length
      })
    } else {
      this.#text += writeHeaders({
        'Transfer-Encoding': 'chunked'
      })
    }
    this.#text += '\r\n'
    if (body) {
      this.#text += body
    }
  }
  push (chunk) {
    this.#text += writeChunk(chunk)
  }
  end () {
    this.#text += finalChunk()
    this.#text += '\r\n'
  }
  read () {
    let text = this.#text
    this.#text = ''
    return text
  }
}

module.exports = {
  HttpResponseCoder,
  HttpRequestCoder
}


