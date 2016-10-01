'use strict'

const fs = require('fs')
const path = require('path')
const util = require('util')
const _ = require('lodash')
const find = require('find')
const async = require('neo-async')
const yaml = require('js-yaml')
const debug = require('debug')

// create a logging logger
const log = debug('hot-config:log')
log.log = console.log.bind(console)

// create a warning logger
const warn = debug('hot-config:warning')
warn.log = console.warn.bind(console)

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
        warn(`Failed to parse "%s", %j`, file, err)
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
        warn(`Failed to parse "%s", %j`, file, err)
        done(new ParserError(err, file))
      }
    })
  }

  async.waterfall([read, parse], done)
}

// built-in parsers
const parsers = {
  yaml: parseYAML,
  json: parseJSON
}

// config store
const store = {}

/**
 * Clear config store.
 */
function clear () {
  log('Clearing config store, current: %j', store)
  _.keys(store).forEach((key) => {
    delete store[key]
  })
}

/**
 * Load configs from a dir.
 * @param {String} dir - The dir path.
 * @param {Object} [opts] - Optional options.
 * @param {RegExp} [opts.filePattern] - Config file pattern. Default: /^.*\.(yaml|yml)$/
 * @param {Function} [opts.fileParser] - Config file parser. Default: Built-in YAML parser.
 * @param {Function} [opts.pathNormalizer] - Config path normalizer. Default: lodash.camelCase
 * @param {String} [opts.defaultProfile] - Default profile name. Default: 'default'
 * @param {String} [opts.profile] - Loaed profile name. Default: process.env.NODE_ENV
 * @param {Function} done - The callback.
 */
function load (dir, opts, done) {
  // resolve dir path to an absolute path
  dir = path.resolve(__dirname, dir)

  // swap (done, opts) if no opts
  _.isFunction(opts) && ([done, opts] = [opts, {}])

  // merge opts
  opts = _.defaults({}, opts, {
    filePattern: /^.*\.(yaml|yml)$/,
    fileEncoding: 'utf8',
    fileParser: parsers.yaml,
    pathNormalizer: _.camelCase,
    defaultProfile: 'default',
    profile: process.env.NODE_ENV,
    __listdir: find.file
  })

  log('Loading "%s" with opts %j', dir, util.inspect(opts, {depth: 1}))

  const findFiles = (next) => {
    opts.__listdir(opts.filePattern, dir, (files) => {
      next(null, files)
    })
  }

  const parseFiles = (files, next) => {
    log('Found config files %j', files)

    if (_.isEmpty(files)) {
      warn('Not found any config files')
      return next(null, [])
    }

    const parsePath = (file, next) => {
      file = path.relative(dir, file)
      file = file.replace(path.extname(file), '').split(path.sep)
        .filter((n) => !!n).map((n) => opts.pathNormalizer(n)).join('.')
      next(null, file)
    }

    const parseFile = (file, next) => {
      opts.fileParser(file, opts.fileEncoding, next)
    }

    const parse = (file, next) => async.parallel({
      path: (next) => parsePath(file, next),
      value: (next) => parseFile(file, next)
    }, next)

    async.map(files, parse, next)
  }

  const mergeProfile = (configs, next) => {
    const merge = (config) => {
      const defaultValue = config.value[opts.defaultProfile]
      const specificValue = config.value[opts.profile]
      return _.assign(config, {
        value: _.merge({}, defaultValue, specificValue)
      })
    }

    next(null, _.map(configs, merge))
  }

  const updateStore = (configs, next) => {
    clear()
    log('Updating new configs: %j', configs)
    configs.forEach((config) => {
      _.set(store, config.path, config.value)
    })
    next(null)
  }

  // execute subtasks
  async.waterfall([findFiles, parseFiles, mergeProfile, updateStore], done)
}

module.exports = {ParserError, parsers, store, clear, load}
