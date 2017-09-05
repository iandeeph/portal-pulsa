var mysql = require('promise-mysql');
var _ = require('lodash');

//source : http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
var db_config = {
    host         : 'localhost',
    user         : 'root',
    password     : 'c3rmat',
    insecureAuth : 'true',
    database     : 'dbinventory'
};

var inventoryConn;

function handleDisconnect() {
    inventoryConn = mysql.createPool(db_config); // Recreate the connection, since
    // the old one cannot be reused.

    inventoryConn.getConnection(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    inventoryConn.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

exports.userLocation = function(idUser) {
    var location = "";
    var locQry = 'SELECT ' +
        'location ' +
        'FROM dbinventory.user ' +
        'WHERE iduser = "'+ idUser +'" ' +
        'limit 1';

    return inventoryConn.query(locQry).then(function(rowLocation) {
        location = rowLocation[0].location;

        return location;
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
};

exports.lastUser = function(idItem) {
    var lastIdUser = "";
    var qry = "SELECT lastIdUser from dbinventory.item where idinventory = '" + idItem + "' limit 1";

    return inventoryConn.query(qry).then(function(rows) {
        lastIdUser = rows[0].lastIdUser;

        return lastIdUser;
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
};