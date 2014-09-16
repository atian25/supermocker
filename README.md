## SuperMocker - dynamic mocker middleware

[![NPM Version](https://img.shields.io/npm/v/supermocker.svg?style=flat)](https://www.npmjs.org/package/supermocker)
[![Build Status](https://img.shields.io/travis/atian25/supermocker.svg?style=flat)](https://travis-ci.org/atian25/supermocker)

### Installation

```bash
$ npm install supermocker --save
```

## Quick Start

```js
var Mocker = require('supermocker')
var mocker = Mocker('./files/db.json');

//mocker.namespaces.value();
//mocker.rules.value();
//mocker.rules.insertOrUpdate({type: 'static', data: '{"mocker": "super"}'});

//var middlewares = mocker.getMiddlewares();
```

## TODO
[] change `request` to `superagent`
[] support remove headers
[] remove namespace
[] sortById -> sortById(idArr, whereArr)


## History
### v0.0.8
-

### v0.0.5
- init project