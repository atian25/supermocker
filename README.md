## SuperMocker - dynamic mocker middleware

[![NPM Version](https://img.shields.io/npm/v/supermocker.svg?style=flat)](https://www.npmjs.org/package/supermocker)
[![Build Status](https://img.shields.io/travis/atian25/supermocker.svg?style=flat)](https://travis-ci.org/atian25/supermocker)

### Installation

```bash
$ npm install supermocker --save
```

### Quick Start

```js
var Mocker = require('supermocker')
var mocker = new Mocker('./files/db.json');

//database, using `loadash` method
mocker.namespaces.value();
mocker.rules.value();
mocker.rules.insertOrUpdate({
  type: 'static',
  namespace: 'example',
  path: 'static',
  data: '{"mocker": "super"}'
});

//collect rule handlers
var middlewares = mocker.getMiddlewares();

```

### Rule
```js
// static
// mockjs
// redirect
// custom
```


### optional build-in router

```js
var app = require('express')();
var router = require('supermocker/lib/router')('./files/db.json');

//database, using `loadash` method
var mocker = router.mocker;
mocker.namespaces.value();
mocker.rules.value();
mocker.rules.insertOrUpdate({
  id: 1,
  type: 'static',
  namespace: 'example',
  path: 'static',
  data: '{"mocker": "super"}'
});
router.refresh();

//mocker to route
app.use('/proxy', router.proxy);

//visit `http://localhost:5000/proxy/example/static` in browser

//admin
//router.get('/', function(req, res) {
//  res.sendfile('./public/proxy/index.html');
//});
//app.use('/admin/proxy', mocker);

//start server
app.listen(5000, function() {
  console.log('supermocker server listening on port 5000');
  console.log('visit http://localhost:5000/proxy/example/static');
});
```

### TODO
- [ ] change `request` to `superagent`
- [ ] support remove headers
- [ ] remove namespace
- [ ] sortById -> sortById(idArr, whereArr)


### History
#### v0.0.9
  - change mocker exports to factory function

#### v0.0.8
  - add rule class