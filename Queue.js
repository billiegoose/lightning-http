const Deferable = require('./Deferable.js')

class Queue {
  #array =  [new Deferable()]

  push (...args) {
    if (this.#array.length === 0) throw new Error('Cannot call push() after end()')
    for (const arg of args) {
      this.#array.push(new Deferable())
      this.#array[this.#array.length - 2].resolve(arg)
    }
  }

  end () {
    this.#array[this.#array.length - 1].resolve()
  }

  async *[Symbol.asyncIterator]() {
    while (this.#array.length) {
      let value = await this.#array[0].promise
      this.#array.shift()
      yield value
    }
  }
}

module.exports = Queue
