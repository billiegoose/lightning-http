const { match } = require('path-to-regexp')

module.exports = function app() {
  const routes = []
  const route = method => (path, handler) => {
    routes.push({
      method,
      path,
      match: match(path),
      handler
    })
  }

  this.get = route('GET')
  this.post = route('POST')
  this.del = route('DELETE')
  this.put = route('PUT')
  this.any = route('any')

  this.handle = async function handle ({ path, method, headers, body }) {
    console.log({ path, method, headers, body })
    for (const route of routes) {
      if (route.method === 'all' || route.method === method) {
        let m = route.match(path)
        if (m) {
          console.log(path, 'matched', route.path)
          return route.handler({ path, method, headers, body, params: m.params })
        }
      }
    }
    return {
      statusCode: 404,
      statusMessage: 'Not Found',
      headers: {
        'Connection': 'close',
      },
    }
  }
}
