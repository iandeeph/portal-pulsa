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
        "t4.id id, " +
        "t4.tgl_masuk, " +
        "t4.tgl_keluar, " +
        "t4.nama nama, " +
        "t4.jenis jenis, " +
        "t4.sn sn, " +
        "t4.status status, " +
        "t4.user user, " +
        "t4.userdivision userdivision, " +
        "t4.lastuser lastuser, " +
        "t4.lastuserdivision lastuserdivision, " +
        "office.name lokasi, " +
        "t4.keterangan " +
    "FROM" +
    "(SELECT " +
        "t3.id id, " +
        "t3.tgl_masuk, " +
        "t3.tgl_keluar, " +
        "t3.nama nama, " +
        "category.name jenis, " +
        "t3.sn sn, " +
        "t3.status status, " +
        "t3.user user, " +
        "t3.userdivision userdivision, " +
        "t3.lastuser lastuser, " +
        "t3.lastuserdivision lastuserdivision, " +
        "t3.lokasi lokasi, " +
        "t3.keterangan " +
    "FROM" +
    "(SELECT " +
        "t2.id id, " +
        "t2.tgl_masuk, " +
        "t2.tgl_keluar, " +
        "t2.nama nama, " +
        "t2.jenis jenis, " +
        "t2.sn sn, " +
        "t2.status status, " +
        "t2.user user, " +
        "t2.userdivision userdivision, " +
        "t2.lastuser lastuser, " +
        "division.name lastuserdivision, " +
        "t2.lokasi lokasi, " +
        "t2.keterangan " +
    "FROM" +
    "(SELECT " +
        "t1.id id, " +
        "t1.tgl_masuk, " +
        "t1.tgl_keluar, " +
        "t1.nama nama, " +
        "t1.jenis jenis, " +
        "t1.sn sn, " +
        "t1.status status, " +
        "t1.user user, " +
        "division.name userdivision, " +
        "t1.lastuser lastuser, " +
        "t1.lastuserdivision lastuserdivision, " +
        "t1.lokasi lokasi, " +
        "t1.keterangan " +
    "FROM" +
    "(SELECT " +
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
        "user.iddivision lastuserdivision, "+
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
        "user.iddivision userdivision, " +
        "item.lastIdUser lastuserdivision, " +
        "item.location lokasi, " +
        "notes keterangan " +
    "FROM " +
    "dbinventory.item " +
    "left join dbinventory.user ON item.iduser = user.iduser) t " +
    "left join user ON t.lastuserdivision = user.iduser) t1 " +
    "left join division ON t1.userdivision = division.iddivision) t2 " +
    "left join division ON t2.lastuserdivision = division.iddivision) t3 " +
    "left join category ON t3.jenis = category.idcategory) t4 " +
    "left join office ON t4.lokasi = office.name " +
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
    var users;
    var position;
    var division;
    var location;
    return inventoryConn.query("SELECT " +
        "t1.iduser iduser, " +
        "t1.nama nama, " +
        "t1.idposition idposition, " +
        "t1.posisi posisi, " +
        "office.idoffice idoffice, " +
        "office.name lokasi, " +
        "t1.status status, " +
        "t1.joindate joindate, " +
        "t1.quitdate quitdate, " +
        "t1.iddivision iddivision, " +
        "t1.divisi divisi " +
        "FROM " +
        "(SELECT " +
        "t.iduser iduser, " +
        "t.nama nama, " +
        "position.idposition idposition, " +
        "position.name posisi, " +
        "t.lokasi lokasi, " +
        "t.status status, " +
        "t.joindate joindate, " +
        "t.quitdate quitdate, " +
        "t.iddivision iddivision, " +
        "t.divisi divisi " +
        "FROM " +
        "(SELECT " +
        "user.iduser iduser, " +
        "user.name nama, " +
        "user.idposition posisi, " +
        "user.idlocation lokasi, " +
        "user.status status, " +
        "user.joindate joindate, " +
        "user.quitdate quitdate, " +
        "division.iddivision iddivision, " +
        "division.name divisi " +
        "FROM dbinventory.user " +
        "left join " +
        "division " +
        "on user.iddivision = division.iddivision) t " +
        "LEFT JOIN position on t.posisi = position.idposition) t1 " +
        "LEFT JOIN office on t1.lokasi = office.idoffice " +
        "ORDER BY nama;")
        .then(function(rowUser) {
            users = rowUser;
            return inventoryConn.query("SELECT * FROM dbinventory.position order by name").then(function(rowPosition) {
                position = rowPosition;
                return inventoryConn.query("SELECT * FROM dbinventory.division order by name").then(function(rowDivision) {
                    division = rowDivision;
                    return inventoryConn.query("SELECT * FROM dbinventory.office order by name").then(function(rowOffice) {
                        location = rowOffice;
                        res.render('inventory-user', {
                            layout: 'inventory',
                            rowUser: users,
                            rowPosition : position,
                            rowDivision : division,
                            rowOffice : location
                        });
                    });
                });
            });
        })
        .catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* POST inventory user by input page. */
