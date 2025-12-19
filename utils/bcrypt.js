let bcrypt;

try {
  bcrypt = require('bcrypt');
} catch (err) {
  bcrypt = require('bcryptjs');
}

module.exports = bcrypt;
