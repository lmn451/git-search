const sinon = require("sinon");

global.afterEach?.(() => {
  sinon.restore();
});