router.post('/user', function(req, res, next) {
    var arrayUserLogValue = [];
    var arrayUserValue = [];
    var insertUserString;
    var logString;
    var usersItem;
    var idInventory;
    var username;
    var userIdPosition;
    var userIdDivision;
    var userIdLocation;

    var postInputData = req.body.user || {};
    if(!_.isNull(postInputData) || !_.isUndefined(postInputData)){
        //importItem = Array.prototype.slice.call(postInputData);
        usersItem = _.values(postInputData);
    }

    //table-user = name, idposition, iddivision, idlocation, status, joindate, quitdate
    insertUserString = "INSERT INTO dbinventory.user " +
        "(name, idposition, iddivision, idlocation, status, joindate) " +
        "VALUES ?";

    logString = "INSERT INTO dbinventory.log " +
        "(date, user, action, value, iditem) " +
        "VALUES ?";

    return Promise.each(usersItem, function (item) {
        username = item.name;
        userIdPosition = item.position;
        userIdDivision = item.division;
        userIdLocation = item.location;

        arrayUserValue.push([username, userIdPosition, userIdDivision, userIdLocation, 'Active', dateNow]);

        return inventoryConn.query(insertUserString, [arrayUserValue])
            .then(function () {
                var valueLogStr = '' +
                    'Username : ' + username + ' ' +
                    'ID Posisi : ' + userIdPosition + ' ' +
                    'ID Divisi : ' + userIdDivision + ' ' +
                    'ID Lokasi : ' + userIdLocation + ' ' +
                    'Tgl Join : ' + dateNow + ' ' +
                    '';

                //log: date, admin. action, value, iditem
                return arrayUserLogValue.push([dateNow, 'admin', 'Import Iteam', valueLogStr, '' + idInventory + '']);
            }).then(function (logSql) {
                return inventoryConn.query(logString, [arrayUserLogValue])
                    .then(function () {
                        console.log("Log Inserted..");
                    });
            });
    }).then(function(){
        res.render('inventory-import', {
            layout: 'inventory',
            message : 'User berhasil ditambah, user updated..!!'
        });
    }).catch(function(error){
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
        "group by idposition " +
        "order by idposition ASC")
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
        headers: ['name', 'idposition', 'iddivision', 'idlocation'] // Specifing the headers
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
                "(name, idposition, division, location) " +
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
            "(name, idposition, iddivision, idlocation) " +
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
                "iduser, name, idposition " +
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
    var position;
    var division;
    var location;
    return inventoryConn.query("SELECT " +
        "idinventory id, name name, idcategory " +
        "FROM " +
        "dbinventory.item " +
        "WHERE status = 'Stock' " +
        "ORDER BY left(id, 1) , length(id) , id")
        .then(function(rowInventory) {
            inventory = rowInventory;
            return inventoryConn.query("SELECT " +
                "user.iduser iduser, user.name name, position.name position " +
                "FROM " +
                "dbinventory.user LEFT JOIN position on user.idposition = position.idposition " +
                "WHERE status = 'Active' " +
                "order by name ASC")
                .then(function(rowUser) {
                    users = rowUser;
                    return inventoryConn.query("SELECT * FROM dbinventory.position order by name").then(function(rowPosition) {
                        position = rowPosition;
                        return inventoryConn.query("SELECT * FROM dbinventory.division order by name").then(function(rowDivision) {
                            division = rowDivision;
                            return inventoryConn.query("SELECT * FROM dbinventory.office order by name").then(function(rowOffice) {
                                location = rowOffice;
                            }).then(function(result) {
                                rows = {
                                    inventory: inventory,
                                    users: users,
                                    position: position,
                                    division: division,
                                    location: location
                                };
                                res.json(rows);
                            });
                        });
                    });
                });
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