var express = require('express');
var router = express.Router();
var _ = require('lodash');
var mysql = require('promise-mysql');
var Promise = require('bluebird');
var moment = require('moment');
var utils = require('../utils');
var currencyFormatter = require('currency-formatter');

var NO_AGEN = "081514344606";
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

/* GET home page. */
router.get('/', function(req, res, next) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        console.log("Login Failed");
        console.log("Username : " + req.session.username);
        res.writeHead(301,
            {Location: '/portal-auth'}
        );
        res.end();
    }else {
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
  res.render('sisa-pulsa', { title: 'Sisa Pulsa' });
});

/* GET sisa paket page. */
router.get('/paket', function(req, res, next) {
    dateMonth = moment().format("M");
    dateYear = moment().format("YYYY");
    agenPulsaConn.query("SELECT namaProvider FROM dbpulsa.paket " +
        "WHERE YEAR(tanggal) = '"+ dateYear +"' AND MONTH(tanggal) = '"+ dateMonth +"' " +
        "GROUP BY namaProvider " +
        "ORDER BY length(namaProvider), namaProvider, tanggal").then(function(rowNamaProvider) {

        agenPulsaConn.query("SELECT * FROM dbpulsa.paket " +
            "WHERE YEAR(tanggal) = '"+ dateYear +"' AND MONTH(tanggal) = '"+ dateMonth +"' " +
            "ORDER BY length(namaProvider), namaProvider, tanggal").then(function(rowPacket) {

            //THEAD VALUE
            var totalDay  = utils.daysInMonth(10, 2016);
            var jamCekPaket = [
                "07:00", "07:15", "07:30", "07:45",
                "08:00", "08:15", "08:30", "08:45",
                "09:00", "09:15", "09:30", "09:45",
                "10:00", "10:15", "10:30", "10:45",
                "11:00", "11:15", "11:30", "11:45",
                "12:00", "12:15", "12:30", "12:45",
                "13:00", "13:15", "13:30", "13:45",
                "14:00", "14:15", "14:30", "14:45",
                "15:00", "15:15", "15:30", "15:45",
                "16:00", "16:15", "16:30", "16:45",
                "17:00", "17:15", "17:30", "17:45",
                "18:00", "18:15", "18:30", "18:45"
            ];

            var totalJamCekPaket = jamCekPaket.length;

            var tanggal = {};
            var tanggalJam = {};

            for (var i = 1; i <= totalDay; i++) {
                tanggalJam[i] = {jam: jamCekPaket};
                tanggal[i] = {tanggal: i, totalRow: totalJamCekPaket};
            }

            //TBODY VALUE
            var layoutTemplate = {};
            var defJam = "";

            Object.keys(rowNamaProvider).forEach(function(key) {
                layoutTemplate[rowNamaProvider[key].namaProvider] = {"provider": rowNamaProvider[key].namaProvider};
                for (i = 1; i <= totalDay; i++) {
                    layoutTemplate[rowNamaProvider[key].namaProvider][i] = {};
                    jamCekPaket.forEach(function (jam) {
                        layoutTemplate[rowNamaProvider[key].namaProvider][i][jam] = {"paket": "-", "USSD": ""};
                    });
                }
            });

            Object.keys(rowPacket).forEach(function(key) {

                var tanggalInObject = moment(rowPacket[key].tanggal).toObject();

                if (moment(tanggalInObject.seconds, 'mm') >= moment('00', 'mm') &&  moment(tanggalInObject.seconds,'mm') < moment('15', 'mm')){
                    tanggalInObject = {seconds: "00"};
                    defJam = moment(rowPacket[key].tanggal).format('hh:mm');
                }else if (moment(tanggalInObject.seconds,'mm') >= moment('15', 'mm') &&  moment(tanggalInObject.seconds,'mm') < moment('30', 'mm')){
                    dtanggalInObject = {seconds: "15"};
                    defJam = moment(rowPacket[key].tanggal).format('hh:mm');
                }else if (moment(tanggalInObject.seconds,'mm') >= moment('30', 'mm') &&  moment(tanggalInObject.seconds,'mm') < moment('45', 'mm')){
                    tanggalInObject = {seconds: "30"};
                    defJam = moment(rowPacket[key].tanggal).format('hh:mm');
                }else if (moment(tanggalInObject.seconds,'mm') >= moment('45', 'mm') &&  moment(tanggalInObject.seconds,'mm') < moment('60', 'mm')){
                    tanggalInObject = {seconds: "45"};
                    defJam = moment(rowPacket[key].tanggal).format('hh:mm');
                }

                layoutTemplate[rowPacket[key].namaProvider][moment(rowPacket[key].tanggal).format('D')][defJam] = {"paket": rowPacket[key].sisaPaket, "USSD": rowPacket[key].ussdReply};
            });

            res.render('sisa-paket', {
                tanggalJam: tanggalJam,
                totalJamCekPaket: totalJamCekPaket,
                jamCekPaket: jamCekPaket,
                tanggal: tanggal,
                totalDay: totalDay,
                totalSpan: (totalDay * totalJamCekPaket),
                layoutTemplate: layoutTemplate
            });
        })
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

/* GET isi paket page. */
router.get('/reload', function(req, res, next) {
    var login = req.session.login || "";
    if(login == 'loged'){
        res.render('reload', {
            title: 'Top Up Pulsa'
        });
    }else {
        console.log("Login Failed");
        console.log("Username : " + req.session.username);
        res.writeHead(301,
            {Location: '/portal-auth'}
        );
        res.end();
    }
});

//insert data
router.post('/reload', function(req,res){
    var login = req.session.login || "";
    if(login == 'loged'){
        //console.log(req.body.transactions);
        var arrayQueryValue = [];
        var arrayReportValue = [];
        var trunk = "";
        var sisaSaldo = "on process";


        var transactions = Array.prototype.slice.call(req.body.transactions);
        var num = 0;

        return agenPulsaConn.query("SELECT MAX(ID) as ID FROM sentitems LIMIT 1")
            .then(function(newID) {
                return Promise.each(transactions, function (transaction) {
                    num++;
                    console.log(newID[0].ID);
                    var trx = transaction.trx;
                    var phone = transaction.phone.replace(/\D/g, '');
                    var untuk = transaction.untuk;
                    arrayQueryValue.push([NO_AGEN, trx + '.' + phone + '.' + PIN, 'agenpulsa', (parseInt(newID[0].ID,10) + num), 'Default_No_Compression']);

                    //sisaSaldo = utils.sisaSaldo();
                    //trunk = utils.findTrunk(transaction.phone);

                    console.log("PHONE IS = " + phone);
                    return utils.findTrunk(phone)
                        .then(function (result) {
                            return trunk = ((_.isUndefined(result) == false) ? result : "Nomor Baru");
                        })
                        .then(function (resultTrunk) {
                            return utils.sisaSaldo()
                                .then(function (saldo) {
                                    dateNow = moment().format("YYYY-MM-DD HH:mm:ss");
                                    arrayReportValue.push([dateNow, resultTrunk, phone, trx, 0, saldo, (saldo - 0), 'pending', 'Via Portal', untuk]);
                                })
                        })
                        .catch(function (error) {
                            //logs out the error
                            console.error(error);
                        });
                }).then(function () {
                    console.log(
                        arrayQueryValue,
                        arrayReportValue //disini udah ga kosong lagi
                    );
                    var queryString = "INSERT INTO db_agen_pulsa.outbox " +
                        "(DestinationNumber, TextDecoded, CreatorID, ID,  Coding) " +
                        "VALUES ?";
                    console.log(queryString);
                    var queryReport = "INSERT INTO db_agen_pulsa.report " +
                        "(tanggal, trunk, no, trx, harga, saldo_awal, saldo_akhir, status, proses, untuk) " +
                        "VALUES ?";
                    console.log(queryReport);
                    return agenPulsaConn.query(queryString, [arrayQueryValue])
                        .then(function (results) {
                            console.log(arrayReportValue);

                            return results;
                        }).then(function (results) {
                            return agenPulsaConn.query(queryReport, [arrayReportValue])
                                .then(function (results) {

                                    console.log("Report Log..\n" + arrayReportValue);

                                    res.render('reload', {
                                        message: 'Transaksi berhasil disubmit..!!'
                                    });
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
    }else {
        console.log("Login Failed");
        console.log("Username : " + req.session.username);
        res.writeHead(301,
            {Location: '/portal-auth'}
        );
        res.end();
    }
});

/* GET sentitems page. */
router.get('/sentitems', function(req, res, next) {
    agenPulsaConn.query('SELECT ' +
    'status as status, ' +
    'CreatorID as CreatorID, ' +
    'ID AS ID, ' +
    'DATE_FORMAT(SendingDateTime, "%e %b %Y - %k:%i") AS date, ' +
    'REPLACE (REPLACE (DestinationNumber, "+62",	"0"), "+628", "08" ) AS number, ' +
    'TextDecoded ' +
    'FROM ' +
    'sentitems ' +
    'ORDER BY SendingDateTime DESC ' +

    'LIMIT 30').then(function(rowSents) {
        //console.log(rowSents[0].number);
        res.render('sentitems',{
            rowSents: rowSents
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
    agenPulsaConn.query("SELECT idreport as id, DATE_FORMAT(tanggal, '%e %b %Y - %k:%i') as date, trunk as trunk, replace(replace(no,'+62','0'), '+628', '08') as number,harga, saldo_awal, saldo_akhir, trx, status, proses, untuk " +
        "FROM report  " +
        "ORDER BY report.tanggal DESC " +
        "LIMIT 100").then(function(reports) {
        //console.log(reports);
        res.render('report', {
            title: 'Laporan Pemakaian Saldo',
            reports: reports
        });
    }).catch(function(error){
        //logs out the error
        console.error(error);
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
    var postList = "";
    if(_.isUndefined(req.body.listGroup) == 'true'){
        console.log(_.isUndefined(req.body.listGroup));
        postList = "";
        agenPulsaConn.query("SELECT * FROM db_agen_pulsa.provider  " +
            "ORDER BY length(namaProvider), namaProvider")
        .then(function(list) {
            res.render('list', {
                title: 'List Nomor Terpakai',
                rowList: list
            });
        })
        .catch(function (error) {
            //logs out the error
            console.error(error);
        });
    }else {
        var data = [];
        postList = Array.prototype.slice.call(req.body.listGroup);

        var sqlUpdate = "UPDATE db_agen_pulsa.provider SET " +
            "namaProvider = '"+ postList[0].namaProvider +"', " +
            "noProvider = '"+ postList[0].noProvider +"', " +
            "namaPaket = '"+ postList[0].namaPaket +"', " +
            "host = '"+ postList[0].host +"', " +
            "span = '"+ postList[0].span +"', " +
            "hargaPaket = '"+ postList[0].hargaPaket +"', " +
            "caraCekPulsa = '"+ postList[0].caraCekPulsa +"', " +
            "caraAktivasi = '"+ postList[0].caraAktivasi +"', " +
            "caraCekKuota = '"+ postList[0].caraCekKuota +"', " +
            "caraStopPaket = '"+ postList[0].caraStopPaket +"', " +
            "expDatePaket = '"+ postList[0].expDatePaket +"' " +
            "WHERE idProvider = '"+ postList[0].ID +"'";
        console.log(sqlUpdate);
        return agenPulsaConn.query(sqlUpdate)
        .then(function(updateResult){
            console.log("updateResult = "+updateResult);
            return agenPulsaConn.query("SELECT * FROM db_agen_pulsa.provider  " +
                "ORDER BY length(namaProvider), namaProvider")
                .then(function(list) {
                    res.render('list', {
                        title: 'List Nomor Terpakai',
                        rowList: list
                    });
                    return list;
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
        })
        .catch(function (error) {
            //logs out the error
            console.error(error);
        });

    }
});

module.exports = router;