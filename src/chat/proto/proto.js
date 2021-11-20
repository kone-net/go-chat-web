/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
// "use strict";

var $protobuf = require("protobufjs/light");

var $root = ($protobuf.roots["default"] || ($protobuf.roots["default"] = new $protobuf.Root()))
.addJSON({
  protocol: {
    nested: {
      Message: {
        fields: {
          avatar: {
            type: "string",
            id: 1
          },
          fromUsername: {
            type: "string",
            id: 2
          },
          from: {
            type: "string",
            id: 3
          },
          to: {
            type: "string",
            id: 4
          },
          content: {
            type: "string",
            id: 5
          },
          contentType: {
            type: "int32",
            id: 6
          },
          type: {
            type: "string",
            id: 7
          },
          messageType: {
            type: "int32",
            id: 8
          },
          url: {
            type: "string",
            id: 9
          },
          file: {
            type: "bytes",
            id: 10
          }
        }
      }
    }
  }
});

module.exports = $root;
