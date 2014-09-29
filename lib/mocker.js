exports = module.exports = Mocker;
exports.Rule = require('./rule');
exports.Handler = require('./handler');

var low = require('./low-patch');
var express = require('express');
var _ = require('lodash');
var logger = require('log4js').getLogger('supermocker');

var Handler = exports.Handler;
var Rule = exports.Rule;

/**
 * Mocker
 *
 * @param {String} [dbPath] The db path, if undefined then use memory
 * @constructor
 */
function Mocker(dbPath){
  this.dbPath = dbPath;
  this.db = low(this.dbPath);
  this.spaces = this.db('spaces');
  this.groups = this.db('groups');
  this.rules = this.db('rules');
  this.router = express.Router();
  this.refreshRouter();
}

/**
 * remount router
 *
 * @param {String} [id] The space id, if provide will only refresh special space's router
 */
Mocker.prototype.refreshRouter = _.debounce(function(id){
  var self = this;
  var targetSpaces;

  //check if only update special space
  var space = self.spaces.get(id).value();
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
    var detail = self.getSpaceDetail(space.id);
    if(detail && detail.rules) {
      detail.rules.forEach(function(group){
        var groupRouter = express.Router();
        spaceRouter.use(groupRouter);
        group.forEach(function(rule){
          var handler = Handler.get(rule);
          handler.name = rule.id;
          groupRouter[rule.method]('/' + rule.path, handler);
          //console.log('/' + space.path + '/' + rule.path, rule.method)
        });
      });
    }
  });
  logger.debug('refreshRouter');
}, 100);

/**
 * list all spaces
 * @returns {Array} Returns all spaces
 */
Mocker.prototype.listSpace = function(){
  return this.spaces.value();
};

/**
 * get space detail, {space: {}, groups: [], rules:[]}
 * @param {String} id The space id
 * @returns {Object} Return space detail
 */
Mocker.prototype.getSpaceDetail = function(id){
  var self = this;
  var result = {};
  var space = this.spaces.get(id).value();
  if(space){
    result.space = space;
    result.groups = [];
    result.rules = [];
    space.groupIds.forEach(function(groupId){
      var group = self.groups.get(groupId).value();
      if(group){
        var temp = [];
        result.groups.push(group);
        result.rules.push(temp);
        if(group.ruleIds){
          group.ruleIds.forEach(function(ruleId){
            var rule = self.rules.get(ruleId).value();
            if(rule){
              temp.push(rule);
            }
          });
        }
      }
    });
  }
  return result;
};

/**
 * add space
 * @param {String} path The space's path, not allow to be duplicate
 * @param {String} [description] The space's description
 * @returns {Object} Returns the new space item
 */
