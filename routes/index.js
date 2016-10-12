var express = require('express');
var router = express.Router();
var _ = require('lodash');
var mysql = require('promise-mysql');
var bluebird = require('bluebird');
var moment = require('moment');
var utils = require('../utils');

var NO_AGEN = "083812175472";
var PIN = "0312";

var dateNow = "";
var dateMonth= "";
var dateYear = "";

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

/* GET home page. */
router.get('/', function(req, res, next) {
    agenPulsaConn.query('SELECT * FROM provider order by length(namaProvider), namaProvider').then(function(rows) {
        //console.log(sents);
        res.render('index',{
            rows: rows
        });
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
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

            for (i = 1; i <= totalDay; i++) {
                tanggalJam[i] = {jam: jamCekPaket};
                tanggal[i] = {tanggal: i, totalRow: totalJamCekPaket};
            }

            //TBODY VALUE
            var layoutTemplate = {};
            var defJam = "";

            Object.keys(rowNamaProvider).forEach(function(key) {
                layoutTemplate[rowNamaProvider[key].namaProvider] = {"provider": rowNamaProvider[key].namaProvider};                for (i = 1; i <= totalDay; i++) {

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

            ////bikin template array kosong
            //Object.keys(namaProvider).forEach(function(key) {
            //    layoutTemplate[namaProvider[key].nama] = {"namaProvider": namaProvider[key].nama};
            //    for (i = 1; i <= totalDay; i++) {
            //        layoutTemplate[namaProvider[key].nama][i] = {};
            //        jamCekPaket.forEach(function(jam) {
            //            layoutTemplate[namaProvider[key].nama][i][jam] = {"paket": "-", "USSD": ""};
            //        });
            //    }
            //});
            //
            //Object.keys(detailJam).forEach(function(key) {
            //    for (i = 0; i < totalJamCekPaket - 1; i++){
            //        if (moment(detailJam[key].Jam, 'HH:mm') >= moment(jamCekPaket[i], 'HH:mm') &&  moment(detailJam[key].Jam, 'HH:mm') < moment(jamCekPaket[i+1], 'HH:mm')){
            //            defJam = jamCekPaket[i];
            //        }else{
            //            if (moment(detailJam[key].Jam, 'HH:mm') >= moment(jamCekPaket[totalJamCekPaket - 1], 'HH:mm') ){
            //                defJam = jamCekPaket[totalJamCekPaket - 1];
            //            }
            //        }
            //    }
            //
            //    layoutTemplate[detailJam[key].Provider][detailJam[key].Tanggal][defJam] = {"paket": detailJam[key].Paket, "USSD": detailJam[key].USSD};
            //});

            //console.log(layoutTemplate);

            //console.log(
            //    "Provider = "+ rowPacket[0].namaProvider+"\n",
            //    "Tanggal = "+ moment(rowPacket[0].tanggal).format('D')+"\n",
            //    "Jam = "+ moment(rowPacket[0].tanggal).format('HH:mm')+"\n",
            //    "Sisa Paket = "+ rowPacket[0].sisaPaket+"\n",
            //    "Ussd = "+ rowPacket[0].ussdReply+"\n"
            //);
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
    res.render('reload', {
        title: 'Top Up Pulsa'
    });
});

//insert data
router.post('/reload', function(req,res){
    //console.log(req.body.transactions);
    var arrayQueryValue = [];
    var arrayReportValue = [];
    var trunk = "";
    var sisaSaldo = "on process";


    var transactions = Array.prototype.slice.call(req.body.transactions);

    return bluebird.each(transactions, function (transaction) {
        var trx = transaction.trx;
        var phone = transaction.phone.replace(/\D/g,'');
        arrayQueryValue.push([NO_AGEN, trx +'.'+ phone +'.'+ PIN, 'agenpulsa', 'Default_No_Compression']);

        //sisaSaldo = utils.sisaSaldo();
        //trunk = utils.findTrunk(transaction.phone);

        console.log("PHONE IS = "+phone);
        return utils.findTrunk(phone)
            .then(function (result) {
                console.log('TRUNK is', result);
                return trunk = ((_.isUndefined(result) ==  false) ? result : "Nomor Baru");
            })
            .then(function (resultTrunk) {
                return utils.sisaSaldo()
                    .then(function (saldo) {
                        dateNow = moment().format("YYYY-MM-DD HH:mm:ss");
                        console.log('SALDO AKHIR is', saldo);
                        console.log('TRUNK HERE is', resultTrunk);

                        arrayReportValue.push([dateNow, resultTrunk, phone, trx, 0, saldo, (saldo - 0), 'pending', 'Via Portal']);
                    })
            })
            .catch(function(error){
                //logs out the error
                console.error(error);
            });
    }).then(function(){
        console.log(
            arrayQueryValue,
            arrayReportValue //disini udah ga kosong lagi
        );

        var queryString = "INSERT INTO db_agen_pulsa.outbox " +
            "(DestinationNumber, TextDecoded, CreatorID, Coding) " +
            "VALUES ?";
        console.log(queryString);
        var queryReport = "INSERT INTO db_agen_pulsa.report " +
            "(tanggal, trunk, no, trx, harga, saldo_awal, saldo_akhir, status, proses) " +
            "VALUES ?";
        console.log(queryReport);
        return agenPulsaConn.query(queryString,[arrayQueryValue])
            .then(function(results){
                console.log(arrayReportValue);

                return results;
            }).then(function(results){
                return agenPulsaConn.query(queryReport,[arrayReportValue])
                    .then(function(results){

                        console.log("Report Log..\n"+ arrayReportValue);

                        res.render('reload', {
                            message: 'Transaksi berhasil disubmit..!!'
                        });
                    });
            }).catch(function(error){
                //logs out the error
                console.error(error);
            });
    });
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
    agenPulsaConn.query("SELECT idreport as id, DATE_FORMAT(tanggal, '%e %b %Y - %k:%i') as date, trunk as trunk, replace(replace(no,'+62','0'), '+628', '08') as number,harga, saldo_awal, saldo_akhir, trx, status, proses " +
        "FROM report  " +
        "ORDER BY report.tanggal DESC " +
        "LIMIT 30").then(function(reports) {
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