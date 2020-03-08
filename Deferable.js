const Deferable = function () {
  this.promise = new Promise(resolve => this.resolve = resolve)
}

module.exports = Deferable