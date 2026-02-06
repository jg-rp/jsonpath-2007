function createLRUCache(maxSize) {
  var items = {};
  var keys = []; // Most recently used at end

  function touch(key) {
    var i;
    for (i = 0; i < keys.length; i++) {
      if (keys[i] === key) {
        keys.splice(i, 1);
        break;
      }
    }
    keys.push(key);
  }

  function get(key) {
    if (items[key] !== undefined) {
      touch(key);
      return items[key];
    }
    return null;
  }

  function set(key, value) {
    if (items[key] !== undefined) {
      items[key] = value;
      touch(key);
      return;
    }

    items[key] = value;
    keys.push(key);

    if (keys.length > maxSize) {
      var oldest = keys.shift();
      delete items[oldest];
    }
  }

  function has(key) {
    return items[key] !== undefined;
  }

  function clear() {
    items = {};
    keys.length = 0;
  }

  return {
    get: get,
    set: set,
    has: has,
    clear: clear
  };
}
