const mongoose = require('mongoose');

function isValidObjectId(id) {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id);
}

module.exports = { isValidObjectId };