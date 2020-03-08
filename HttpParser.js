/**
 * @enum {number}
 */
const ParserStates = {
  REQUEST: 0,
  RESPONSE: 1,
  HEADERS: 2,
  BODY: 3,
  TRAILERS: 4,
  FIN: 5,
};

/**
 * 
 * @param {Uint8Array} chunk 
 * @param {ParserStates} state 
 * @param {any} data 
 * @param {any} sticky 
 */
function parseHTTP(chunk, state = ParserStates.RESPONSE, data = {}, sticky = {}) {
  switch(state) {
    case ParserStates.REQUEST: {
      let eol = findRN(chunk)
      if (eol === -1) break
      let line = chunk.slice(0, eol).toString()
      const [ path, method ] = parseRequestHead(line)
      data.path = path
      data.method = method
      chunk = chunk.slice(eol + 2)
      data.headers = {}
      state = ParserStates.HEADERS
    }
    case ParserStates.RESPONSE: {
      if (state === ParserStates.RESPONSE) {
        let eol = findRN(chunk)
        if (eol === -1) break
        let line = chunk.slice(0, eol).toString()
        const [ statusCode, statusMessage ] = parseResponseHead(line)
        data.statusCode = statusCode
        data.statusMessage = statusMessage
        chunk = chunk.slice(eol + 2)
        data.headers = {}
        state = ParserStates.HEADERS
      }
    }
    case ParserStates.HEADERS: {
      if (state === ParserStates.HEADERS) {
        let eol
        while ((eol = findRN(chunk)) > -1) {
          if (eol === 0) {
            chunk = chunk.slice(2)
            data.body = []
            state = ParserStates.BODY
            break
          }
          let line = chunk.slice(0, eol).toString()
          const [ key, value ] = parseHeader(line)
          data.headers[key] = value

          let lkey = key.toLowerCase()
          if (lkey === 'transfer-encoding' && value.toLowerCase() === 'chunked') {
            sticky.chunked = true
            sticky.lengthRemaining = 0
            sticky.discardBytes = 0
          }
          if (lkey === 'content-length') {
            let n = parseInt(value)
            if (Number.isNaN(n)) throw new Error(`Invalid Content-Length: ${value}`)
            if (!sticky.chunked) sticky.lengthRemaining = n
          }

          chunk = chunk.slice(eol + 2)
        }
      }
    }
    case ParserStates.BODY: {
      if (state === ParserStates.BODY) {
        if (sticky.chunked) {
          if (sticky.discardBytes) {
            const bytes = chunk.slice(0, sticky.discardBytes)
            chunk = chunk.slice(sticky.discardBytes)
            sticky.discardBytes -= bytes.length
            if (sticky.discardBytes > 0) break
          }
          if (sticky.lengthRemaining) {
            const body = chunk.slice(0, sticky.lengthRemaining)
            chunk = chunk.slice(sticky.lengthRemaining)
            data.body.push(body.toString('utf8'))
            sticky.lengthRemaining -= body.length

            if (sticky.lengthRemaining === 0) {
              sticky.discardBytes = 2
              const bytes = chunk.slice(0, sticky.discardBytes)
              chunk = chunk.slice(sticky.discardBytes)
              sticky.discardBytes -= bytes.length
            }
          }
          let eol
          while ((sticky.discardBytes === 0) && (sticky.lengthRemaining === 0) && (eol = findRN(chunk)) > -1) {
            sticky.lengthRemaining = parseInt(chunk.slice(0, eol).toString(), 16)
            chunk = chunk.slice(eol + 2)

            if (sticky.lengthRemaining === 0) {
              data.trailers = {}
              state = ParserStates.TRAILERS
              break
            }
            
            const body = chunk.slice(0, sticky.lengthRemaining)
            chunk = chunk.slice(sticky.lengthRemaining)
            if (body.length) data.body.push(body.toString('utf8'))
            sticky.lengthRemaining -= body.length

            if (sticky.lengthRemaining === 0) {
              sticky.discardBytes = 2
              const bytes = chunk.slice(0, sticky.discardBytes)
              chunk = chunk.slice(sticky.discardBytes)
              sticky.discardBytes -= bytes.length
            }
          }
        } else {
          if (sticky.lengthRemaining === void 0) {
            data.body.push(chunk.slice(0))
            chunk = chunk.slice(chunk.length)
          } else {
            const n = sticky.lengthRemaining
            data.body.push(chunk.slice(0, n))
            sticky.lengthRemaining -= chunk.length
            if (sticky.lengthRemaining === 0) {
              state = ParserStates.FIN
            }
            chunk = chunk.slice(n)
          }
        }
      }
    }
    case ParserStates.TRAILERS: {
      if (state === ParserStates.TRAILERS) {
        let eol
        while ((eol = findRN(chunk)) > -1) {
          if (eol === 0) {
            chunk = chunk.slice(2)
            state = ParserStates.FIN
            break
          }
          let line = chunk.slice(0, eol).toString()
          const [ key, value ] = parseHeader(line)
          data.trailers[key] = value
  
          chunk = chunk.slice(eol + 2)
        }
      }
    }
  }
  return [chunk, state, data, sticky]
}

