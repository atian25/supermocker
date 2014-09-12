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
var mocker = new Mocker('./files/db.json');

//mocker.namespaces.value();
//mocker.rules.value();
//mocker.rules.insertOrUpdate({type: 'static', data: '{"mocker": "super"}'});

//var middlewares = mocker.getMiddlewares();
```