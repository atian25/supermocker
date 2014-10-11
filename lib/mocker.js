exports = module.exports = Mocker;

var util = require('util');
var low = require('./low-patch');
var express = require('express');
var _ = require('lodash');
var logger = require('log4js').getLogger('supermocker');
var admin = require('./router');

var Handler = exports.Handler = require('./handler');

/**
 * Mocker
 *
 * @param {String} [dbPath] The db path, if undefined then use memory
 * @constructor
 */
function Mocker(dbPath){
  this.dbPath = dbPath;
  this.db = low(this.dbPath);
  /**
   * The space db collection
   * @type {_}
   */
  this.spaces = this.db('spaces');
  this.router = express.Router();
  this.admin = admin(this);
  this.refreshRouter();

  var groupIds = this.spaces.flatten('groups').pluck('id').map(Number).value();
  var ruleIds = this.spaces.flatten('groups').flatten('rules').pluck('id').map(Number).value();

  this.__nextGroupId = groupIds.length ? _.max(groupIds) : 0;
  this.__nextRuleId = ruleIds.length ? _.max(ruleIds) : 0;
}

Mocker.prototype.nextGroupId = function(){
  this.__nextGroupId++;
  return String(this.__nextGroupId);
};

Mocker.prototype.nextRuleId = function(){
  this.__nextRuleId++;
  return String(this.__nextRuleId);
};

/**
 * Rule class define
 *
 * @class Rule
 *
 * @property {String} path The mapping path
 * @property {String} method The mapping method
 * @property {Boolean} [disabled] Whether mapping this rule
 * @property {Number} [delay] Delay return, ms
 * @property {String} [description] The rule description
 *
 * @property {String} type The rule type:
 *  - static: return static data/header/status
 *  - mockjs: return data build by mockjs
 *  - redirect: proxy to other server
 *  - custom: using your custom logic
 *  - echo: just echo rule & req info
 *
 * @property {Array} [headers] The response headers: [{key: '', value: '', disabled: false }, ...]
 * @property {Number} [statusCode] The response statusCode
 * @property {String} [data] The stringify object string, pure object or mockjs template
 * @property {String} [redirectUrl] The proxy server url
 * @property {Array} [additionalRequestHeaders] The additional headers to request for redirect type: [{key: '', value: '', disabled: false }, ...]
 * @property {String} [fn] The handler function body, must not have function define header.
 */

/**
 * remount router
 *
 * @param {String} [id] The space id, if provide will only refresh special space's router
 */
Mocker.prototype.refreshRouter = _.debounce(function(id){
  var self = this;
  var targetSpaces;

  //check if only update special space
  var space = self.getSpace(id);
  if(space){
    targetSpaces = [space];
  }else{
    self.router.stack = [];
    targetSpaces = self.spaces.value();
  }

  //refresh router
  targetSpaces.forEach(function(space){
    var spaceRouter = express.Router();
    self.router.use('/' + space.path, spaceRouter);
    //mapping rules
    space.groups.forEach(function(group){
      var groupRouter = express.Router();
      spaceRouter.use(groupRouter);
      group.rules.forEach(function(rule){
        var handler = Handler.get(rule);
        handler.name = rule.id;
        groupRouter[rule.method.toLowerCase()]('/' + rule.path, handler);
        //console.log('/' + space.path + '/' + rule.path, rule.method)
      });
    });
  });
  logger.debug('[refreshRouter]');
}, 100);

/**
 * list all spaces
 * @returns {Array} Returns all spaces
 */
Mocker.prototype.listSpace = function(){
  return this.spaces.value();
};

/**
 * get space item
 * @param {String} id The space id
 * @returns {Object} Return space detail
 */
Mocker.prototype.getSpace = function(id){
  return this.spaces.get(id).value();
};

/**
 * insert or update space
 *
 * @param {Object} attr The space, `path` is not allow to duplicate, `groups` is not allow to modify
 * @returns {Object} Returns new space item, if path exist, will return `Error`
 */