/**
 * @param {string} line
 * @returns {[number, string]}
 */
function parseResponseHead (line) {
  let [version, statusCode, statusMessage] = line.split(' ', 3)
  if (version !== 'HTTP/1.1') throw new Error('Unsupported version: ' + version)
  statusCode = parseInt(statusCode)
  return [
    statusCode,
    statusMessage,
  ];
}

/**
 * @param {string} line
 * @returns {[string, string]}
 */
function parseRequestHead (line) {
  let [method, path, version] = line.split(' ', 3)
  if (version !== 'HTTP/1.1') throw new Error('Unsupported version: ' + version)
  return [path, method]
}

/**
 * @param {string} line
 * @returns {[string, string]}
 */
function parseHeader (line) {
  let [key, value] = line.split(': ', 2)
  return [key, value]
}

/**
 * 
 * @param {Uint8Array} chunk 
 */
function findRN (chunk) {
  const R = '\r'.charCodeAt(0)
  const N = '\n'.charCodeAt(0)

  let i = 0
  while (i < chunk.length) {
    i = chunk.indexOf(R, i)
    if (i === -1) return -1
    if (chunk[i + 1] === N) {
      return i
    }
    i++
  }
  return -1
}

class HttpResponseParser {
  #state = ParserStates.RESPONSE
  #data = {}
  #rest
  #sticky = {}
  push (chunk) {
    if (this.#rest && this.#rest.length) {
      chunk = Buffer.concat([this.#rest, chunk])
    }
    const [rest, state, data, sticky] = parseHTTP(chunk, this.#state, this.#data, this.#sticky)
    this.#rest = rest;
    this.#state = state;
    this.#data = data;
    this.#sticky = sticky;
    const body = data.body || [];
    data.body = []
    return body;
  }
  get state () {
    return this.#state;
  }
  get headers () {
    return this.#data.headers;
  }
  get statusCode () {
    return this.#data.statusCode;
  }
  get statusMessage () {
    return this.#data.statusMessage;
  }
}

class HttpRequestParser {
  #state = ParserStates.REQUEST
  #data = {}
  #rest
  #sticky = {}
  push (chunk) {
    if (this.#rest && this.#rest.length) {
      chunk = Buffer.concat([this.#rest, chunk])
    }
    const [rest, state, data, sticky] = parseHTTP(chunk, this.#state, this.#data, this.#sticky)
    this.#rest = rest;
    this.#state = state;
    this.#data = data;
    this.#sticky = sticky;
    const body = data.body || [];
    data.body = []
    return body;
  }
  get method () {
    return this.#data.method
  }
  get path () {
    return this.#data.path
  }
  get state () {
    return this.#state;
  }
  get headers () {
    return this.#data.headers;
  }
}

module.exports = {
  ParserStates,
  HttpResponseParser,
  HttpRequestParser
}
