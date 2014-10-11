//patch lowdb

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var Low = require('lowdb');

exports = module.exports = function(fileName){
  //`mkdir -p` if not exist
  if (fileName && !fs.existsSync(fileName)) {
    mkdirp.sync(path.dirname(fileName));
  }
  return Low(fileName);
};

Low.mixin(require('underscore-db'));

Low.mixin({
  /**
   * Create id for new document object.
   *
   * @param {Array} collection
   * @param {Object} attrs  Document object
   * @memberOf _
   */
  createId: function(collection, attrs) {
    var key = this.__id() || 'id';
    if (this.isEmpty(collection)) {
      return '1';
    } else {
      var maxId = this.max(this.pluck(collection, key), function(id) {
        return Number(id);
      });
      return String(Number(maxId) + 1);
    }
  },

  /**
   * insert or update collection
   *
   * @param {Array} collection
   * @param {Object} attrs  Document object
   * @param {Boolean} [replace] If true, will remove all property of the origin object
   * @memberOf _
   * @returns {Object} The new document object
   */
  insertOrUpdate: function(collection, attrs, replace){
    var id = attrs[this.__id()];
    var doc = id && this.get(collection, id);
    if (doc){
      if(replace){
        this.each(doc, function(value, key) {
          delete doc[key];
        });
      }
      this.__update(doc, attrs);
    }else{
      delete attrs[this.__id()];
      doc = this.insert(collection, attrs);
    }
    return doc;
  },

  /**
   * query data, if conditions is empty will return collection, otherwise using `where`
   *
   * @param {Array} collection
   * @param {Object} [conditions] query conditions, will remove value === undefined
   * @memberOf _
   * @returns {*}
   */
  query: function(collection, conditions){
    var conditions = this.pick(conditions, function(value) {
      return value !== undefined;
    });
    if(!conditions || Object.keys(conditions).length==0){
      return collection
    }else{
      return this.where(collection, conditions);
    }
  },

  /**
   * sort collection by idArr, will modify origin collection
   *
   * @param {Array} collection
   * @param {Array} newOrderArr The new order, value is id
   * @memberOf _
   * @returns {Array} Return the collection
   */
  sortById: function(collection, newOrderArr){
    var self = this;
    var arr = this.map(newOrderArr, function(id){
      return self.get(collection, id);
    });
    collection.splice(0, collection.length);
    Array.prototype.push.apply(collection, arr);
    return collection;
  }
});