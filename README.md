# HOT-CONFIG

A config loader is designed to reload on the fly (hot-reloading).

## FEATURES

* Load recursively config files that matches a given regexp.
* Support environment-specific configs.
* Designed to reload on the fly (hot-reload).
* Built-in asynchronous YAML and JSON parsers.
* Support dependency injection.
* Customizable with optional options.

## USAGE

```yaml
./configs/db/mongo.yaml
--------------------------------------------------------------------------------
default:
  host: 'localhost'
  port: 27017
production:
  host: '12.12.12.12'
```

```yaml
./configs/db/redis.yaml
--------------------------------------------------------------------------------
default:
  host: 'localhost'
  port: 6379
production:
  host: '12.12.12.13'
```

```js
./index.js
--------------------------------------------------------------------------------
const loadConfig = require('hot-config').load;

loadConfig('configs/', (err) => {
  throw err;
});
```

```js
./src/app.js
--------------------------------------------------------------------------------
const config = require('hot-config').store;

if (!process.env.NODE_ENV) {
  expect(config.db.mongo.host).to.equal('localhost');
  expect(config.db.mongo.port).to.equal(27017);
  expect(config.db.redis.host).to.equal('localhost');
  expect(config.db.redis.host).to.equal(6379);
}

if (process.env.NODE_ENV === 'production') {
  expect(config.db.mongo.host).to.equal('12.12.12.12');
  expect(config.db.mongo.port).to.equal(27017);
  expect(config.db.redis.host).to.equal('12.12.12.13');
  expect(config.db.redis.host).to.equal(6379);
}
```

## CONFIG FILES

//todo: write **config files** document.


## HOT-RELOADING

So how does reloading work ? First, take a look at:

* https://github.com/thenewvu/hot-config/blob/master/src/index.js#L50
* https://github.com/thenewvu/hot-config/blob/master/src/index.js#L116

What's happen here is, when updating the config store, the current store won't be replaced be a new store instance but will be cleared and updated **synchronously**. It means all existing references of the store still points to the single and working store instance.

But keep in mind that this feature only works if you keep references of the store, **doens't work** when you keep references of the config value, like this:

```js
const config = require('hot-config').store; // this is hot-reloadable!

const mongoConfig = require('hot-config').store.mongo; // this is not hot-reloadable!
```

## WRITE YOUR OWN PARSER

//todo: write **write your own parser** document.

## APIs

//todo: write **APIs** document.


