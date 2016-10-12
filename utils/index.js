var mysql = require('promise-mysql');
var _ = require('lodash');

//source : http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
var db_config = {
    host         : '1.1.1.200',
    user         : 'root',
    password     : 'c3rmat',
    insecureAuth : 'true',
    database     : 'db_agen_pulsa'
};

var agenPulsaConn;

function handleDisconnect() {
    agenPulsaConn = mysql.createPool(db_config); // Recreate the connection, since
    // the old one cannot be reused.

    agenPulsaConn.getConnection(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    agenPulsaConn.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

exports.stringToArray =  function(str) {
    var coordinates = str.split( "\n" );
    var results = [];

    for( var i = 0; i < coordinates.length; ++i ) {
        var check = coordinates[ i ].match( /(X.*) (Y.*)/ );

        if( !check ) {
            throw new Error( "Invalid coordinates: " + coordinates[ i ] );
        }

        results.push( check[ 1 ] );
        results.push( check[ 2 ] );
    }

    return results;
};

exports.findTrunk =  function(phone) {
    var trunk = "";
    var trunkQry = 'SELECT ' +
        'noProvider as phone, ' +
        'namaProvider as trunk ' +
        'FROM provider ' +
        'WHERE noProvider = "'+ phone +'" ' +
        'limit 1';

    return agenPulsaConn.query(trunkQry).then(function(rowTrunks) {
        trunk = rowTrunks[0].trunk;

        console.log("lodash echo : "+ _.isUndefined(rowTrunks[0].trunk));

        console.log("Find trunk log : " + trunk);

        return trunk;
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
};

exports.sisaSaldo = function(){
    var saldo = "";
    var saldoQry = 'SELECT ' +
        'saldo as sisaSaldo ' +
        'FROM saldos';

    return agenPulsaConn.query(saldoQry).then(function(rowSaldo) {
        saldo = ((rowSaldo[0].sisaSaldo)? rowSaldo[0].sisaSaldo:0);
        console.log("sisaSaldo log : "+ saldo);
        return saldo;
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
};

exports.daysInMonth = function(month,year) {
    return new Date(year, month, 0).getDate();
};