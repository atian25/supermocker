## SuperMocker - dynamic mocker middleware

[![NPM Version](https://img.shields.io/npm/v/supermocker.svg?style=flat)](https://www.npmjs.org/package/supermocker)
[![Build Status](https://img.shields.io/travis/atian25/supermocker.svg?style=flat)](https://travis-ci.org/atian25/supermocker)

### Installation

```bash
  npm install supermocker -g
  supermocker
```

### Embed Usage
```js
var Mocker = require('supermocker')
var mocker = new Mocker('./mocker.db');
var app = express();
app.use(function(req, res, next){
  req.mocker = mocker;
  next();
});
app.use('/', mocker.admin);
app.use('/mocker', mocker.router);

```

### Rule
```js
// static
// mockjs
// redirect
// custom
```


### TODO
- [x] change `request` to `superagent`
- [ ] support remove headers
- [ ] group action ui


### History
#### v0.4.0
  - big refactor
  - `npm install supermocker -g`

#### v0.0.9
  - change mocker exports to factory function

#### v0.0.8
  - add rule class