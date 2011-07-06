/* Atlassian M.E.A.T.
 * Authors: Adam Ahmed, Martin Jopson, Stephen Russell, Robert Smart
 * (c) 2011 Atlassian Pty Ltd.
 * Atlassian M.E.A.T. may be freely distributed under the MIT license.
 */

var connect = require("connect");
var server = connect.createServer(
    connect.favicon()
  , connect.logger()
  , connect.static(process.argv[3] || __dirname + "/public")
);
server.listen(process.env.C9_PORT || process.argv[2] || 80);