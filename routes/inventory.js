var express     = require('express');
var router      = express.Router();
var _           = require('lodash');
var mysql       = require('promise-mysql');
var Promise     = require('bluebird');
var moment      = require('moment');
var multer      = require('multer');
var csv         = require('csv-parser');
var fs          = Promise.promisifyAll(require("fs"));
var neatCsv     = require('neat-csv');
var utils = require('../utilsInventory');

var uploading = multer({
    dest: __dirname + '/../public/uploads/'
});

var dateNow = moment().format("YYYY-MM-DD HH:mm:ss");
var inventoryLocation = '2';

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

/* GET inventory home page. */
router.get('/', function(req, res, next) {
    inventoryConn.query("select " +
        "t1.jumlah as total, t1.nama as nama, t1.id as id, t2.jumlah_stock as stock " +
        "from " +
        "(select " +
        "t.a as jumlah, t.id as id, category.name as nama " +
        "from " +
        "(SELECT " +
        "count(*) as a, idcategory as id " +
        "FROM " +
        "item " +
        "group by idcategory) t " +
        "left join category ON t.id = category.idcategory) t1 " +
        "left join " +
        "(select " +
        "count(*) as jumlah_stock, idcategory as id " +
        "from " +
        "item " +
        "where " +
        "iduser = 0 " +
        "group by idCategory) t2 ON t1.id = t2.id").then(function(rowItems) {

        res.render('inventory-index', {
            rowItems: rowItems,
            layout: 'inventory'
        });
    })
        .catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET inventory recap by item page. */
router.get('/rekapitulasi', function(req, res, next) {
    inventoryConn.query("SELECT " +
    "t.id id, " +
        "t.tgl_masuk tgl_masuk, " +
        "t.tgl_keluar tgl_keluar, " +
        "t.nama nama, " +
        "t.jenis jenis, " +
        "t.sn sn, " +
        "t.status status, " +
        "t.user user, " +
        "t.userdivision userdivision, " +
        "user.name lastuser, " +
        "user.division lastuserdivision, "+
        "t.lokasi lokasi, " +
        "t.keterangan keterangan " +
    "FROM " +
    "(SELECT " +
    "idinventory id, " +
        "DATE_FORMAT(datein, '%e %b %Y - %k:%i') tgl_masuk, " +
        "DATE_FORMAT(dateout, '%e %b %Y - %k:%i') tgl_keluar, " +
        "item.name nama, " +
        "item.idcategory jenis, " +
        "item.serialNumber sn, " +
        "item.status, " +
        "user.name user, " +
        "user.division userdivision, " +
        "lastIdUser lastuserdivision, " +
        "item.location lokasi, " +
        "notes keterangan " +
    "FROM " +
    "dbinventory.item " +
    "left join dbinventory.user ON item.iduser = user.iduser) t " +
    "left join " +
    "user ON t.lastuserdivision = user.iduser " +
    "ORDER BY left(id, 1) , length(id) , id").then(function(rowByItem) {
        res.render('inventory-rekapitulasi', {
            rows: rowByItem,
            layout: 'inventory'
        });
    })
        .catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET inventory user page. */
router.get('/user', function(req, res, next) {
    inventoryConn.query("SELECT " +
        "iduser, name nama, location lokasi, position posisi, division divisi, status " +
        "FROM " +
        "user " +
        "order by location, nama")
        .then(function(rowUser) {
            res.render('inventory-user', {
                rowUser: rowUser,
                layout: 'inventory'
            });
        })
        .catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET inventory admin user page. */
router.get('/admin-user', function(req, res, next) {
    inventoryConn.query("SELECT " +
        "idadmin id, username, password, name, privilege " +
        "FROM " +
        "admin " +
        "order by username")
        .then(function(rowAdmin) {
            res.render('inventory-admin', {
                rowAdmin: rowAdmin,
                layout: 'inventory'
            });
        })
        .catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET inventory log activity page. */
router.get('/log', function(req, res, next) {
    inventoryConn.query("SELECT " +
        "idlog id, DATE_FORMAT(date, '%e %b %Y - %k:%i') as tanggal, user, action, value " +
        "FROM " +
        "log " +
        "order by date DESC")
        .then(function(rowLog) {
            res.render('inventory-log', {
                rowLog: rowLog,
                layout: 'inventory'
            });
        })
        .catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET inventory log activity page. */
router.get('/card', function(req, res, next) {
    res.render('inventory-card', {
        layout: 'inventory'
    });
});

/* GET inventory new item page. */
router.get('/add-stock', function(req, res, next) {
    res.render('inventory-add-stock', {
        layout: 'inventory'
    });
});
/* GET inventory new item page. */
router.get('/add-stock-csv', function(req, res, next) {
    res.render('inventory-add-stock', {
        layout: 'inventory'
    });
});

/* POST inventory new item by csv page. */
router.post('/add-stock-csv', uploading.single('csvFiles'), function(req, res, next) {
    var dateNow = moment().format("YYYY-MM-DD HH:mm:ss");
    var arrayQueryValue = [];
    var arrayLogValue = [];
    var csvData = [];

    var stream = csv({
        raw: false,     // do not decode to utf-8 strings
        separator: ',', // specify optional cell separator
        quote: '"',     // specify optional quote character
        escape: '"',    // specify optional escape character (defaults to quote value)
        newline: '\n',  // specify a newline character
        headers: ['category', 'id', 'name', 'sn', 'lokasi', 'note'] // Specifing the headers
    });

    var postFileData = req.file || {};



    csvFilePath = _.get(postFileData, 'path');

    var itemsPromise = new Promise(function (resolve, reject) {
        return fs.createReadStream(csvFilePath)
            .pipe(stream)
            .on('data', function(csvrow) {
                csvData.push(csvrow);
            })
            .on('end',function() {
                resolve (Array.prototype.slice.call(csvData));
                fs.unlink(csvFilePath);
            })
            .on('error', reject);
    });

    itemsPromise.then(function(itemsCsv) {
        console.log(itemsCsv);
        return Promise.each(itemsCsv, function (item) {
            var category = item.category;
            var id = item.id;
            var nama = item.name;
            var SN = item.sn;
            var lokasi = item.lokasi;
            var catatan = item.note;

            var valueLogStr = 'ID Inventory : ' + id + ' ' +
                'Category: ' + category + ' ' +
                'Item Name : ' + nama + ' ' +
                'SN : ' + SN + ' ' +
                'Location : ' + lokasi + ' ' +
                'Notes : ' + catatan + ' ';

            //item: idinventory, datein, name, idcategory, serialNumber, status, iduser, lastIdUser, notes, lokasi
            arrayQueryValue.push([id, dateNow, nama, category, SN, 'Stock', '0', '0', catatan, lokasi]);

            //log: date, admin. action, value, iditem
            arrayLogValue.push([dateNow, 'admin', 'Add New Item(s)', valueLogStr, id]);
        }).then(function () {
            var queryString = "INSERT INTO dbinventory.item " +
                "(idinventory, datein, name, idcategory, serialNumber, status, iduser, lastIdUser, notes, location) " +
                "VALUES ?";
            var logString = "INSERT INTO dbinventory.log " +
                "(date, user, action, value, iditem) " +
                "VALUES ?";

            return inventoryConn.query(queryString, [arrayQueryValue])
                .then(function (queryResult) {
                    return inventoryConn.query(logString, [arrayLogValue])
                        .then(function (logResult) {
                            res.render('inventory-add-stock', {
                                layout: 'inventory',
                                message: "Stock berhasil ditambah.."
                            });
                        }).catch(function (error) {
                            //logs out the error
                            console.error(error);
                        });
                });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
    }).catch(function (error) {
        //logs out the error
        console.error(error);
    });
});

/* POST inventory new item by input page. */
router.post('/add-stock', function(req, res, next) {
    var arrayQueryValue = [];
    var arrayLogValue = [];
    var items = [];

    var postInputData = req.body.adds || {};

    if(!_.isNull(postInputData) || !_.isUndefined(postInputData)){
        items = Array.prototype.slice.call(postInputData);
    }

    return Promise.each(items, function (item) {
        var category = item.category;
        var id = item.id;
        var nama = item.name;
        var SN = item.sn;
        var lokasi = item.lokasi;
        var catatan = item.note;

        var valueLogStr = 'ID Inventory : ' + id + ' ' +
            'Category: ' + category + ' ' +
            'Item Name : ' + nama + ' ' +
            'SN : ' + SN + ' ' +
            'Location : ' + lokasi + ' ' +
            'Notes : ' + catatan + ' ';

        //item: idinventory, datein, name, idcategory, serialNumber, status, iduser, lastIdUser, notes, lokasi
        arrayQueryValue.push([id, dateNow, nama, category, SN, 'Stock', '0', '0', catatan, lokasi]);

        //log: date, admin. action, value, iditem
        arrayLogValue.push([dateNow, 'admin', 'Add New Item(s)', valueLogStr, id]);
    }).then(function () {
        var queryString = "INSERT INTO dbinventory.item " +
            "(idinventory, datein, name, idcategory, serialNumber, status, iduser, lastIdUser, notes, location) " +
            "VALUES ?";
        var logString = "INSERT INTO dbinventory.log " +
            "(date, user, action, value, iditem) " +
            "VALUES ?";

        return inventoryConn.query(queryString, [arrayQueryValue])
            .then(function (queryResult) {
                return inventoryConn.query(logString, [arrayLogValue])
                    .then(function (logResult) {
                        res.render('inventory-add-stock', {
                            layout: 'inventory',
                            message: "Stock berhasil ditambah.."
                        });
                    }).catch(function (error) {
                        //logs out the error
                        console.error(error);
                    });
            });
    });
});

/* GET inventory new item page. */
router.get('/new-hire', function(req, res, next) {
    var positions = {};
    var divisions = {};
    var locations = {};
    var allCat = {};
    var tasks = [];
    return inventoryConn.query("SELECT " +
        "position " +
        "FROM " +
        "dbinventory.user " +
        "group by position " +
        "order by position ASC")
        .then(function(rowPosition) {
            positions = rowPosition;
            return inventoryConn.query("SELECT " +
                "division " +
                "FROM " +
                "dbinventory.user " +
                "group by division " +
                "order by division ASC")
                .then(function(rowDivision) {
                    divisions = rowDivision;
                    return inventoryConn.query("SELECT " +
                        "idcategory " +
                        "FROM " +
                        "dbinventory.item " +
                        "WHERE iduser = '0' " +
                        "group by idcategory " +
                        "order by idcategory ASC")
                        .then(function(rowCategory){
                            return Promise.each(rowCategory, function(category){
                                allCat[category.idcategory] = [];
                                var catSqlStr = "SELECT " +
                                    "idinventory, " +
                                    "name, " +
                                    "idcategory " +
                                    "FROM dbinventory.item " +
                                    "where idcategory = '"+ category.idcategory +"' " +
                                    "and iduser = '0'";
                                var task = inventoryConn.query(catSqlStr)
                                    .then(function(rowItem){
                                        return Promise.each(rowItem, function(item) {
                                            Object.keys(allCat).forEach(function(key) {
                                                if(key == item.idcategory){
                                                    allCat[key].push({id: item.idinventory, name: item.name});
                                                }
                                            });
                                        });
                                    });
                                tasks.push(task);
                            }).then(function(a){
                                return Promise.all(tasks);
                            });
                        });

                })
        }).then(function(result){
            res.render('inventory-new-hire', {
                layout: 'inventory',
                rowPosition : positions,
                rowDivision : divisions,
                rowLocation : locations,
                rowCategory : allCat
            });
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET inventory new item page. */
router.post('/new-hire-csv',  uploading.single('csvFilesUser'), function(req, res, next) {
    var dateNow = moment().format("YYYY-MM-DD HH:mm:ss");
    var arrayUserQueryValue = [];
    var arrayUserLogValue = [];
    var insertUserString;
    var csvData = [];

    var stream = csv({
        raw: false,     // do not decode to utf-8 strings
        separator: ',', // specify optional cell separator
        quote: '"',     // specify optional quote character
        escape: '"',    // specify optional escape character (defaults to quote value)
        newline: '\n',  // specify a newline character
        headers: ['name', 'position', 'division', 'location'] // Specifing the headers
    });

    var postFileData = req.file || {};

    csvFilePath = _.get(postFileData, 'path');

    var itemsPromise = new Promise(function (resolve, reject) {
        return fs.createReadStream(csvFilePath)
            .pipe(stream)
            .on('data', function(csvrow) {
                csvData.push(csvrow);
            })
            .on('end',function() {
                resolve (Array.prototype.slice.call(csvData));
                fs.unlink(csvFilePath);
            })
            .on('error', reject);
    });

    itemsPromise.then(function(posts) {
        return Promise.each(posts, function (post) {
            var userName        = post.name;
            var userPosition    = post.position;
            var userDivision    = post.division;
            var userLocation    = post.location;

            arrayUserQueryValue.push([userName, userPosition, userDivision, userLocation]);

            var valueLogStr = '' +
                'User Name : ' + userName + ' ' +
                'Position : ' + userPosition + ' ' +
                'Division : ' + userDivision + ' ' +
                'Location : ' + userLocation + ' ';

            console.log(valueLogStr);
            //log: date, admin. action, value, iditem
            arrayUserLogValue.push([dateNow, 'admin', 'Add New User', valueLogStr, '0']);
        }).then(function () {
            insertUserString = "INSERT INTO dbinventory.user " +
                "(name, position, division, location) " +
                "VALUES ?";
            console.log(arrayUserQueryValue);
            return inventoryConn.query(insertUserString,[arrayUserQueryValue])
                .then(function () {
                    console.log(arrayUserLogValue);
                    var logString = "INSERT INTO dbinventory.log " +
                        "(date, user, action, value, iditem) " +
                        "VALUES ?";

                    return inventoryConn.query(logString,[arrayUserLogValue])
                        .then(function () {
                            res.render('inventory-new-hire', {
                                layout: 'inventory',
                                message: 'New Hire berhasil ditambah..'
                            });
                        });
                });
        });
    }).catch(function (error) {
        //logs out the error
        console.error(error);
    });
});

/* GET inventory new item page. */
router.post('/new-hire', function(req, res, next) {
    var arrayUserQueryValue = [];
    var arrayItemQueryValue = [];
    var arrayUserLogValue = [];
    var posts = [];
    var postsItems = [];
    var postUserInputs = req.body.user || {};
    if(!_.isNull(postUserInputs) || !_.isUndefined(postUserInputs)){
        posts = Array.prototype.slice.call(postUserInputs);
    }
    var postItemInputs = req.body.item || {};
    if(!_.isNull(postItemInputs) || !_.isUndefined(postItemInputs)){
        postsItems = Array.prototype.slice.call(postItemInputs);
    }

    return Promise.each(posts, function (post) {
        var userName = post.name;
        var userPosition = post.position;
        var userDivision = post.division;
        var userLocation = post.location;

        var insertUserString = "INSERT INTO dbinventory.user " +
            "(name, position, division, location) " +
            "VALUES ('"+ userName +"', '"+ userPosition +"', '"+ userDivision +"', '"+ userLocation +"')";
        return inventoryConn.query(insertUserString, arrayUserQueryValue)
            .then(function () {
                return inventoryConn.query('SELECT MAX(iduser) as id FROM dbinventory.user LIMIT 1')
                    .then(function (row) {
                        return Promise.each(postsItems, function (item) {
                            var maxId = parseInt(row[0].id);
                            //column update : dateOut, status, iduser, location || where idinventory
                            arrayItemQueryValue = "UPDATE dbinventory.item " +
                                "SET " +
                                "dateOut ='" + dateNow + "', " +
                                "status ='Used Up', " +
                                "iduser ='" + maxId + "', " +
                                "location = '"+ userLocation +"' " +
                                "WHERE idinventory = '"+ item +"'";

                            var logString = "INSERT INTO dbinventory.log " +
                                "(date, user, action, value, iditem) " +
                                "VALUES ?";

                            return inventoryConn.query(arrayItemQueryValue)
                                .then(function(){
                                    var valueLogStr = '' +
                                        'User Name : ' + userName + ' ' +
                                        'Position : ' + userPosition + ' ' +
                                        'Division : ' + userDivision + ' ' +
                                        'Location : ' + userLocation + ' ' +
                                        'ID Inventory : ' + item + ' ';

                                    //log: date, admin. action, value, iditem
                                    return arrayUserLogValue.push([dateNow, 'admin', 'Add New User', valueLogStr, ''+ item +'']);
                                }).then(function(logSql){
                                    return inventoryConn.query(logString, [arrayUserLogValue])
                                        .then(function () {
                                        });
                                })
                        }).then(function(){
                            res.render('inventory-new-hire', {
                                layout: 'inventory',
                                message : 'New Hire berhasil ditambah, item updated..'
                            });
                        });
                    });
            });

    }).catch(function (error) {
        //logs out the error
        console.error(error);
    });
});

/* GET inventory transfer ownership page. */
router.get('/transfer', function(req, res, next) {
    res.render('inventory-transfer', {
        layout: 'inventory'
    });
});

/* GET inventory import trans page. */
router.get('/export', function(req, res, next) {
    var inventory = {};
    var users = {};
    return inventoryConn.query("SELECT " +
        "idinventory id, name name, idcategory " +
        "FROM " +
        "dbinventory.item " +
        "WHERE status = 'Stock' " +
        "ORDER BY left(id, 1) , length(id) , id")
        .then(function(rowInventory) {
            inventory = rowInventory;
            return inventoryConn.query("SELECT " +
                "iduser, name, position " +
                "FROM " +
                "dbinventory.user " +
                "WHERE status = 'Active' " +
                "order by name ASC")
                .then(function(rowUser) {
                    users = rowUser;
            });
        }).then(function(result){
            res.render('inventory-export', {
                layout: 'inventory',
                rowInventory : inventory,
                rowUser : users
            });
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* POST inventory export by input page. */
router.post('/export', function(req, res, next) {
    var arrayItemLogValue = [];
    var exports = [];
    var itemQueryValue;
    var idInventory;
    var idUser;


    var postInputData = req.body.export || {};

    if(!_.isNull(postInputData) || !_.isUndefined(postInputData)){
        exports = Array.prototype.slice.call(postInputData);
    }

    return Promise.each(exports, function (item) {
        idInventory = item.item;
        idUser = item.user;
        var location = "";

        return inventoryConn.query('SELECT location FROM dbinventory.user WHERE iduser = "'+ idUser +'" limit 1').then(function(rowLocation) {
            location = rowLocation[0].location;
            console.log(location);
            //column update : dateOut, status, iduser, location || where idinventory
            itemQueryValue = "UPDATE dbinventory.item " +
                "SET " +
                "dateOut ='" + dateNow + "', " +
                "status ='Used Up', " +
                "iduser ='" + idUser + "', " +
                "lastIdUser = '0', " +
                "location = '"+ location +"' " +
                "WHERE idinventory = '"+ idInventory +"'";

            var logString = "INSERT INTO dbinventory.log " +
                "(date, user, action, value, iditem) " +
                "VALUES ?";

            return inventoryConn.query(itemQueryValue)
                .then(function(){
                    var valueLogStr = '' +
                        'User ID : ' + idUser + ' ' +
                        'Location : ' + location + ' ' +
                        'ID Inventory : ' + idInventory + ' ';

                    //log: date, admin. action, value, iditem
                    return arrayItemLogValue.push([dateNow, 'admin', 'Export Iteam', valueLogStr, ''+ idInventory +'']);
                }).then(function(logSql){
                    return inventoryConn.query(logString, [arrayItemLogValue])
                        .then(function () {
                            console.log("Log Inserted..");
                        });
                })
        }).then(function(){
            res.render('inventory-export', {
                layout: 'inventory',
                message : 'Item berhasil di export, item updated..!!'
            });
        })
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

/* GET inventory import trans for ajax page. */
router.get('/export-ajax', function(req, res, next) {
    var inventory = {};
    var users = {};
    var rows = {};
    return inventoryConn.query("SELECT " +
        "idinventory id, name name, idcategory " +
        "FROM " +
        "dbinventory.item " +
        "WHERE status = 'Stock' " +
        "ORDER BY left(id, 1) , length(id) , id")
        .then(function(rowInventory) {
            inventory = rowInventory;
            return inventoryConn.query("SELECT " +
                "iduser, name, position " +
                "FROM " +
                "dbinventory.user " +
                "WHERE status = 'Active' " +
                "order by name ASC")
                .then(function(rowUser) {
                    users = rowUser;
                });
        }).then(function(result){
            rows = {
                inventory : inventory,
                users : users
            };
            res.json(rows);
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET inventory export trans page. */
router.get('/import', function(req, res, next) {
    var inventory = {};
    return inventoryConn.query("SELECT " +
        "idinventory id, name name, idcategory " +
        "FROM " +
        "dbinventory.item " +
        "WHERE status != 'Stock' " +
        "ORDER BY left(id, 1) , length(id) , id")
        .then(function(rowInventory) {
            inventory = rowInventory;
        }).then(function(result){
            res.render('inventory-import', {
                layout: 'inventory',
                rowInventory : inventory
            });
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* POST inventory import by input page. */
router.post('/import', function(req, res, next) {
    var arrayItemLogValue = [];
    var importItem = [];
    var itemQueryValue;
    var idInventory;
    var idUser;


    var postInputData = req.body.import || {};
    if(!_.isNull(postInputData) || !_.isUndefined(postInputData)){
        //importItem = Array.prototype.slice.call(postInputData);
        importItem = _.values(postInputData);
    }

    ////https://stackoverflow.com/questions/38824349/convert-object-to-array-in-javascript
    //importItem = Object.keys(postInputData)
    //    // iterate over them and generate the array
    //    .map(function(k) {
    //        // generate the array element
    //        return [postInputData[k]];
    //    });

    return Promise.each(importItem, function (item) {
        idInventory = item.item;

        return inventoryConn.query('SELECT idUser FROM dbinventory.item WHERE idinventory = "'+ idInventory +'" limit 1')
            .then(function(rowUserId) {
                console.log(rowUserId);
                idUser = rowUserId[0].idUser;
                //column update : dateOut, status, iduser, location || where idinventory
                itemQueryValue = "UPDATE dbinventory.item " +
                    "SET " +
                    "dateIn ='" + dateNow + "', " +
                    "status ='Stock', " +
                    "lastIdUser ='" + idUser + "', " +
                    "idUser = '0', " +
                    "location = '"+ inventoryLocation +"' " +
                    "WHERE idinventory = '"+ idInventory +"'";

                var logString = "INSERT INTO dbinventory.log " +
                    "(date, user, action, value, iditem) " +
                    "VALUES ?";

                return inventoryConn.query(itemQueryValue)
                    .then(function(){
                        var valueLogStr = '' +
                            'User ID : ' + idUser + ' ' +
                            'ID Inventory : ' + idInventory + ' ';

                        //log: date, admin. action, value, iditem
                        return arrayItemLogValue.push([dateNow, 'admin', 'Import Iteam', valueLogStr, ''+ idInventory +'']);
                    }).then(function(logSql){
                        return inventoryConn.query(logString, [arrayItemLogValue])
                            .then(function () {
                                console.log("Log Inserted..");
                            });
                    })
        }).then(function(){
            res.render('inventory-import', {
                layout: 'inventory',
                message : 'Item berhasil masuk ke Stock, item updated..!!'
            });
        })
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

module.exports = router;