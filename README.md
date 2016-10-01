# HOT-CONFIG

A config loader is designed to be able to hot-reload.

## FEATURES

* Load recursively config files that matches a given regexp.
* Built-in asynchronous YAML and JSON parsers.
* Support environment-specific (profile-specific) configs.
* Able to hot-reload.

## USAGE

By default, `hot-config` load recursively any YAML files that matches `*.yaml` or `*.yml` in the
config directory. At runtime, after loaded configs, to access config values, we use config paths which are dot paths that solved from config file paths, all the directory names and file names will be converted to camel case. The default environment (profile) is `default`, the loaded environment (profile) at runtime is `process.env.NODE_ENV` by default or you can specify it by passing `opts.profile` to `load()`.

Here is a simple sample:

```yaml
# ./configs/generic.yaml
# ------------------------------------------------------------------------------
default:
  debug: true
production:
  debug: false
```

```yaml
# ./configs/db/mongo.yaml
# ------------------------------------------------------------------------------
default:
  host: 'localhost'
  port: 27017
production:
  host: '12.12.12.12'
```

```yaml
# ./configs/movie-catalog.yaml
# ------------------------------------------------------------------------------
default:
  cache: 0
production:
  cache: -1
```

```javascript
// ./index.js
// ----------------------------------------------------------------------------- 
const config = require('hot-config');
const app = require('src/app');

config.load('configs/', (err) => {
  if (err) {
    throw err;
  }
  app.start();
});
```

```javascript
// ./src/app.js
// -----------------------------------------------------------------------------
const config = require('hot-config').store;

function start() {
  if (!process.env.NODE_ENV) {
    expect(config.debug).to.equal(true);
    expect(config.db.mongo.host).to.equal('localhost');
    expect(config.db.mongo.port).to.equal(27017);
    expect(config.movieCatalog.cache).to.equal(0);
  }

  if (process.env.NODE_ENV === 'production') {
    expect(config.debug).to.equal(false);
    expect(config.db.mongo.host).to.equal('12.12.12.12');
    expect(config.db.mongo.port).to.equal(27017);
    expect(config.movieCatalog.cache).to.equal(-1);
  }
}

module.exports = {start};
```

## APIs

### config.load(dir, opts, done)

Load config files recursively in a directory.

```javascript
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
```

### config.store

The config store.

### config.parsers

Built-in parsers. Currently, there're 2 built-in parsers, `yaml` and `json`.

### config.ParserError

A Error-based class provides information of a parser error.

```javascript
class ParserError extends Error {
  constructor (error, file) {
    super(`${error.toString()} in "${file}"`)
  }
}
```

### config.clear()

Clear the config store.


## ABLE TO HOT-RELOAD

The key of hot-reloading is the only config store instance.

Take a look at:

* [clear()](src/index.js#L90)
* [load::updateStore()](src/index.js#L173)

After all config files are parsed and merged, the config store will be cleared and updated synchronously but not replaced by a new instance, this makes all existing references of the config store are still working after reloaded.

But keep in mind that this feature only works if you're keeping references of the store, not with references of config values. For example:

```javascript
const config = require('hot-config').store; // this is hot-reloadable!
setTimeout(() => console.log(config.mongo), 1000);

const mongoConfig = require('hot-config').store.mongo; // this is not hot-reloadable!
setTimeout(() => console.log(mongoConfig), 1000);
```

### PREFER JSON

If you prefer JSON, you need to do some extra works:

```javascript
const config = require('hot-config');

const opts = {
  filePattern: /^.*\.json$/,
  fileParser: config.parsers.json
}

config.load('configs', opts, (err) => {
})
```
