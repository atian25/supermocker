#!/usr/bin/env node
var pkg = require('../package.json');
var debug = require('debug')(pkg.name);
var app = require('../app');

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
  console.log('%s server listening on port %s', pkg.name , server.address().port);
});
