var express             = require('express');
var router              = express.Router();
var _                   = require('lodash');
var mysql               = require('promise-mysql');
var Promise             = require('bluebird');
var moment              = require('moment');
var utils               = require('../utils');
var currencyFormatter   = require('currency-formatter');
var crypto              = require('crypto');

var NO_AGEN = "08562699002";
//var NO_AGEN = "081514344606";
var PIN = "0312";

var dateNow = "";
var dateMonth= "";
var dateYear = "";

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

function capitalizeFirstLetter(str) {
    var words = "";
    if (!_.isEmpty(str)){
        words = str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }else{
        words = "";
    }
    return words;
}

function encryptPassword(password) {
    var words = "";
    var mykey = "";
    var mystr = "";
    if (!_.isEmpty(password)){
        mykey = crypto.createCipher('aes-128-cbc', 'Cermat123hebat');
        mystr = mykey.update(password, 'utf8', 'hex');
        mystr += mykey.final('hex');
    }else{
        mystr = "";
    }
    return mystr;
}

/* GET home page. */
router.get('/', function(req, res, next) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        console.log("Login Failed");
        res.redirect('/portal-auth');
    }else{
        console.error(req.session.username);

        agenPulsaConn.query('SELECT * FROM provider order by length(namaProvider), namaProvider').then(function (rows) {
            //console.log(sents);
            res.render('index', {
                rows: rows
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
    }
});

/* GET sisa pulsa page. */
router.get('/pulsa', function(req, res, next) {
    var layoutTemplate={};
    var defJam;
    var dateMonth = moment().format("M");
    var dateYear = moment().format("YYYY");
    agenPulsaConn.query('SELECT namaProvider nama, sisaPulsa pulsa, tanggal, ussdReply ussd from db_agen_pulsa.pulsa WHERE namaProvider not like "%XL%" AND YEAR(tanggal) = "'+ dateYear +'" AND MONTH(tanggal) = "'+ dateMonth +'"')
        .then(function(rowPulsa) {

            var promiseTanggal=[];
            var totalDay  = utils.daysInMonth(dateMonth, dateYear);

            for(var i= 1; i<= totalDay; i++){
                promiseTanggal.push(i);
            }
            return Promise.all(promiseTanggal)
                .then(function(headTanggal){
                var grouped = _.groupBy(rowPulsa, 'nama');
                var jamCekPaket = [
                    "1", "3", "11", "15"
                ];
                Object.keys(grouped).forEach(function(key) {
                    layoutTemplate[key]=[];
                    headTanggal.forEach(function (day) {
                        //console.log(day);
                        layoutTemplate[key][day] = [];
                        jamCekPaket.forEach(function (jam) {
                            layoutTemplate[key][day][jam] = {"pulsa": "-", "ussd": ""};
                        });
                    });
                });
                //console.log(layoutTemplate);

                Object.keys(rowPulsa).forEach(function(key) {

                    var tanggalInObject = moment(rowPulsa[key].tanggal).toObject();

                    if (moment(tanggalInObject.hours, 'H') >= moment('01', 'H') &&  moment(tanggalInObject.hours,'H') < moment('03', 'H')){
                        defJam = moment(rowPulsa[key].tanggal).format('H');
                    }else if (moment(tanggalInObject.hours, 'H') >= moment('03', 'H') &&  moment(tanggalInObject.hours,'H') < moment('11', 'H')){
                        defJam = moment(rowPulsa[key].tanggal).format('H');
                    }else if (moment(tanggalInObject.hours, 'H') >= moment('11', 'H') &&  moment(tanggalInObject.hours,'H') < moment('15', 'H')){
                        defJam = moment(rowPulsa[key].tanggal).format('H');
                    }else if (moment(tanggalInObject.hours, 'H') >= moment('15', 'H') &&  moment(tanggalInObject.hours,'H') < moment('23', 'H')){
                        defJam = moment(rowPulsa[key].tanggal).format('H');
                    }

                    layoutTemplate[rowPulsa[key].nama][moment(rowPulsa[key].tanggal).format('D')][defJam] = {"pulsa": rowPulsa[key].pulsa, "ussd": rowPulsa[key].ussd};
                });

                //console.log(layoutTemplate);

                res.render('sisa-pulsa', {
                    tanggal: headTanggal,
                    totalTanggal: (totalDay*4)+3,
                    layoutTemplate : layoutTemplate
                });
            });
        });
});

/* GET sisa paket page. */
router.get('/paket', function(req, res, next) {
    var layoutTemplate={};
    var defJam;
    var dateMonth = moment().format("M");
    //dateMonth = moment("2017-11-30").format("M");
    var dateYear = moment().format("YYYY");
    agenPulsaConn.query('SELECT ' +
        'namaProvider nama, ' +
        'sisaPaket paket, ' +
        'tanggal, ' +
        'ussdReply ussd ' +
        'from db_agen_pulsa.paket ' +
        'WHERE ' +
        'namaProvider not like "%XL%" ' +
        'AND YEAR(tanggal) = "'+ dateYear +'" AND MONTH(tanggal) = "'+ dateMonth +'" ' +
        'ORDER BY nama')
        .then(function(rowPaket) {
            //console.log('SELECT namaProvider nama, sisaPulsa paket, tanggal, ussdReply ussd from db_agen_pulsa.paket WHERE YEAR(tanggal) = "'+ dateYear +'" AND MONTH(tanggal) = "'+ dateMonth +'"');
            //console.log(rowPaket);
            dateMonth = moment().format("M");
            //dateMonth = moment("2017-11-30").format("M");
            dateYear = moment().format("YYYY");

            var promiseTanggal=[];

            var totalDay  = utils.daysInMonth(dateMonth, dateYear);

            for(var i= 1; i<= totalDay; i++){
                promiseTanggal.push(i);
            }
            return Promise.all(promiseTanggal)
                .then(function(headTanggal){
                    var grouped = _.groupBy(rowPaket, 'nama');
                    var jamCekPaket = [
                        "5", "7", "12", "16"
                    ];
                    Object.keys(grouped).forEach(function(key) {
                        layoutTemplate[key]=[];
                        headTanggal.forEach(function (day) {
                            //console.log(day);
                            layoutTemplate[key][day] = [];
                            jamCekPaket.forEach(function (jam) {
                                layoutTemplate[key][day][jam] = {"paket": "-", "ussd": ""};
                            });
                        });
                    });
                    //console.log(layoutTemplate);

                    Object.keys(rowPaket).forEach(function(key) {

                        var tanggalInObject = moment(rowPaket[key].tanggal).toObject();

                        if (moment(tanggalInObject.hours, 'H') >= moment('05', 'H') &&  moment(tanggalInObject.hours,'H') < moment('07', 'H')){
                            defJam = moment(rowPaket[key].tanggal).format('H');
                        }else if (moment(tanggalInObject.hours, 'H') >= moment('07', 'H') &&  moment(tanggalInObject.hours,'H') < moment('12', 'H')){
                            defJam = moment(rowPaket[key].tanggal).format('H');
                        }else if (moment(tanggalInObject.hours, 'H') >= moment('12', 'H') &&  moment(tanggalInObject.hours,'H') < moment('16', 'H')){
                            defJam = moment(rowPaket[key].tanggal).format('H');
                        }else if (moment(tanggalInObject.hours, 'H') >= moment('16', 'H') &&  moment(tanggalInObject.hours,'H') < moment('23', 'H')){
                            defJam = moment(rowPaket[key].tanggal).format('H');
                        }

                        layoutTemplate[rowPaket[key].nama][moment(rowPaket[key].tanggal).format('D')][defJam] = {"paket": rowPaket[key].paket, "ussd": rowPaket[key].ussd};
                    });

                    res.render('sisa-paket', {
                        tanggal: headTanggal,
                        totalTanggal: (totalDay*4)+3,
                        layoutTemplate : layoutTemplate
                    });
                });
        });
});

/* GET isi paket page. */
router.get('/reload', function(req, res, next) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        console.log("Not Logged");
        res.redirect('/portal-auth');
    }else {
        res.render('reload', {
            title: 'Top Up Pulsa'
        });
    }
});

