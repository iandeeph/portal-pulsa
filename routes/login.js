var express = require('express');
var router = express.Router();
var _ = require('lodash');
var mysql = require('promise-mysql');
var Promise = require('bluebird');
var moment = require('moment');
var utils = require('../utils');
var currencyFormatter = require('currency-formatter');

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

/* GET Login page. */
router.get('/', function(req, res, next) {
    res.render('login',{
        layout: 'login'
    });
});

/* POST Login page. */
router.post('/', function(req, res, next) {
    var postUsername = req.body.login_username;
    var postPassword = req.body.login_password;
    agenPulsaConn.query('SELECT * FROM user').then(function(users) {
        var postResult = users.filter(function (user) { return ( user.name == postUsername && user.password == postPassword ) });
        console.log(postResult);
        if (_.isNull(postResult)){
            res.render('login',{
                layout: 'login'
            });
        }else{
            res.writeHead(301,
                {Location: 'http://1.1.1.200:3000/'}
            );
            res.end();
        }

    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

module.exports = router;