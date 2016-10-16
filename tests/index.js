/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const decache = require('decache')

describe('features', function () {
  it('load yaml config files by default', function (done) {
    decache('../src/index')
    const config = require('../src/index')
    config.load(`${__dirname}/features/load-yaml-config-files-by-default`, (err) => {
      expect(err).to.be.null
      expect(config.store).to.deep.equal({
        conf1: {
          str: 'a string',
          num: 12
        },
        conf2: {
          arr: ['e1', 'e2'],
          flt: 15.235
        }
      })
      done()
    })
  })

  it('load json config files', function (done) {
    decache('../src/index')
    const config = require('../src/index')
    const opts = {
      filePattern: config.filePatterns.json,
      fileParser: config.fileParsers.json
    }
    config.load(`${__dirname}/features/load-json-config-files`, opts, (err) => {
      expect(err).to.be.null
      expect(config.store).to.deep.equal({
        conf1: {
          str: 'a string',
          num: 12
        },
        conf2: {
          arr: ['e1', 'e2'],
          flt: 15.235
        }
      })
      done()
    })
  })

  it('load recursively config files', function (done) {
    decache('../src/index')
    const config = require('../src/index')
    config.load(`${__dirname}/features/load-recursively-config-files`, (err) => {
      expect(err).to.be.null
      expect(config.store).to.deep.equal({
        conf1: {
          conf11: {
            str: 'a string',
            num: 12
          }
        },
        conf2: {
          arr: ['e1', 'e2'],
          flt: 15.235
        }
      })
      done()
    })
  })

  it('reload config files no effect store reference', function (done) {
    decache('../src/index')
    const config = require('../src/index')
    const origin = `${__dirname}/features/reload-config-files-no-effect-store-reference/origin`
    const changed = `${__dirname}/features/reload-config-files-no-effect-store-reference/changed`
    const store = config.store
    config.load(origin, (err) => {
      expect(err).to.be.null
      expect(store).to.deep.equal({
        conf1: {
          str: 'a string',
          num: 12
        },
        conf2: {
          arr: ['e1', 'e2'],
          flt: 15.235
        }
      })

      config.load(changed, (err) => {
        expect(err).to.be.null
        expect(store).to.deep.equal({
          conf1: {
            arr: ['e1', 'e2'],
            num: 15
          }
        })
        done()
      })
    })
  })

  it('process config paths', function (done) {
    decache('../src/index')
    const config = require('../src/index')
    config.load(`${__dirname}/features/process-config-paths`, (err) => {
      expect(err).to.be.null
      expect(config.store).to.deep.equal({
        pathWithDashes: {
          conf1: {
            str: 'a string',
            num: 12
          }
        },
        pathWithUnderscores: {
          conf2: {
            arr: ['e1', 'e2'],
            flt: 15.235
          }
        }
      })
      done()
    })
  })

  it('catch parser errors', function (done) {
    decache('../src/index')
    const config = require('../src/index')
    config.load(`${__dirname}/features/catch-parser-errors`, (err) => {
      expect(err).to.be.instanceof(config.ParserError)
      done()
    })
  })

  it('dry run', function (done) {
    decache('../src/index')
    const config = require('../src/index')
    const origin = `${__dirname}/features/reload-config-files-no-effect-store-reference/origin`
    const changed = `${__dirname}/features/reload-config-files-no-effect-store-reference/changed`
    const store = config.store
    config.load(origin, (err) => {
      expect(err).to.be.null
      expect(store).to.deep.equal({
        conf1: {
          str: 'a string',
          num: 12
        },
        conf2: {
          arr: ['e1', 'e2'],
          flt: 15.235
        }
      })

      config.load(changed, {dryRun: true}, (err, testStore) => {
        expect(err).to.be.null
        expect(store).to.deep.equal({
          conf1: {
            str: 'a string',
            num: 12
          },
          conf2: {
            arr: ['e1', 'e2'],
            flt: 15.235
          }
        })
        expect(testStore).to.deep.equal({
          conf1: {
            arr: ['e1', 'e2'],
            num: 15
          }
        })
        done()
      })
    })
  })
})
