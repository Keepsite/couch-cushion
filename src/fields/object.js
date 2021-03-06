'use strict';

var debug = require('debug')('couch-cushion:fields:object');

var Field = require('../field');


function FieldObject() {
    this.allowOptions('isArray');
    Field.apply(this, arguments);

    if (!this._value) this.set({});
}

FieldObject.prototype = Object.create(Field.prototype);
FieldObject.prototype.constructor = FieldObject;

/**
 * Returns the actual value so we can manipulate it directly
 */
FieldObject.prototype.object =
FieldObject.prototype.getObject =
function getObject() {
    return this._value;
};

/**
 * Returns this, so that we can have access to all of our functions and such
 */
FieldObject.prototype.get = function get() {
    return this;
};

/**
 * Sets the value, updates any extra properties
 */
FieldObject.prototype.set = function set(value) {
    if (!value || typeof(value) !== 'object')
        throw new Error('attempted to set a non-object-like value on object field');

    if (Array.isArray(value))
        this.options.isArray = true;
    else
        this.options.isArray = false;

    this._value = value;
};


/**
 * Try and save all of the elements of the object
 */
FieldObject.prototype.save = function saveObject(cb, db) {
    var saves = [];
    for (var key in this._value) {
        var value = this._value[key];
        if (value && value.save && typeof(value.save) === 'function')
            saves.push(value.save.bind(value));
    }

    require('async').each(saves, function(save, cb) {
        save(cb, db);
    }, function (err) {
        if (cb && typeof(cb) === 'function') cb(err);
    });

    debug('saving field: object', this.getValue());

    return this;
};


/**
 * Walk through an object or array and get a value representing it
 */
function walkValue(object, isArray, getAll) {
    var results = isArray ?  [] : {} ;

    for (var key in object) {
        var value = object[key];

        // It's a model that has a getInlint function defined, use that
        if (value && typeof(value.getInline) === 'function')
            results[key] = value.getInline();

        // It's a model of some type, use it's getValue function
        else if (value && typeof(value.getValue) === 'function')
            results[key] = (value.getValue(getAll));

        // No get value function, so it's just a regular ol' object
        else if (value && typeof(value) === 'object')
            results[key] = walkValue(value, Array.isArray(value));

        else
            results[key] = (value);
    }

    return results;
}


FieldObject.prototype.getValue = function getValue(getAll) {
    return walkValue(this._value, this.options.isArray, getAll);
};


// Create a property for easier dealing with the object
Object.defineProperty(FieldObject.prototype, '_', {
    get: FieldObject.prototype.getObject,
    set: FieldObject.prototype.set
});

module.exports = FieldObject;
