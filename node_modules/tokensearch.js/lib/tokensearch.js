'use strict';
/*
 * tokensearch.js: simple string token collection search
 *
 * (C) 2015 Michael Vogt
 * MIT LICENSE
 *
 */
 const Tokensearch = function(_collection, options) {
  if (!_collection || _collection.length===0) {
    throw new Error('Empty collection!');
  }
  options = options || {};
  this.delimiter = options.delimiter || Tokensearch.defaultOptions.delimiter;
  this.unique = options.unique || Tokensearch.defaultOptions.unique;
  this.maxFilterTokenEntries = options.maxFilterTokenEntries || Tokensearch.defaultOptions.maxFilterTokenEntries;
  this.defaultThreshold = options.threshold || Tokensearch.defaultOptions.threshold;
  this.collectionKeys = options.collectionKeys || Tokensearch.defaultOptions.collectionKeys;
  this.searchAlgorithm = options.searchAlgorithm || Tokensearch.defaultOptions.searchAlgorithm;
  this.sortAlgorithm = options.sortAlgorithm || Tokensearch.defaultOptions.sortAlgorithm;
  this.postprocessAlgorithm = options.postprocessAlgorithm || Tokensearch.defaultOptions.postprocessAlgorithm;
  if (this.collectionKeys.length===0) {
    throw new Error('No collectionKeys defined!');
  }
  this.collectionDataTokenSize = this.collectionKeys.length;

  //TODO do not pollute the source collection!
  this.collection = _collection;
  this.collection
    .forEach((entry) => {
      const tmp = this.collectionKeys.reduce((dataEntryTokens, key) => {
        const splitAttributeEntry = entry[key]
          .trim()
          .toLowerCase()
          .split(this.delimiter);
        return dataEntryTokens.concat(splitAttributeEntry);
      }, []);
      entry.dataEntryTokens = [...new Set(tmp)];
    });
};

Tokensearch.defaultOptions = {
  //split strings with a delimiters, can be a regex or a character
  delimiter: /[\s-_]+/,

  // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
  // (of both letters and location), a threshold of '1.0' would match anything.
  threshold: 0.7,

  // How many search tokens are considered
  maxFilterTokenEntries: 5,

  // search key
  collectionKeys: [],

  //the result just contains unique results (based on collection keys)
  unique: false,

  //used to pre-verify an entry
  preprocessCheck: function() {
    return true;
  },

  // search all 'needles' in the 'haystack', return a score for each function call
  searchAlgorithm: function(haystack, needles) {
    return needles
      .reduce((score, needle) => {
        const stringPos = haystack.indexOf(needle);
        if (stringPos === -1) {
          return score;
        }
        if (needle.length < 2) {
          return score + 1;
        }
        if (haystack === needle) {
          return score + 6;
        }
        if (stringPos === 0) {
          return score + 2;
        }
        return score + 1;
      }, 0);
  },

  //postprocess all elements (=contains all elements with a score)
  postprocessAlgorithm: function(collection, maxScore, threshold) {
    const normalizedScore = 1 / maxScore;
    const result = [];
    const ids = [];
    collection.forEach(e => {
      e.score = 1-e.score*normalizedScore;
      if (e.score <= threshold) {
        e.maxScore = maxScore;
        let id = '';
        this.collectionKeys.forEach(key => {
          id += '' + e.item[key];
        });

        if (this.unique) {
          if (ids.indexOf(id) === -1) {
            ids.push(id);
            result.push(e);
          }
        } else {
          result.push(e);
        }
      }
    });
    return result;
  },

  // sort the result array (=output of the postprocess step)
  sortAlgorithm: function(array) {
    return array.sort(function(a, b) {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.item.name < b.item.name ? -1 : a.item.name > b.item.name;
    });
  }
};

function _onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

/**
 * returns an sorted array of { 'item': OBJECT, 'score': score }
 * -item contains the input object
 * -score defines the match with the search term, 0 means perfect match, 1 means rubbish
 */
Tokensearch.prototype.search = function(token, options) {
  options = options || {};

  const searchTokens = [];
  const threshold = options.customThreshold || this.defaultThreshold;
  const preprocessCheck = options.preprocessCheck || Tokensearch.defaultOptions.preprocessCheck;

  const tmp = token.trim().split(this.delimiter).filter(_onlyUnique);
  for (let i = 0, len = Math.min(tmp.length, this.maxFilterTokenEntries); i < len; i++) {
    searchTokens.push(tmp[i].toLowerCase());
  }

  const resultTmp = [];
  let maxScore = 0;
  this.collection.forEach(entry => {
    if (preprocessCheck && !preprocessCheck(entry)) {
      return;
    }

    const score = entry.dataEntryTokens.reduce((score, dataEntryToken) => {
      return score + this.searchAlgorithm(dataEntryToken, searchTokens);
    }, 0);

    if (score) {
      if (score > maxScore) {
        maxScore = score;
      }

      // we "pollute" to original collection with dataEntryTokens - remove them for the result
      const clone = entry.constructor();
      for (let attr in entry) {
        if (entry.hasOwnProperty(attr) && attr !== 'dataEntryTokens') {
          clone[attr] = entry[attr];
        }
      }
      resultTmp.push({ item: clone, score });
    }
  });

  const result = this.postprocessAlgorithm(resultTmp, maxScore, threshold);
  return this.sortAlgorithm(result);
};

/**
 * search for a custom entry
 */
Tokensearch.prototype.findFirstExactMatch = function(cb) {
  if (typeof cb !== 'function') {
    return;
  }
  for (let i=0, len=this.collection.length; i < len; i++) {
    const entry = this.collection[i];
    if (cb(entry)) {
      return entry;
    }
  }
};

module.exports = Tokensearch;