Mocker.prototype.addSpace = function(path, description){
  if(!path) {
    logger.warn('addSpace, path is null');
    return null;
  }else {
    path = path.replace(/^\//, '');
    var space = this.spaces.find({path: path}).value();
    if (space) {
      logger.warn('space path is exist: %s at space: %j', path, space);
      return null;
    } else {
      var doc = this.spaces.insert({
        path: path,
        description: description,
        groupIds: []
      }).value();

      //mapping to router
      this.refreshRouter(doc.id);
      return doc;
    }
  }
};

/**
 * update space
 *
 * @param {Object} attr The space, groupIds is not allow to change
 * @returns {Object} Returns new space item, if path exist, will return null
 */
Mocker.prototype.updateSpace = function(attr){
  if(!attr || !attr.id || !attr.path){
    logger.warn('updateSpace, invaid input: %j', attr);
    return null;
  }else{
    //space's path is not allow to duplicate
    attr.path = attr.path.replace(/^\//, '');
    var space = this.spaces.find({path: attr.path}).value();
    if(space && space.id != attr.id){
      logger.warn('space path is exist: %s at space: %j', attr.path, space);
      return null;
    }else{
      space = this.spaces.get(attr.id).value();
      //not allow to change groupIds
      //if(attr.groupIds && _.xor(space.groupIds, attr.groupIds).length > 0){
      //  logger.warn('space#%d\'s groupIds is not allow to change: %j -> %j', space.id, space.groupIds, attr.groupIds);
      //}
      delete attr.groupIds;
      var doc = this.spaces.update(attr.id, attr).value();
      //mapping to router
      this.refreshRouter();
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
  if(doc && doc.groupIds){
    doc.groupIds.forEach(function(groupId){
      var group = self.groups.remove(groupId).value();
      if(group && group.ruleIds){
        group.ruleIds.forEach(function(ruleId){
          self.rules.remove(ruleId);
        });
      }
    });
  }
  logger.debug('removeSpace : %j and its groups/rules', doc);
  //mapping to router
  self.refreshRouter();
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
    logger.warn('space#%d not exist: %s ', spaceId);
  }else if( _.xor(space.groupIds, groupIds).length > 0){
    //not allow to change groupIds
    logger.warn('space#%d\'s groupIds is not allow to change: %j -> %j', space.id, space.groupIds, groupIds);
  }else{
    logger.debug('sort space#%d\'s groupIds: %j ', space.id, groupIds);
    var doc = this.spaces.updateWhere({id: spaceId}, {groupIds: groupIds}).value();
    //mapping to router
    this.refreshRouter(spaceId);
    return doc;
  }
};

/**
 * add group
 *
 * @param {String} spaceId The space's id
 * @param {String} name The group name
 * @param {Number} [index] The insert place
 * @returns {Object} Returns the new group item
 */
Mocker.prototype.addGroup = function(spaceId, name, index){
  var space = this.spaces.get(spaceId).value();
  if (!space) {
    logger.warn('space#%d not exist', spaceId);
    return null;
  } else if(!name) {
    logger.warn('addGroup, name is not allow to be null');
    return null;
  }else {
    var group = this.groups.insert({
      name: name,
      ruleIds: []
    }).value();
    //update space's groupId
    if(index === undefined){
      index = space.groupIds.length;
    }
    space.groupIds.splice(index, 0, group.id);

    logger.debug('addGroup : %j to space#%s', group, space.path);
    return group;
  }
};

/**
 * update group
 *
 * @param {Object} attr The group, ruleIds is not allow to change
 * @returns {Object} Returns the modified group
 */
Mocker.prototype.updateGroup = function(attr){
  if(!attr || !attr.id || !attr.name){
    logger.warn('updateGroup, invaid input: %j', attr);
    return null;
  }else{
    var group = this.groups.get(attr.id);
    if(!group){
      logger.warn('group not found: %j', attr);
      return null;
    }else{
      //not allow to change ruleIds
      //if (_.xor(group.ruleIds, attr.ruleIds).length > 0) {
      //  logger.warn('group#%d\'s ruleIds is not allow to change: %j -> %j', group.id, group.ruleIds, attr.ruleIds);
      //}
      delete attr.ruleIds;
      //update
      var doc = this.groups.update(attr.id, attr).value();
      logger.debug('updateGroup : %j', doc);
      return doc;
    }
  }
};

/**
 * remove group item && own rules
 *
 * @param {String} id The group's id
 * @param {String} spaceId The space's id
 * @returns {Object} Returns removed group
 */
Mocker.prototype.removeGroup = function(id, spaceId){
  if(!id || !spaceId){
    logger.warn('removeGroup, groupId#%s or spaceId#%s is undefined', id, spaceId);
    return null;
  }else {
    var self = this;
    var group = this.groups.remove(id).value();
    if (group) {
      //remove mapping from space
      var space = this.spaces.get(spaceId).value();
      if (space) {
        _.remove(space.groupIds, function (groupId) {
          return groupId === group.id;
        });
        this.spaces.update(space.id, space);
      }
      //remove own rules
      if (group.ruleIds) {
        group.ruleIds.forEach(function (ruleId) {
          self.rules.remove(ruleId);
        });
      }
    }
    logger.debug('removeGroup : %j and its rules', group);
    //mapping to router
    self.refreshRouter();
    return group;
  }
};

/**
 * sort group's rules
 *
 * @param {String} groupId The group id
 * @param {Array} ruleIds The new ruleIds, if not equal will fail
 * @returns {Object} Returns the modified group
 */
Mocker.prototype.sortRule = function(groupId, ruleIds){
  var group = this.groups.get(groupId).value();
  if (!group) {
    logger.warn('group#%d not exist', groupId);
    return null;
  }else if( _.xor(group.ruleIds, ruleIds).length > 0){
    //not allow to change groupIds
    logger.warn('group#%d\'s ruleIds is not allow to change: %j -> %j', group.id, group.ruleIds, ruleIds);
  }else{
    logger.debug('sort group#%d\'s ruleIds: %j ', group.id, ruleIds);
    var doc = this.groups.updateWhere({id: groupId}, {ruleIds: ruleIds}).value();
    //mapping to router
    this.refreshRouter();
    return doc;
  }
};

/**
 * add rule
 *
 * @param {String} groupId The group id
 * @param {Object} attr The rule defined
 * @param {Number} [index] The insert place
 * @returns {Object} Returns the new rule item
 */
Mocker.prototype.addRule = function(groupId, attr, index){
  var group = this.groups.get(groupId).value();
  if (!group) {
    logger.warn('group#%d not exist', groupId);
    return null;
  } else if(!attr.path){
    logger.warn('addRule, attr is not valid: %j', attr);
    return null;
  }else {
    attr.path = attr.path.replace(/^\//, '');
    attr.type = attr.type || 'static';
    attr.method = (attr.method || 'ALL').toLowerCase();
    var rule = this.rules.insert(attr).value();

    //update group's ruleIds
    if(index === undefined){
      index = group.ruleIds.length;
    }
    group.ruleIds.splice(index, 0, rule.id);

    logger.debug('addRule : %j to group#%s', rule, group.id);
    //mapping to router
    this.refreshRouter();
    return rule;
  }
};

/**
 * update rule
 *
 * @param {Object} attr The rule
 * @returns {Object} Returns the modified rule item
 */
Mocker.prototype.updateRule = function(attr){
  if(!attr || !attr.id || !attr.path){
    logger.warn('updateRule, invaid input: %j', attr);
    return null;
  }else {
    attr.path = attr.path.replace(/^\//, '');
    attr.method = (attr.method || 'ALL').toLowerCase();
    logger.debug('updateRule : %j', attr);
    var doc = this.rules.update(attr.id, attr).value();
    //mapping to router
    this.refreshRouter();
    return doc;
  }
};

/**
 * remove rule item
 *
 * @param {String} id The rule's id
 * @param {String} groupId The group's id
 * @returns {Object} Returns removed rule
 */
Mocker.prototype.removeRule = function(id, groupId){
  if(!id || !groupId){
    logger.warn('removeRule, ruleId#%s or groupId#%s is undefined', id, groupId);
    return null;
  }else {
    var rule = this.rules.remove(id).value();
    if (rule) {
      var group = this.groups.get(groupId).value();
      if (group) {
        _.remove(group.ruleIds, function (ruleId) {
          return ruleId === rule.id;
        });
        this.groups.update(group.id, group);
      }
    }
    logger.debug('removeRule : %j', rule);
    //mapping to router
    this.refreshRouter();
    return rule;
  }
};
