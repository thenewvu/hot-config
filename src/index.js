'use strict'

const util = require('util')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const find = require('find')
const async = require('neo-async')
const yaml = require('js-yaml')
const debug = require('debug')

const log = {
  info: debug('hot-config:info'),
  warning: debug('hot-config:warning'),
  verbose: debug('hot-config:verbose'),
  error: debug('hot-config:error')
}

log.info.log = console.info.bind(console)
log.verbose.log = console.info.bind(console)
log.warning.log = console.warn.bind(console)
log.error.log = console.error.bind(console)

class ParserError extends Error {
  constructor (error, file) {
    super(`${error.toString()} in "${file}"`)
  }
}

/**
 * Parse an YAML file
 * @param {String} file
 * @param {String} encoding
 * @param {Function} done
 * @throws {ParserError}
 */
function parseYAML (file, encoding, done) {
  const read = (next) => {
    fs.readFile(file, encoding, next)
  }

  const parse = (data, next) => {
    setImmediate(() => {
      try {
        done(null, yaml.load(data))
      } catch (err) {
        log.error(`Failed to parse %j due to %j`,
          file, util.inspect(err, {depth: null}))
        done(new ParserError(err, file))
      }
    })
  }

  async.waterfall([read, parse], done)
}

/**
 * Parse a JSON file
 * @param {String} file
 * @param {String} encoding
 * @param {Function} done
 * @throws {ParserError}
 */
function parseJSON (file, encoding, done) {
  const read = (next) => {
    fs.readFile(file, encoding, next)
  }

  const parse = (data, next) => {
    setImmediate(() => {
      try {
        done(null, JSON.parse(data))
      } catch (err) {
        log.error(`Failed to parse %j due to %j`,
          file, util.inspect(err, {depth: null}))
        done(new ParserError(err, file))
      }
    })
  }

  async.waterfall([read, parse], done)
}

// built-in file patterns
const filePatterns = {
  yaml: /^.*\.(yaml|yml)$/,
  json: /^.*\.(json)$/
}

// built-in file parsers
const fileParsers = {
  yaml: parseYAML,
  json: parseJSON
}

// config store
const store = {}

/**
 * Clear config store.
 */
function clear () {
  log.verbose('Current store, %j', store)
  log.info('Clearing store')
  _.forEach(_.keys(store), (key) => {
    delete store[key]
  })
}

/**
 * Load configs in a directory.
 * @param {String} dir - The directory path.
 * @param {Object} [opts] - Optional options.
 * @param {RegExp} [opts.filePattern] - Config file pattern. Default: Built-in YAML file pattern.
 * @param {Function} [opts.fileParser] - Config file parser. Default: Built-in YAML parser.
 * @param {Function} [opts.pathNormalizer] - Config path normalizer. Default: lodash.camelCase
 * @param {String} [opts.defaultProfile] - Default profile name. Default: 'default'
 * @param {String} [opts.profile] - Loaded profile name. Default: process.env.NODE_ENV
 * @param {Boolean} [opts.dryRun] - Load for testing only, don't update the store. Default: false
 * @param {Function} done - The callback.
 */
function load (dir, opts, done) {
  if (_.isFunction(opts)) {
    done = opts
    opts = {}
  }

  opts = _.defaults({}, opts, {
    filePattern: filePatterns.yaml,
    fileEncoding: 'utf8',
    fileParser: fileParsers.yaml,
    defaultProfile: 'default',
    profile: process.env.NODE_ENV,
    dryRun: false
  })

  if (!path.isAbsolute(dir)) {
    dir = path.resolve(__dirname, dir)
  }

  log.info('Loading dir, %j', dir)
  log.info('Loading with opts, %j', util.inspect(opts, {depth: null}))

  const loadFile = (file, next) => {
    opts.fileParser(file, opts.fileEncoding, (err, value) => {
      next(err, value && {
        path: toDotPath(path.relative(dir, file, {
          pathNormalizer: opts.pathNormalizer
        })),
        value
      })
    })
  }

  async.waterfall([
    (next) => {
      listDir(dir, opts.filePattern, next)
    },
    (files, next) => {
      log.verbose('Found files, %j', files)
      async.map(files, loadFile, next)
    },
    (configs, next) => {
      log.verbose('Parsed configs, %j', configs)
      next(null, _.map(configs, (config) => {
        const defaultValue = config.value[opts.defaultProfile]
        const specificValue = config.value[opts.profile]
        config.value = _.merge({}, defaultValue, specificValue)
        return config
      }))
    },
    (configs, next) => {
      log.verbose('Solved configs, %j', configs)
      if (opts.dryRun) {
        const testStore = {}
        _.forEach(configs, (config) => {
          _.set(testStore, config.path, config.value)
        })
        next(null, testStore)
      } else {
        clear()
        _.forEach(configs, (config) => {
          _.set(store, config.path, config.value)
        })
        log.info('Updated store.')
        log.verbose('Current store, %j', store)
        next(null, store)
      }
    }
  ], done)
}

/**
 * List recursively files that matches a given pattern in a directory.
 * @param {String} dir - The directory path.
 * @param {Regexp} filePattern - The file pattern.
 * @param {Function} done - The callback.
 */
function listDir (dir, filePattern, done) {
  find.file(filePattern, dir, (files) => {
    done(null, files)
  })
}

/**
 * Convert a file path to a dot path.
 * @param {String} file - The file path.
 * @returns {String} The dot path.
 */
function toDotPath (filepath, opts) {
  opts = _.defaults({}, opts, {
    pathNormalizer: _.camelCase
  })

  const ext = path.extname(filepath)

  return filepath.replace(ext, '')
    .split(path.sep)
    .filter((n) => !!n)
    .map((n) => opts.pathNormalizer(n))
    .join('.')
}

module.exports = {ParserError, filePatterns, fileParsers, store, clear, load}