Mocker.prototype.updateSpace = function(attr){
  if(!attr || !attr.path){
    throw this.errorHandler('updateSpace, illegal param: %j', attr);
  }else{
    //space's path is not allow to duplicate
    attr.path = attr.path.replace(/^\/+/, '');
    var space = this.spaces.find({path: attr.path}).value();
    if(space && (!attr.id || space.id != attr.id)){
      throw this.errorHandler('space path is exist: %s at space: %j', attr.path, space);
    }else{
      space = this.getSpace(attr.id);
      // groups is not allow to update, just use `updateGroup`
      if(space){
        attr.groups = space.groups;
      }else{
        attr.groups = [];
      }
      var doc = this.spaces.insertOrUpdate(attr, true).value();
      logger.debug('updateSpace: %j', doc);
      this.refreshRouter(doc.id);
      return doc;
    }
  }
};

/**
 * remove space item && own groups && own rules
 *
 * @param {String} id The space's id
 * @returns {Object} Returns removed space
 */
Mocker.prototype.removeSpace = function(id){
  var self = this;
  var doc = this.spaces.remove(id).value();
  logger.debug('removeSpace: %j', doc);
  //mapping to router
  self.refreshRouter(doc.id);
  return doc;
};

/**
 * sort space's groups
 *
 * @param {String} spaceId The space id
 * @param {Array} groupIds The new groupIds, if not equal will fail
 * @returns {Object} Returns the modified space
 */
Mocker.prototype.sortGroup = function(spaceId, groupIds){
  var space = this.spaces.get(spaceId).value();
  if(!space){
    throw this.errorHandler('space#%d not exist: %s ', spaceId);
  }else{
    var currentGroupIds = _.pluck(space.groups, 'id');
    if( _.xor(currentGroupIds, groupIds).length > 0){
      //not allow to change groupIds
      throw this.errorHandler('space#%d\'s groupIds is not allow to change: %j -> %j', space.id, currentGroupIds, groupIds);
    }else{
      logger.debug('sort space#%d\'s groups: %j -> %j ', space.id, currentGroupIds, groupIds);
      space.groups = _.chain(space.groups).sortById(groupIds).value();
      var doc = this.spaces.update(spaceId, space).value();
      //mapping to router
      this.refreshRouter(spaceId);
      return doc;
    }
  }
};

/**
 * get group detail
 * @param {String} spaceId The space's id
 * @param {String} groupId The group's id
 * @returns {Rule} Returns group item
 */
Mocker.prototype.getGroup = function(spaceId, groupId){
  var space = this.getSpace(spaceId);
  if(space){
    return _.chain(space.groups).get(groupId).value();
  }
};

/**
 * insert or update group
 *
 * @param {String} spaceId The space's id
 * @param {Object} attr The group item, name is not allow to undefined
 * @returns {Rule/Error} Returns modified group or Error when not found
 */
Mocker.prototype.updateGroup = function(spaceId, attr){
  if(!attr || !attr.name){
    throw this.errorHandler('updateGroup, illegal param: %j', attr);
  }else{
    var space = this.getSpace(spaceId);
    if(!space){
      throw this.errorHandler('space#%d not exist: %s ', spaceId);
    }else{
      var group = this.getGroup(spaceId, attr.id);
      // groups is not allow to update, just use `updateGroup`
      if(group){
        attr.rules = group.rules;
      }else{
        attr.id = attr.id || this.nextGroupId();
        attr.rules = [];
      }
      var doc = _.chain(space.groups).insertOrUpdate(attr, true).value();
      logger.debug('[updateGroup] %j', doc);
      this.refreshRouter();
      return doc;
    }
  }
};

/**
 * remove group item
 *
 * @param {String} spaceId The space's id
 * @param {String} groupId The group's id
 * @returns {Object/Error} Returns removed group or Error when not found
 */
Mocker.prototype.removeGroup = function(spaceId, groupId){
  var space = this.getSpace(spaceId);
  if(!space){
    throw this.errorHandler('[removeGroup] space#%s not exist.', spaceId);
  }else{
    var doc = _.chain(space.groups).remove(groupId).value();
    logger.debug('[removeGroup] %j', doc);
    //mapping to router
    this.refreshRouter(spaceId);
    return doc;
  }
};

/**
 * sort group's rules
 *
 * @param {String} spaceId The space id
 * @param {String} groupId The group id
 * @param {Array} ruleIds The new ruleIds, if not equal will fail
 * @returns {Object} Returns the modified group
 */
