const { encode } = require('isomorphic-textencoder')
const concat = require('concat-buffers')

/**
 * 
 * @param {GitHttpRequest} req 
 */
function writeRequestHead (u, method = 'GET') {
  return `${method.toUpperCase()} ${u.pathname}${u.search}${u.hash} HTTP/1.1\r\nHost: ${u.host}\r\n`
}

/**
 * 
 * @param {number} statusCode
 * @param {string} statusMessage
 */
function writeResponseHead (statusCode = 200, statusMessage = 'OK') {
  return `HTTP/1.1 ${statusCode} ${statusMessage}\r\n`
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
  return chunk ? concat(encode(`${chunk.length.toString(16).toUpperCase()}\r\n`), chunk, encode('\r\n')) : encode('0\r\n\r\n')
}

/**
 * @param {number} statusCode
 * @param {string} statusMessage
 * @param {Object<string, string>} headers
 * @param {Uint8Array} [body]
 * @returns {Uint8Array}
 */
function startResponse(statusCode, statusMessage, headers, body) {
  let wip = ''
  wip += writeResponseHead(statusCode, statusMessage)
  wip += writeHeaders({ 'Date': new Date().toUTCString() })

  return start(wip, headers, body)
}

/**
 * @param {string} url
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method
 * @param {Object<string, string>} headers
 * @param {Uint8Array} [body]
 * @returns {Uint8Array}
 */
function startRequest(url, method, headers, body) {
  let wip = ''
  const u = new URL(url)
  wip += writeRequestHead(u, method)

  return start(wip, headers, body)
}

/**
 * @param {Object<string, string>} headers
 * @param {Uint8Array} [body]
 * @returns {Uint8Array}
 */
function start(wip, headers, body) {
  wip += writeHeaders(headers)
  if (body) {
    wip += writeHeaders({
      'Content-Length': body.length
    })
  } else {
    wip += writeHeaders({
      'Transfer-Encoding': 'chunked'
    })
  }
  wip += '\r\n'
  wip = encode(wip)
  if (body) {
    wip = concat(wip, body)
  }
  return wip
}

module.exports = {
  startRequest,
  startResponse,
  writeChunk,
}
