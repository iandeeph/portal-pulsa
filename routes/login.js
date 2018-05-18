var express         = require('express');
var router          = express.Router();
var _               = require('lodash');
var mysql           = require('promise-mysql');
var Promise         = require('bluebird');
var crypto          = require('crypto');

//source : http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
var db_config = {
    host         : 'localhost',
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

    var mykey = crypto.createCipher('aes-128-cbc', 'Cermat123hebat');
    var mystr = mykey.update(postPassword, 'utf8', 'hex');
    mystr += mykey.final('hex');
    //console.log(mystr);

    agenPulsaConn.query('SELECT * FROM user').then(function(users) {
        //console.log(users);
        var loginPromise = new Promise(function (resolve, reject) {
            resolve(_.filter(users, {'username' : postUsername , 'password' : mystr}));
        });
        loginPromise.then(function(loginItem) {
            if (_.isEmpty(loginItem)){
                res.render('login',{
                    layout: 'login',
                    message : 'Username atau Password Salah..!!'
                });
            }else{
                req.session.login       = 'loged';
                req.session.username    = loginItem[0].username;
                req.session.name        = loginItem[0].name;
                req.session.privilege   = loginItem[0].privilege;
                res.writeHead(301,
                    {Location: '/'}
                );
                res.end();
            }
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

module.exports = router;