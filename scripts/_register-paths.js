const path = require("path");
require("tsconfig-paths").register({
  baseUrl: path.resolve(__dirname, "..", "src"),
  paths: { "@/*": ["*"] },
});
