'use strict';

const fs    = require('fs');
const path  = require('path');
const _     = require('lodash');
const find  = require('find');
const async = require('neo-async');
const yaml  = require('js-yaml');
const debug = require('debug');

// init a logging logger
const log = debug('hot-config:log');
log.log = console.log.bind(console);

// init a warning logger
const warn = debug('hot-config:warning');
warn.log = console.warn.bind(console);

// built-in parsers
const parsers = {
  yaml: (data, done) => setImmediate(() => {
    try { done(null, yaml.load(data)); }
    catch (err) { done(err); }
  }),
  json: (data, done) => setImmediate(() => {
    try { done(null, JSON.parse(data)); }
    catch (err) { done(err); }
  })
};


// default optional options
const defopts = {
  pattern: /^.*\.(yaml|yml)$/,
  parser: parsers.yaml,
  encoding: 'utf8',
  defenv: 'default'
};

// config store
const store = {};

/**
 * Clear config store.
 */
function clear() {
  warn('Clearing config store');
  _.unset(store, _.keys(store));
}

/**
 * Load configs from a dir.
 * @param {String} dir - The dir path.
 * @param {Object} [opts] - Optional options.
 * @param {Function} done - The callback.
 */
function load(dir, opts, done) {
  // resolve dir path to an absolute path
  dir = path.resolve(__dirname, dir);
  log(`Loading "${dir}"`);

  // swap (done, opts) if no opts
  _.isFunction(opts) && ([done, opts] = [opts, {}]);

  // merge opts
  opts = _.defaults({}, opts, defopts);

  const findFiles = (next) => {
    log('Finding "%s"', opts.pattern);
    find(opts.pattern, dir, next);
  };

  const loadConfigs = (files, next) => {
    if (_.isEmpty(files)) {
      warn('Not found any config files');
      return next(null, []);
    }

    log('Found ', files);

    const parsePath = (file, next) => next(null, path.relative(dir, file)
      .split(path.sep).filter((n) => !!n).join('.'));
    const parseFile = (file, next) => async.waterfall([
      (next) => fs.readfile(file, opts.encoding, next),
      (data, next) => opts.loader(data, next)
    ], next);
    const parse = (file, next) => async.parallel({
      path: (next) => parsePath(file, next),
      value: (next) => parseFile(file, next)
    }, next);
    async.map(files, parse, next);
  };

  const mergeConfigs = (configs, next) => {
    const merge = (config, next) => next(null, _.assign(config, {
      value: _.merge({}, config.value[opts.defenv], config.value[process.env.NODE_ENV])
    }));
    async.map(configs, merge, next);
  };

  const updateConfigs = (configs, next) => {
    clear();
    configs.forEach((config) => _.set(config.path, config.value));
  };

  // execute subtasks
  async.waterfall([findFiles, loadConfigs, mergeConfigs, updateConfigs], done);
}

module.exports =  {store, clear, load};
