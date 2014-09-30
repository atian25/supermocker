#!/usr/bin/env node
var program = require('commander');
var pkg = require('../package.json');
var debug = require('debug')(pkg.name);

program
  .version(pkg.version)
  .option('-p, --port [port]', 'server port, default: 4567')
  .parse(process.argv);

var app = require('../app');
app.set('port', process.env.PORT || program.port || 4567);

var server = app.listen(app.get('port'), function() {
  console.log('%s server listening on port %s', pkg.name , server.address().port);
});