//insert data
router.post('/reload', function(req,res){
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        console.log("Not Logged");
        res.redirect('/portal-auth');
    }else {
        var num = 0;
        //console.log(req.body.transactions);
        var arrayQueryValue = [];
        var arrayReportValue = [];
        var trunk = "";
        var sisaSaldo = "on proccess";
        var user = req.session.name;


        var transactions = Array.prototype.slice.call(req.body.transactions);

        return agenPulsaConn.query("SELECT MAX(ID) as ID FROM sentitems LIMIT 1")
            .then(function(newID) {
                return agenPulsaConn.query("SELECT `AUTO_INCREMENT` " +
                    "FROM INFORMATION_SCHEMA.TABLES " +
                    "WHERE TABLE_SCHEMA = 'db_agen_pulsa' " +
                    "AND TABLE_NAME = 'outbox';")
                    .then(function(autoincrement) {
                        var outboxAi = parseInt(autoincrement[0].AUTO_INCREMENT,10);
                        var newId = parseInt(newID[0].ID,10);
                        var largestId;
                        if(newId >= outboxAi){
                            largestId = newId;
                        }else{
                            largestId = outboxAi;
                        }
                        return Promise.each(transactions, function (transaction) {
                            //console.log(newID[0].ID);
                            var trx = transaction.trx;
                            var phone = transaction.phone.replace(/\D/g, '');
                            var untuk = transaction.untuk;
                            arrayQueryValue.push([NO_AGEN, trx + '.' + phone + '.' + PIN, 'agenpulsa', (parseInt(largestId,10) + num), 'Default_No_Compression']);
                            num++;

                            //sisaSaldo = utils.sisaSaldo();
                            //trunk = utils.findTrunk(transaction.phone);

                            //console.log("PHONE IS = " + phone);
                            return utils.findTrunk(phone)
                                .then(function (result) {
                                    console.log(result);
                                    //return trunk = ((_.isUndefined(result) == false) ? result : "Nomor Baru");
                                    return utils.sisaSaldo()
                                        .then(function (saldo) {
                                            dateNow = moment().format("YYYY-MM-DD HH:mm:ss");
                                            arrayReportValue.push([dateNow, result, phone, trx, 0, saldo, (saldo - 0), 'pending', 'Via Portal', untuk, user]);
                                        })
                                })
                                .catch(function (error) {
                                    //logs out the error
                                    console.error(error);
                                });
                        }).then(function () {
                            //console.log(
                            //    arrayQueryValue,
                            //    arrayReportValue //disini udah ga kosong lagi
                            //);
                            var queryString = "INSERT INTO db_agen_pulsa.outbox " +
                                "(DestinationNumber, TextDecoded, CreatorID, ID, Coding) " +
                                "VALUES ?";
                            //console.log(queryString);
                            var queryReport = "INSERT INTO db_agen_pulsa.report " +
                                "(tanggal, trunk, no, trx, harga, saldo_awal, saldo_akhir, status, proses, untuk, user) " +
                                "VALUES ?";
                            //console.log(queryReport);
                            return agenPulsaConn.query(queryString, [arrayQueryValue])
                                .then(function (results) {
                                    //console.log(arrayReportValue);

                                    return results;
                                }).then(function (results) {
                                    return agenPulsaConn.query(queryReport, [arrayReportValue])
                                        .then(function (results) {

                                            //console.log("Report Log..\n" + arrayReportValue);

                                            res.render('reload', {
                                                message: 'Transaksi berhasil disubmit..!!'
                                            });
                                        });

                                }).catch(function (error) {
                                    //logs out the error
                                    console.error(error);
                                });
                        });
                    });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET sentitems page. */
router.get('/sentitems', function(req, res, next) {
    agenPulsaConn.query('SELECT ' +
    'status as status, ' +
    'CreatorID as CreatorID, ' +
    'ID as ID, ' +
    'DATE_FORMAT(SendingDateTime, "%e %b %Y - %k:%i") as date, ' +
    'REPLACE (REPLACE (DestinationNumber, "+62", "0"), "+628", "08" ) AS number, ' +
    'TextDecoded ' +
    'FROM ' +
    'sentitems ' +
    'ORDER BY SendingDateTime DESC ' +
    'LIMIT 30').then(function(rowSent) {
        //console.log(rowSents[0].number);
        res.render('sentitems',{
            rowSents: rowSent
        });
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

/* GET inbox page. */
router.get('/inbox', function(req, res, next) {
    agenPulsaConn.query("SELECT ID as ID, DATE_FORMAT(ReceivingDateTime, '%e %b %Y - %k:%i') as date, replace(replace(SenderNumber,'+62','0'), '+628', '08') as number, TextDecoded as TextDecoded " +
        "FROM inbox  " +
        "ORDER BY inbox.ReceivingDateTime DESC " +
        "LIMIT 30").then(function(inboxes) {
        //console.log(inboxes);
        res.render('inbox',{
            inboxes: inboxes
        });
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

/* GET pending page. */
router.get('/pending', function(req, res, next) {
    agenPulsaConn.query("SELECT joinOutbox.number as number, joinOutbox.outboxTextDecoded as outboxTextDecoded, joinOutbox.outboxMultiTextDecoded as outboxMultiTextDecoded, joinOutbox.ID as ID, joinOutbox.date as date, joinOutbox.CreatorID as CreatorID " +
        "FROM(SELECT REPLACE(REPLACE(outbox.DestinationNumber, '+62', '0'), '+628', '08') AS number, outbox.TextDecoded AS outboxTextDecoded, outbox_multipart.TextDecoded AS outboxMultiTextDecoded, outbox.ID AS ID, DATE_FORMAT(outbox.SendingDateTime, '%e %b %Y - %k:%i') AS date, outbox.CreatorID AS CreatorID " +
        "FROM outbox LEFT JOIN outbox_multipart ON outbox.ID = outbox_multipart.ID) joinOutbox " +
        "ORDER BY date DESC LIMIT 30").then(function(pendings) {
        //console.log(pendings);
        res.render('pending',{
            pendings: pendings
        });
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

/* GET report page. */
router.get('/report', function(req, res, next) {
    agenPulsaConn.query("SELECT idreport as id, DATE_FORMAT(tanggal, '%e %b %Y - %k:%i') as date, trunk as trunk, replace(replace(no,'+62','0'), '+628', '08') as number,harga, saldo_awal, saldo_akhir, trx, status, proses, untuk, user " +
        "FROM report  " +
        "ORDER BY report.tanggal DESC " +
        "LIMIT 100")
        .then(function(reports) {
        //console.log(reports);
        agenPulsaConn.query("SELECT * FROM user")
            .then(function(results) {
                res.render('report', {
                    title: 'Laporan Pemakaian Saldo',
                    groupedUser: _.groupBy(results, 'name'),
                    reports: reports
                });
            }).catch(function(error){
                //logs out the error
                console.error(error);
            });
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

/* POST report page. */
router.post('/report', function(req, res, next) {
    console.log(req.body);
    var postUntuk = req.body.report.untuk || "";
    var postProses = req.body.report.proses || "";
    var postStatus = req.body.report.status || "";
    var postUser = req.body.report.user || "";
    var dateStart = req.body.report.start || {};
    var dateEnd = req.body.report.end || {};
    var postDateStart = (!_.isEmpty(dateStart))?moment(new Date(dateStart)).format("YYYY-MM-DD 00:00:00"): moment().format("2008-MM-DD 00:00:00");
    var postDateEnd = (!_.isEmpty(dateStart))?moment(new Date(dateEnd)).format("YYYY-MM-DD 23:59:59"): moment().format("YYYY-MM-DD 23:59:59");
    var postTrunk = req.body.report.trunk || "";
    var postPhone = req.body.report.phone || "";
    var postTrx = req.body.report.trx || "";
    var arrPostUntuk = [];
    var arrPostProses = [];
    var arrPostStatus = [];
    var arrPostUser = [];
    var queryUntuk = [];
    var queryProses = [];
    var queryStatus = [];
    var queryUser = [];
    var untukQueryTxt = "";
    var prosesQueryTxt = "";
    var statusQueryTxt = "";
    var userQueryTxt = "";
    var promiseUntuk = new Promise(function(resolve, reject) {
        if(!_.isEmpty(postUntuk)) {
            if (_.isArray(postUntuk)) {
                arrPostUntuk = postUntuk;
            } else {
                arrPostUntuk = [postUntuk];
            }
            arrPostUntuk.forEach(function (untuk) {
                queryUntuk.push("untuk = '" + untuk + "'");
            });
            untukQueryTxt = "(" + queryUntuk.toString().replace(/,/gi, " OR ") + ") AND ";
        }else{
            untukQueryTxt = "";
        }
        resolve(untukQueryTxt);
    });
    var promiseProses = new Promise(function(resolve, reject) {
        if(!_.isEmpty(postProses)) {
            if (_.isArray(postProses)) {
                arrPostProses = postProses;
            } else {
                arrPostProses = [postProses];
            }
            arrPostProses.forEach(function (proses) {
                queryProses.push("proses = '" + proses + "'");
            });
            prosesQueryTxt = "(" + queryProses.toString().replace(/,/gi, " OR ") + ") AND ";
        }else{
            prosesQueryTxt = "";
        }
        resolve(prosesQueryTxt);
    });
    var promiseStatus = new Promise(function(resolve, reject) {
        if(!_.isEmpty(postStatus)) {
            if (_.isArray(postStatus)) {
                arrPostStatus = postStatus;
            } else {
                arrPostStatus = [postStatus];
            }
            arrPostStatus.forEach(function (status) {
                queryStatus.push("status = '" + status + "'");
            });
            statusQueryTxt = "(" + queryStatus.toString().replace(/,/gi, " OR ") + ") AND ";
        }else{
            statusQueryTxt = "";
        }
        resolve(statusQueryTxt);
    });
    var promiseUser = new Promise(function(resolve, reject) {
        if(!_.isEmpty(postUser)) {
            if (_.isArray(postUser)) {
                arrPostUser = postUser;
            } else {
                arrPostUser = [postUser];
            }
            arrPostUser.forEach(function (user) {
                queryUser.push("user = '" + user + "'");
            });
            userQueryTxt = "(" + queryUser.toString().replace(/,/gi, " OR ") + ") AND ";
        }else{
            userQueryTxt = "";
        }
        resolve(userQueryTxt);
    });

    Promise.all([promiseUntuk, promiseProses, promiseStatus, promiseUser])
        .then(function(values) {
            var queryString = "SELECT idreport as id, DATE_FORMAT(tanggal, '%e %b %Y - %k:%i') as date, trunk as trunk, replace(replace(no,'+62','0'), '+628', '08') as number,harga, saldo_awal, saldo_akhir, trx, status, proses, untuk, user " +
                "FROM report " +
                "WHERE (tanggal between '"+ postDateStart +"' AND '"+ postDateEnd +"') AND " +
                untukQueryTxt.toString() +" "+ prosesQueryTxt.toString() +" "+ statusQueryTxt.toString() +" "+ userQueryTxt.toString() +" " +
                "trunk like '%"+ postTrunk +"%' AND no like '%"+ postPhone +"%' AND trx like '%"+ postTrx +"%' " +
                "ORDER BY report.tanggal DESC " +
                "limit 1000";
            agenPulsaConn.query(queryString)
                .then(function(reports) {
                    console.log(queryString);
                    agenPulsaConn.query("SELECT * FROM user")
                        .then(function(results) {
                            res.render('report', {
                                title: 'Laporan Pemakaian Saldo',
                                groupedUser: _.groupBy(results, 'name'),
                                message: "Menampilkan paling banyak 1000 baris..!!",
                                reports: reports
                            });
                        }).catch(function(error){
                            //logs out the error
                            console.error(error);
                        });
                }).catch(function(error){
                    //logs out the error
                    console.error(error);
                });
    });
});

/* GET monthly-report page. */
router.get('/report-biak', function(req, res, next) {
    var dataSent = [];
    var dataInbox = [];
    var tasks = [];
    var bulan = {};
    //agenPulsaConn.query("SELECT * FROM db_agen_pulsa.sentitems " +
    //    "where (TextDecoded like '%X10%' or TextDecoded like '%S10%' or TextDecoded like '%t20%' or TextDecoded like '%t10%' or TextDecoded like '%s20%' or TextDecoded like '%I20%') and status not like '%error%' and TextDecoded not like 'x100%' and TextDecoded not like 't100%' ")
    //    .then(function(sentitems) {
    //        return Promise.each(sentitems, function(sentitem){
    //            var tanggal = sentitem.SendingDateTime;
    //            var pesan = sentitem.TextDecoded;
    //            var dotPos = pesan.indexOf(".");
    //            var subPesan = pesan.substr((dotPos + 1), (pesan.length - dotPos));
    //            var trx = pesan.substr(0, dotPos);
    //            var noTelp = subPesan.substr(0, subPesan.indexOf("."));

    //agenPulsaConn.query("SELECT * FROM db_agen_pulsa.report where untuk = '2' AND tanggal between '2016-10-01 00:00:00' AND '2016-11-30 23:59:59' and status not like 'failed' and status not like 'pending' ")
    agenPulsaConn.query("SELECT * FROM db_agen_pulsa.report where untuk = '2' AND tanggal between '2016-10-01 00:00:00' AND '2016-11-30 23:59:59' and status not like 'failed' ")
        .then(function(reports) {
            return Promise.each(reports, function(report){
                var tanggal = report.tanggal;
                //var pesan = report.TextDecoded;
                //var dotPos = pesan.indexOf(".");
                //var subPesan = pesan.substr((dotPos + 1), (pesan.length - dotPos));
                var trx = report.trx;
                var noTelp = report.no;

                dataSent.push({
                    tanggal: moment(tanggal).format("YYYY-MM-DD HH:mm:ss"),
                    trx: trx,
                    noTelp: noTelp,
                    harga: '',
                    status: ''
                });
            }).then(function(sentitemsResult) {
                Object.keys(dataSent).forEach(function(key) {
                    var sqlStr = "SELECT * FROM db_agen_pulsa.inbox " +
                        "WHERE ReceivingDateTime BETWEEN '"+ moment(dataSent[key].tanggal).format("YYYY-MM-DD 00:00:00") +"' AND '"+ moment(dataSent[key].tanggal).format("YYYY-MM-DD 23:59:59") +"' " +
                        "AND TextDecoded LIKE '%"+ dataSent[key].trx +" ke "+ dataSent[key].noTelp +"%' ";
                    var task = agenPulsaConn.query(sqlStr)
                    .then(function(inboxes) {
                        return Promise.each(inboxes, function(inbox) {
                            var tanggalInbox = inbox.ReceivingDateTime;
                            var pesanInbox = inbox.TextDecoded;


                            var hrgPos = pesanInbox.indexOf('Hrg=');
                            var hrgPosToEnd = pesanInbox.substr(hrgPos + 4);
                            var pos2 = hrgPosToEnd.indexOf(' ');

                            var harga = currencyFormatter.format(hrgPosToEnd.substr(0, pos2), { code: 'IDR' });

                            var pesanInbox1 = pesanInbox.substr(0, hrgPos - 1);
                            var posTelp1 = pesanInbox1.lastIndexOf(" ");
                            var noTelpInbox = pesanInbox1.substr(posTelp1 + 1);

                            var pesanInbox2 = pesanInbox1.substr(posTelp1 - 6);
                            var trxInbox = pesanInbox2.substr(0, 3);

                            var pesanInbox3 = pesanInbox.substr(hrgPos);
                            var posStatus = pesanInbox3.indexOf(" ") + 1;
                            var trimInbox3 = pesanInbox3.substr(posStatus);
                            var posStatus2 = trimInbox3.indexOf(" ");
                            var status = trimInbox3.substr(0, posStatus2);

                            if(status == 'SUKSES'){
                                bulan[moment(tanggalInbox).format("MMMM")] = [];
                                dataInbox.push({
                                    tanggal: moment(tanggalInbox).format("YYYY-MM-DD HH:mm:ss"),
                                    bulan: moment(tanggalInbox).format("MMMM"),
                                    trx: trxInbox,
                                    noTelp: noTelpInbox,
                                    harga: harga,
                                    numHarga: parseInt(hrgPosToEnd.substr(0, pos2)),
                                    status: status
                                });
                            }
                            return dataInbox;

                        }).then(function(a){
                        });
                    });
                    tasks.push(task);
                });
                return Promise.all(tasks);
            }).then(function(b){
                return Promise.each(dataInbox, function(resInbox) {
                    Object.keys(bulan).forEach(function(key) {
                        if(resInbox.bulan == key){
                            bulan[key].push(resInbox);
                            //console.log("same")
                        }
                    });
                    return bulan;
                }).then(function(c){
                    console.log(bulan);
                    res.render('report-biak', {

                        title: 'Laporan Pemakaian Saldo Biak',
                        reports: bulan,
                        total : currencyFormatter.format(_.last(dataInbox).total, { code: 'IDR' })
                    });
                });
            });
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET monthly-report page. */
router.get('/report-biak-new', function(req, res, next) {
    var dataSent = [];
    var dataInbox = [];
    var tasks = [];
    var bulan = {};
    //agenPulsaConn.query("SELECT * FROM db_agen_pulsa.sentitems " +
    //    "where (TextDecoded like '%X10%' or TextDecoded like '%S10%' or TextDecoded like '%t20%' or TextDecoded like '%t10%' or TextDecoded like '%s20%' or TextDecoded like '%I20%') and status not like '%error%' and TextDecoded not like 'x100%' and TextDecoded not like 't100%' ")
    //    .then(function(sentitems) {
    //        return Promise.each(sentitems, function(sentitem){
    //            var tanggal = sentitem.SendingDateTime;
    //            var pesan = sentitem.TextDecoded;
    //            var dotPos = pesan.indexOf(".");
    //            var subPesan = pesan.substr((dotPos + 1), (pesan.length - dotPos));
    //            var trx = pesan.substr(0, dotPos);
    //            var noTelp = subPesan.substr(0, subPesan.indexOf("."));

    agenPulsaConn.query("SELECT * FROM db_agen_pulsa.report where untuk = '2' AND tanggal between '2016-12-01 00:00:00' AND '2017-02-30 23:59:59' and status not like 'failed' ")
        .then(function(reports) {
            //console.log(reports);
            return Promise.each(reports, function(report){
                var tanggal = report.tanggal;
                //var pesan = report.TextDecoded;
                //var dotPos = pesan.indexOf(".");
                //var subPesan = pesan.substr((dotPos + 1), (pesan.length - dotPos));
                var trx = report.trx;
                var noTelp = report.no;

                dataSent.push({
                    tanggal: moment(tanggal).format("YYYY-MM-DD HH:mm:ss"),
                    trx: trx,
                    noTelp: noTelp,
                    harga: '',
                    status: ''
                });
            }).then(function(sentitemsResult) {
                Object.keys(dataSent).forEach(function(key) {
                    var sqlStr = "SELECT * FROM db_agen_pulsa.inbox " +
                        "WHERE ReceivingDateTime BETWEEN '"+ moment(dataSent[key].tanggal).format("YYYY-MM-DD 00:00:00") +"' AND '"+ moment(dataSent[key].tanggal).format("YYYY-MM-DD 23:59:59") +"' " +
                        "AND TextDecoded LIKE '%"+ dataSent[key].trx +"."+ dataSent[key].noTelp +" SUKSES%' ";
                    //console.log(sqlStr);
                    var task = agenPulsaConn.query(sqlStr)
                        .then(function(inboxes) {
                            return Promise.each(inboxes, function(inbox) {
                                var tanggalInbox = inbox.ReceivingDateTime;
                                var pesanInbox = inbox.TextDecoded; // @16/02/17 ID:UTD105848, I20.085886183419 SUKSES.SN:0216111512882778 .Hrg:20.975/Sal:5.813.032.
                                //console.log(pesanInbox);
                                //console.log(tanggalInbox);

                                var hrgPos = pesanInbox.indexOf('Hrg:');
                                var hrgPosToEnd = pesanInbox.substr(hrgPos + 4);
                                var pos2 = hrgPosToEnd.indexOf('/');


                                var harga = hrgPosToEnd.substr(0, pos2);
                                //console.log(harga);

                                var suksesPos = pesanInbox.indexOf('SUKSES'); // @16/02/17 ID:UTD105848, I20.085886183419 SUKSES
                                var pesanInbox1 = pesanInbox.substr(0, suksesPos - 1); // @16/02/17 ID:UTD105848, I20.085886183419
                                var posTelp1 = pesanInbox1.lastIndexOf(".");
                                var noTelpInbox = pesanInbox1.substr(posTelp1 + 1);// 085886183419

                                var pesanInbox2 = pesanInbox1.substr(0, posTelp1);// // @16/02/17 ID:UTD105848, I20
                                var posTrx1 = pesanInbox2.lastIndexOf(" ");
                                var trxInbox = pesanInbox2.substr(posTrx1 + 1);

                                var status = pesanInbox.substr(suksesPos, 6);
                                //console.log(status);

                                if(status == 'SUKSES'){
                                    bulan[moment(tanggalInbox).format("MMMM")] = [];
                                    dataInbox.push({
                                        tanggal: moment(tanggalInbox).format("YYYY-MM-DD HH:mm:ss"),
                                        bulan: moment(tanggalInbox).format("MMMM"),
                                        trx: trxInbox,
                                        noTelp: noTelpInbox,
                                        harga: "Rp. " + harga,
                                        numHarga: parseInt(hrgPosToEnd.substr(0, pos2).replace(/\D/g,'')),
                                        status: status
                                    });
                                }
                                return dataInbox;
                                //console.log(dataInbox);

                            }).then(function(a){
                            });
                        });
                    tasks.push(task);
                });
                return Promise.all(tasks);
            }).then(function(b){
                return Promise.each(dataInbox, function(resInbox) {
                    Object.keys(bulan).forEach(function(key) {
                        if(resInbox.bulan == key){
                            bulan[key].push(resInbox);
                            //console.log("same")
                        }
                    });
                    return bulan;
                }).then(function(c){
                    console.log(bulan);
                    res.render('report-biak', {

                        title: 'Laporan Pemakaian Saldo Biak',
                        reports: bulan
                        //total : currencyFormatter.format(_.last(dataInbox).total, { code: 'IDR' })
                    });
                });
            });
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET monthly-report page. */
router.get('/report-kedoya', function(req, res, next) {
    var dataSent = [];
    var dataInbox = [];
    var tasks = [];
    var bulan = {};
    //agenPulsaConn.query("SELECT * FROM db_agen_pulsa.sentitems " +
    //    "where TextDecoded not like 'X10%' " +
    //    "and TextDecoded not like 'S10%' " +
    //    "and TextDecoded not like 'T20%' " +
    //    "and TextDecoded not like 'T10%' " +
    //    "and TextDecoded not like 'i10%' " +
    //    "and TextDecoded not like 's20%' " +
    //    "and status not like '%error%'")
    //    .then(function(sentitems) {
    //        return Promise.each(sentitems, function(sentitem){
    //            var tanggal = sentitem.SendingDateTime;
    //            var pesan = sentitem.TextDecoded;
    //            var dotPos = pesan.indexOf(".");
    //            var subPesan = pesan.substr((dotPos + 1), (pesan.length - dotPos));
    //            var trx = pesan.substr(0, dotPos);
    //            var noTelp = subPesan.substr(0, subPesan.indexOf("."));
    //
    //            dataSent.push({
    //                tanggal: moment(tanggal).format("YYYY-MM-DD HH:mm:ss"),
    //                trx: trx,
    //                noTelp: noTelp,
    //                harga: '',
    //                status: ''
    //            });
    agenPulsaConn.query("SELECT * FROM db_agen_pulsa.report where untuk = '1' AND tanggal between '2016-10-01 00:00:00' AND '2016-11-30 23:59:59' and status not like 'failed' and status not like 'pending' ")
        .then(function(reports) {
            return Promise.each(reports, function(report){
                var tanggal = report.tanggal;
                //var pesan = report.TextDecoded;
                //var dotPos = pesan.indexOf(".");
                //var subPesan = pesan.substr((dotPos + 1), (pesan.length - dotPos));
                var trx = report.trx;
                var noTelp = report.no;

                dataSent.push({
                    tanggal: moment(tanggal).format("YYYY-MM-DD HH:mm:ss"),
                    trx: trx,
                    noTelp: noTelp,
                    harga: '',
                    status: ''
                });
            }).then(function(sentitemsResult) {
                Object.keys(dataSent).forEach(function(key) {
                    var sqlStr = "SELECT * FROM db_agen_pulsa.inbox " +
                        "WHERE ReceivingDateTime BETWEEN '"+ moment(dataSent[key].tanggal).format("YYYY-MM-DD 00:00:00") +"' AND '"+ moment(dataSent[key].tanggal).format("YYYY-MM-DD 23:59:59") +"' " +
                        "AND TextDecoded LIKE '%"+ dataSent[key].trx +" ke "+ dataSent[key].noTelp +"%' ";
                    var task = agenPulsaConn.query(sqlStr)
                        .then(function(inboxes) {
                            return Promise.each(inboxes, function(inbox) {
                                var tanggalInbox = inbox.ReceivingDateTime;
                                var pesanInbox = inbox.TextDecoded;

                                var hrgPos = pesanInbox.indexOf('Hrg=');
                                var hrgPosToEnd = pesanInbox.substr(hrgPos + 4);
                                var pos2 = hrgPosToEnd.indexOf(' ');

                                var harga = currencyFormatter.format(hrgPosToEnd.substr(0, pos2), { code: 'IDR' });

                                var pesanInbox1 = pesanInbox.substr(0, hrgPos - 1);
                                var posTelp1 = pesanInbox1.lastIndexOf(" ");
                                var noTelpInbox = pesanInbox1.substr(posTelp1 + 1);

                                var pesanInbox2 = pesanInbox1.substr(posTelp1 - 6);
                                var trxInbox = pesanInbox2.substr(0, pesanInbox2.indexOf(" "));

                                var pesanInbox3 = pesanInbox.substr(hrgPos);
                                var posStatus = pesanInbox3.indexOf(" ") + 1;
                                var trimInbox3 = pesanInbox3.substr(posStatus);
                                var posStatus2 = trimInbox3.indexOf(" ");
                                var status = trimInbox3.substr(0, posStatus2);

                                if(status == 'SUKSES'){
                                    bulan[moment(tanggalInbox).format("MMMM")] = [];
                                    dataInbox.push({
                                        tanggal: moment(tanggalInbox).format("YYYY-MM-DD HH:mm:ss"),
                                        bulan: moment(tanggalInbox).format("MMMM"),
                                        trx: trxInbox,
                                        noTelp: noTelpInbox,
                                        harga: harga,
                                        numHarga: parseInt(hrgPosToEnd.substr(0, pos2)),
                                        status: status
                                    });
                                }
                                return dataInbox;

                            }).then(function(a){
                            });
                        });
                    tasks.push(task);
                });
                return Promise.all(tasks);
            }).then(function(b){
                return Promise.each(dataInbox, function(resInbox) {
                    Object.keys(bulan).forEach(function(key) {
                        if(resInbox.bulan == key){
                            bulan[key].push(resInbox);
                            //console.log("same")
                        }
                    });
                    return bulan;
                }).then(function(c){
                    //console.log(bulan);
                    res.render('report-kedoya', {

                        title: 'Laporan Pemakaian Saldo Kedoya',
                        reports: bulan,
                        total : currencyFormatter.format(_.last(dataInbox).total, { code: 'IDR' })
                    });
                });
            });
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET list numnber page. */
router.get('/list', function(req, res, next) {
    agenPulsaConn.query("SELECT * FROM db_agen_pulsa.provider  " +
        "ORDER BY length(namaProvider), namaProvider").then(function(list) {
        //console.log(reports);
        res.render('list', {
            title: 'List Nomor Terpakai',
            rowList: list
        });
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

/* GET list numnber page. */
router.post('/list', function(req, res, next) {
    var listGroup = req.body.listGroup || {};
    var inputProvider = req.body.inputProvider || {};
    var btnDelete = req.body.btnDelete || {};
    var sqlString = "";
    //for debug
    //console.log(req.body);
    //console.log(!_.isEmpty(inputProvider));
    //console.log(!_.isEmpty(listGroup));
    //console.log(!_.isEmpty(btnDelete));
    //res.redirect('/list');
    if(!_.isEmpty(inputProvider)){
            sqlString = "insert into db_agen_pulsa.provider " +
                "(namaProvider, noProvider, namaPaket, host, span, hargaPaket, caraCekPulsa, caraAktivasi, caraCekKuota, caraStopPaket, expDatePaket) " +
                "VALUE " +
                "('"+ inputProvider.namaProvider +"', " +
                "'"+ inputProvider.noProvider +"', " +
                "'"+ inputProvider.namaPaket +"', " +
                "'"+ inputProvider.host +"', " +
                "'"+ inputProvider.span +"', " +
                "'"+ inputProvider.hargaPaket +"', " +
                "'"+ inputProvider.caraCekPulsa +"', " +
                "'"+ inputProvider.caraAktivasi +"', " +
                "'"+ inputProvider.caraCekKuota +"', " +
                "'"+ inputProvider.caraStopPaket +"', " +
                "'"+ inputProvider.expDatePaket +"')";
                //console.log(sqlString);
                return agenPulsaConn.query(sqlString)
                    .then(function(updateResult){
                        res.redirect('/list');
                    })
                    .catch(function (error) {
                        //logs out the error
                        console.error(error);
                    });
    }else if(!_.isEmpty(listGroup)){
        return Promise.each(_.toArray(listGroup), function(postList){
            sqlString = "UPDATE db_agen_pulsa.provider SET " +
                "namaProvider = '"+ postList.namaProvider +"', " +
                "noProvider = '"+ postList.noProvider +"', " +
                "namaPaket = '"+ postList.namaPaket +"', " +
                "host = '"+ postList.host +"', " +
                "span = '"+ postList.span +"', " +
                "hargaPaket = '"+ postList.hargaPaket +"', " +
                "caraCekPulsa = '"+ postList.caraCekPulsa +"', " +
                "caraAktivasi = '"+ postList.caraAktivasi +"', " +
                "caraCekKuota = '"+ postList.caraCekKuota +"', " +
                "caraStopPaket = '"+ postList.caraStopPaket +"', " +
                "expDatePaket = '"+ postList.expDatePaket +"' " +
                "WHERE idProvider = '"+ postList.idProvider +"'";
        }).then(function(){
            //console.log(sqlString);
            return agenPulsaConn.query(sqlString)
            .then(function(updateResult){
                    res.redirect('/list');
                })
            .catch(function (error) {
                //logs out the error
                console.error(error);
                });
        });
    }else if(!_.isEmpty(btnDelete)){
        sqlString = "DELETE FROM db_agen_pulsa.provider WHERE idProvider = '"+ btnDelete.idProvider +"'";
        //console.log(sqlString);
        return agenPulsaConn.query(sqlString)
            .then(function(updateResult){
                res.redirect('/list');
            })
            .catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET monthly-report page. */
router.get('/report-all', function(req, res, next) {
    var dataSent = [];
    var dataInbox = [];
    var tasks = [];
    var bulan = {};

    agenPulsaConn.query("SELECT " +
        "* " +
        "FROM " +
        "db_agen_pulsa.inbox " +
        "WHERE " +
        "TextDecoded NOT LIKE '%pernah%' " +
        "AND TextDecoded NOT LIKE '%segera%' " +
        "AND TextDecoded like '%SUKSES.SN%' " +
        "and receivingDateTime between '2018-01-01 00:00:00' and '2018.04.24 23:59:59';")
        .then(function(inboxes) {
            return Promise.each(inboxes, function(inbox){
                var tanggalInbox = inbox.ReceivingDateTime;
                var pesanInbox = inbox.TextDecoded;

                var hrgPos = pesanInbox.indexOf('Hrg:');
                var hrgPosToEnd = pesanInbox.substr(hrgPos + 4);
                var pos2 = hrgPosToEnd.indexOf('/Sal:');

                var harga = currencyFormatter.format(hrgPosToEnd.substr(0, pos2).replace(".",""), { code: 'IDR' });

                var firstDotPos = pesanInbox.indexOf('.');
                var pesanInbox1 = pesanInbox.substr(firstDotPos + 1);
                var posTelp1 = pesanInbox1.indexOf(" ");
                var noTelpInbox = pesanInbox1.substr(0, posTelp1 + 1);

                var firstCommaPos = pesanInbox.indexOf(',');
                var pesanInbox2 = pesanInbox.substr(firstCommaPos + 1);
                var trxInbox = pesanInbox2.substr(0, pesanInbox2.indexOf("."));

                bulan[moment(tanggalInbox).format("MMMM")] = [];
                dataInbox.push({
                    tanggal: moment(tanggalInbox).format("YYYY-MM-DD HH:mm:ss"),
                    bulan: moment(tanggalInbox).format("MMMM"),
                    trx: trxInbox,
                    noTelp: noTelpInbox,
                    harga: harga,
                    numHarga: parseInt(hrgPosToEnd.substr(0, pos2).replace(".","")),
                    status: "SUKSES"
                });
                //console.log(parseInt(hrgPosToEnd.substr(0, pos2)));

            }).then(function(b){
                return Promise.each(dataInbox, function(resInbox) {
                    Object.keys(bulan).forEach(function(key) {
                        if(resInbox.bulan == key){
                            bulan[key].push(resInbox);
                            //console.log("same")
                        }
                    });
                }).then(function(){
                    //console.log(bulan);
                    var total = currencyFormatter.format(_.sumBy(dataInbox, 'intHarga'), { code: 'IDR' });
                    console.log(_.sumBy(dataInbox, 'numHarga'));
                    res.render('report-kedoya', {
                        title: 'Laporan Pemakaian Saldo Cermati',
                        reports: bulan,
                        total : total
                    });
                });
            });
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

/* GET logout page. */
router.get('/logout', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        console.log("Not Logged");
        res.redirect('/portal-auth');
    }else {
        req.session.destroy(function(err) {
            res.redirect('/portal-auth');
        })
    }
});

/* GET user page. */
router.get('/user', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        console.log("Not Logged");
        res.redirect('/portal-auth');
    }else {
        var userLogin = req.session.username;
        var userPriv = req.session.privilege;
        agenPulsaConn.query("SELECT *, '"+ userLogin +"' userLogin, '"+ userPriv +"' userPriv  FROM db_agen_pulsa.user  " +
            "ORDER BY privilege").then(function(list) {
            //console.log(list);
            res.render('user', {
                title: 'User Management',
                rowList: list,
                userPriv: userPriv
            });
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
    }
});

/* POST user page. */
router.post('/user', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        console.log("Not Logged");
        res.redirect('/portal-auth');
    }else {
        var post = req.body || {};
        var nama = "";
        var username = "";
        var password = "";
        var privilege = "";
        var arrayQueryValue = [];
        var queryString = "";
        var mainBody = "";
        var postButton = "";
        //console.log(post);
        if (!_.isUndefined(req.body.userButton)){ //TAMBAH USER BARU
            //{ addUser:
            //{ name: 'asdasd',
            //    username: 'asdsadasd',
            //    password: 'asdas',
            //    privilege: '2' },
            //    userButton: 'addUser' }
            //console.log(encryptPassword(mainBody.password));
            mainBody = req.body.addUser;
            nama = capitalizeFirstLetter(mainBody.name);
            username = mainBody.username;
            password = encryptPassword(mainBody.password);
            privilege = mainBody.privilege;

            //laporan: iduser, name, username, password, privilege
            arrayQueryValue.push([nama, username, password, privilege]);
            queryString = "INSERT INTO db_agen_pulsa.user " +
                "(name, username, password, privilege) " +
                "VALUES ?";

            //console.log(arrayQueryValue);

            return agenPulsaConn.query(queryString, [arrayQueryValue])
                .then(function (queryResult) {
                    res.redirect('/user');
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });

        }else if (!_.isUndefined(req.body.editUser)){ //EDIT USER
            //{ editUser:
            //    [ { nama: 'Arif Kurniawan',
            //        username: 'arif',
            //        password: 'c3rmat',
            //        privilege: '1',
            //        btnUpdate: '3' } ] }
            //console.log("post edit user");
            mainBody = req.body.editUser;
            return Promise.each(mainBody, function (rowBody) {
                //laporan: iduser, name, username, password, privilege
                queryString = "UPDATE db_agen_pulsa.user SET " +
                "name = '"+ capitalizeFirstLetter(rowBody.name) +"', " +
                "username = '"+ rowBody.username +"', " +
                "password = '"+ encryptPassword(rowBody.password) +"', " +
                "privilege = '"+ rowBody.privilege +"' " +
                "WHERE iduser = '"+ rowBody.btnUpdate +"'";

                //console.log(arrayQueryValue);
            }).then(function () {
                //console.log(queryString);
                return agenPulsaConn.query(queryString)
                    .then(function (queryResult) {
                        res.redirect('/user');
                    }).catch(function (error) {
                        //logs out the error
                        console.error(error);
                    });
            });

        }else if (!_.isUndefined(req.body.deleteUser)){
            //HAPUS USER
            //{ deleteUser: [ { btnDelete: '1' } ] }
            //console.log("post delete user");
            mainBody = req.body.deleteUser;
            return Promise.each(mainBody, function (rowBody) {
                queryString = "UPDATE db_agen_pulsa.user SET status = 'Deactive' WHERE iduser = '"+ rowBody.btnDelete +"'";
            }).then(function (queryResult) {
            return agenPulsaConn.query(queryString)
                .then(function (queryResult) {
                    res.redirect('/user');
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            });
        }
    }
});

module.exports = router;