/* Atlassian M.E.A.T.
 * Authors: Adam Ahmed, Martin Jopson, Stephen Russell, Robert Smart
 * (c) 2011 Atlassian Pty Ltd.
 * Atlassian M.E.A.T. may be freely distributed under the MIT license.
 */

var connect = require("connect");
var server = connect.createServer(
    connect.favicon()
  , connect.logger()
  , connect.static(process.argv[2] || __dirname + "/public")
);
server.listen(process.argv[3] || process.env.C9_PORT || 80);