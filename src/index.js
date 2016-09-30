'use strict';

const fs    = require('fs');
const path  = require('path');
const util  = require('util');
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
  encoding: 'utf8',
  parser: parsers.yaml,
  defenv: 'default',
  __listdir: find.file,
  __readfile: fs.readFile,
  __env: process.env.NODE_ENV
};

// config store
const store = {};

/**
 * Clear config store.
 */
function clear() {
  warn('Clearing config store, %j', store);
  _.keys(store).forEach((key) => {
    delete store[key];
  });
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

  log('Loading with opts %j', util.inspect(opts, {depth: null}));

  const findFiles = (next) => {
    log('Finding "%s"', opts.pattern);
    opts.__listdir(opts.pattern, dir, (files) => {
      next(null, files);
    });
  };

  const parseFiles = (files, next) => {
    log('Found ', files);

    if (_.isEmpty(files)) {
      warn('Not found any config files');
      return next(null, []);
    }

    const parsePath = (file, next) => {
      file = path.relative(dir, file);
      file = file.replace(path.extname(file), '');
      file = file.split(path.sep).filter((n) => !!n).join('.');
      next(null, file);
    };
    const parseFile = (file, next) => async.waterfall([
      (next) => opts.__readfile(file, opts.encoding, next),
      (data, next) => opts.parser(data, next)
    ], next);
    const parse = (file, next) => async.parallel({
      path: (next) => parsePath(file, next),
      value: (next) => parseFile(file, next)
    }, next);
    async.map(files, parse, next);
  };

  const solveEnv = (configs, next) => {
    log('Solving env "%s" of %j', opts.__env, configs);
    const solve = (config) => _.assign(config, {
      value: _.merge({}, config.value[opts.defenv], config.value[opts.__env])
    });
    next(null, _.map(configs, solve));
  };

  const updateStore = (configs, next) => {
    clear();
    configs.forEach((config) => {
      _.set(store, config.path, config.value);
    });
    log('Updated store, %j', store);
    next(null);
  };

  // execute subtasks
  async.waterfall([findFiles, parseFiles, solveEnv, updateStore], done);
}

module.exports =  {parsers, store, clear, load};
