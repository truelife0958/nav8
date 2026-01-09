// Use native bcrypt for better performance
// If bcrypt fails to load (missing native bindings), throw a clear error
let bcrypt;

try {
  bcrypt = require('bcrypt');
} catch (err) {
  console.error('❌ Failed to load bcrypt. Please ensure native dependencies are installed:');
  console.error('   npm rebuild bcrypt');
  console.error('   or reinstall: npm uninstall bcrypt && npm install bcrypt');
  throw new Error('bcrypt module failed to load: ' + err.message);
}

module.exports = bcrypt;
