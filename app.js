var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');

var app = module.exports = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));
app.use(bodyParser.json({extended: true}));
app.use(bodyParser.urlencoded({extended: true}));

var Mocker = require('./lib/mocker');
var mocker = new Mocker('./mocker.db');
app.use(function(req, res, next){
  req.mocker = mocker;
  next();
});
app.use('/', mocker.admin);
app.use('/mocker', mocker.router);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
//if (app.get('env') === 'development') {
//  app.use(function(err, req, res, next) {
//    res.status(err.status || 500);
//    res.render('error', {
//      message: err.message,
//      error: err
//    });
//  });
//}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    url: req.originalUrl,
    message: err.message,
    stack: err.stack,
    error: app.get('env') === 'development' ? err : {}
  });
  console.warn(err.stack);
  //err.printE
  //res.render('error', {
  //  message: err.message,
  //  error: {}
  //});
});

