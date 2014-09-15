var URL = require('url');
var request = require('request');
var mockjs = require('mockjs');

/**
 * provide handlers
 */
module.exports = exports = {
  echo: echoHandler,
  static: staticHandler,
  mockjs: staticHandler,
  redirect: redirectHandler,
  custom: customHandler,
  get: get
};

//TODO: change console to DEBUG
//TODO: log to some place for online log view
//TODO: support path pattern && replace data && change url

/**
 * get handler by rule
 *
 * @param {Object|Rule} rule The rule item
 * @param {String} rule.type The rule type
 * @param {Number} [rule.delay] Whether delay callback
 * @returns {Function} Returns handler
 */
function get(rule){
  var handler = function(req, res, next) {
    var fn = exports[rule.type] || exports['echo'];
    fn(rule, req, res, next);
  };

  if (rule.delay) {
    return function(req, res, next) {
      setTimeout(function () {
        handler(req, res, next);
      }, rule.delay);
    }
  } else {
    return handler;
  }
}

/**
 * provide static/mockjs handler
 *
 * @param {Object|Rule} rule The rule item
 * @param {Number} [rule.statusCode] Response's statusCode
 * @param {Array} [rule.headers] Response headers, [{key: '', value: '', disable: false}, ...]
 * @param {String} [rule.data]  Stringify object string, should be parse as pure object data or mockjs template defined.
 * @params {Function} next If rule.data is undefined , then call next()
 */
function staticHandler(rule, req, res, next){
  //状态码
  res.status(rule.statusCode || 200);

  //头信息
  if (rule.headers) {
    rule.headers.forEach(function (item) {
      if(!item.disabled) {
        res.header(item.key, item.value);
      }
    });
  }

  //数据
  if (rule.data) {
    var data = JSON.parse(rule.data);
    //TODO: support xml/text/json
    if (rule.type == 'mockjs') {
      data = mockjs.mock(data);
    }
    res.json(data);
  }else{
    next();
  }
}

/**
 * provide redirect handler
 *
 * @param {Object|Rule} rule The rule item
 * @param {String} rule.redirectUrl The redirectUrl
 * @param {Array} [rule.additionalRequestHeaders] additional headers to request, [{key: '', value: '', disabled: false}, ...]
 * @param {Number} [rule.statusCode] Response's statusCode
 * @param {Array} [rule.headers] response headers, [{key: '', value: '', disabled: false}, ...]
 */
function redirectHandler(rule, req, res, next){
  if(rule.redirectUrl) {
    console.log('proxy request to: [%s] %s', req.method, rule.redirectUrl);

    //附加请求头信息
    var headers = req.headers;
    headers['proxy-agent'] = 'supermock';
    headers['host'] = URL.parse(rule.redirectUrl).host;
    if (rule.additionalRequestHeaders) {
      rule.additionalRequestHeaders.forEach(function (item) {
        if(!item.disabled) {
          headers[item.key] = item.value;
        }
      });
    }

    //request = require('superagent');
    //request(req.method, rule.redirectUrl)
    //  .type('json')
      //.set(headers)
      //.query(req.query)
      //.send(req.body)
      //.end(function(response){
      //  console.log(response)
      //  response.pipe(res)
      //})
      //.pipe(res);

    //proxy request
    request({
      url: rule.redirectUrl,
      method: req.method,
      headers: headers,
      qs: req.query,
      json: req.method!='GET' ? req.body : null
    }, function(error, response, body){
      console.log('proxy result: %s', error ? 'fail' : 'success');
    }).pipe(res);

    //状态码
    if (rule.statusCode) {
      res.status(rule.statusCode);
    }

    //头信息
    if (rule.headers) {
      rule.headers.forEach(function (item) {
        if(!item.disabled) {
          res.header(item.key, item.value);
        }
      });
    }
  }else{
    console.warn('proxy request missing redirectUrl: %j', rule);
    next();
  }
}

/**
 * provide custom handler
 *
 * @param {Object|Rule} rule The rule item
 * @param {String} rule.fn The handler function body, must not have function define header.
 */
function customHandler(rule, req, res, next){
  if(rule.fn){
    var handler;
    try {
      handler = new Function('req', 'res', 'next', 'require', rule.fn);
      handler(req, res, next, require);
    }catch(e){
      console.warn('proxy custom handler error: ' +  rule.fn);
      next(e);
    }
  }else{
    console.warn('proxy custom handler missing fn: %j', rule);
    next();
  }
}

/**
 * provide echo handler
 *
 * @param {Object|Rule} rule The rule item
 */
function echoHandler(rule, req, res, next){
  var json = {
    rule: rule,
    req: {
      url: req.url,
      method: req.method,
      headers: req.headers,
      qs: req.query,
      json: req.body
    }
  };
  res.json(json);
}