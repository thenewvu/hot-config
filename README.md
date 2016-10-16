# HOT-CONFIG

A node.js config loader is designed to be able to hot-reload.

## FEATURES

* Load recursively config files that matches a given pattern.
* Built-in asynchronous YAML and JSON parsers.
* Support environment-specific (profile-specific) configs.
* Hot-reloadable.

## USAGE

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

### config.store

The config store.

### config.filePatterns

Built-in file patterns, `yaml` and `json`.

### config.fileParsers

Built-in file parsers, `yaml` and `json`.

### config.ParserError

A Error-based class provides information of a parser error.

### config.load(dir, opts, done)

Load config files recursively in a directory.

```javascript
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
function load (dir, opts, done) {}
```

### config.clear()

Clear the config store.

## HOT-RELOADABLE

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
  filePattern: config.filePatterns.json,
  fileParser: config.fileParsers.json
}

config.load('configs', opts, (err) => {
})
```

### DRY RUN

To load configs for testing, you can use the loading opts `dryRun`.

```javascript
const config = require('hot-config');

const opts = {
  dryRun: true
}

config.load('configs', opts, (err, testStore) => {
  // `testStore` has new configs, the `store` has no change!
})
```
