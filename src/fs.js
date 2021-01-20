const fs = require("fs");
const util = require("util");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const exists = util.promisify(fs.exists);

module.exports = {
  readFile,
  writeFile,
  unlink,
  exists,
};