Mocker.prototype.sortRule = function(spaceId, groupId, ruleIds){
  var group = this.getGroup(spaceId, groupId);
  if(!group){
    throw this.errorHandler('[sortRule] space#%s.group#%s not exist.', spaceId, groupId);
  }else{
    var currentRuleIds = _.pluck(group.rules, 'id');
    if( _.xor(currentRuleIds, ruleIds).length > 0){
      //not allow to change ruleIds
      throw this.errorHandler('[sortRule] space#%s.group#%s\'s ruleIds is not allow to change: %j -> %j.', spaceId, groupId, currentRuleIds, ruleIds);
    }else{
      logger.debug('[sortRule] space#%s.group#%s: %j -> %j ', spaceId, groupId, currentRuleIds, ruleIds);
      group.rules = _.chain(group.rules).sortById(ruleIds).value();
      this.db.save();
      //mapping to router
      this.refreshRouter(spaceId);
      return group;
    }
  }
};

/**
 * get rule detail
 * @param {String} spaceId The space's id
 * @param {String} groupId The group's id
 * @param {String} ruleId The rule's id
 * @returns {Rule} Returns rule item
 */
Mocker.prototype.getRule = function(spaceId, groupId, ruleId){
  var group = this.getGroup(spaceId, groupId);
  if(group){
    return _.chain(group.rules).get(ruleId).value();
  }
};

/**
 * insert or update rule
 *
 * @param {String} spaceId The space's id
 * @param {String} groupId The group's id
 * @param {Object} attr The rule item, path is not allow to undefined
 * @returns {Rule/Error} Returns modified rule or Error when not found
 */
Mocker.prototype.updateRule = function(spaceId, groupId, attr){
  if(!attr || !attr.path){
    throw this.errorHandler('[updateRule] illegal param: %j.', attr);
  }else{
    var group = this.getGroup(spaceId, groupId);
    if(!group){
      throw this.errorHandler('[removeRule] space#%s.group#%s not exist.', spaceId, groupId);
    }else {
      attr.id = attr.id || this.nextRuleId();
      attr.path = attr.path.replace(/^\/+/, '');
      attr.method = (attr.method || 'ALL').toUpperCase();
      group.rules = group.rules || [];
      //noinspection JSUnresolvedFunction
      var doc = _.chain(group.rules).insertOrUpdate(attr, true).value();
      logger.debug('[updateRule] %j', doc);
      this.refreshRouter();
      return doc;
    }
  }
};

/**
 * remove rule item
 *
 * @param {String} spaceId The space's id
 * @param {String} groupId The group's id
 * @param {String} ruleId The rule's id
 * @returns {Rule/Error} Returns removed rule or Error when not found
 */
Mocker.prototype.removeRule = function(spaceId, groupId, ruleId){
  var group = this.getGroup(spaceId, groupId);
  if(!group){
    throw this.errorHandler('[removeRule] space#%s.group#%s not exist.', spaceId, groupId);
  }else{
    var doc = _.chain(group.rules).remove(ruleId).value();
    logger.debug('[removeRule] %j', doc);
    //mapping to router
    this.refreshRouter(spaceId);
    return doc;
  }
};

Mocker.prototype.moveRule = function(fromSpaceId, fromGroupId, ruleId, toSpaceId, toGroupId, toIndex, isCopy){
  var fromGroup = this.getGroup(fromSpaceId, fromGroupId);
  var toGroup = this.getGroup(toSpaceId, toGroupId);

  //copy or move
  var rule;
  if(isCopy){
    rule = this.getRule(fromSpaceId, fromGroupId, ruleId);
    delete rule.id;
  }else{
    rule = this.removeRule(fromSpaceId, fromGroupId, ruleId);
  }

  //check
  if(!rule){
    throw this.errorHandler('src rule no found space#%s.group#%s.rule#%s', fromSpaceId, fromGroupId, ruleId)
  }
  if(!toGroup){
    throw this.errorHandler('target no found space#%s.group#%s', toSpaceId, toGroupId)
  }

  //insert rule
  rule = this.updateRule(toSpaceId, toGroupId, rule);

  //move to index
  if(toIndex){
    toGroup.rule.pop();
    toGroup.rule.splice(toIndex, 0, rule);
  }

  return {
    rule: rule,
    fromGroup: fromGroup,
    toGroup: toGroup
  };
};


/**
 * error handler
 * @param {String} msg The msg tpl
 * @param {*} args The arguments pass to tpl
 * @returns {Error} Returns Error
 */
Mocker.prototype.errorHandler = function(msg, args){
  var output = util.format(msg, Array.prototype.slice.call(arguments, 1));
  return new Error(output);
};
