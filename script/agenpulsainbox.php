<?php
ini_set('display_errors', '1');
ini_set('error_reporting', E_ALL & ~E_NOTICE);
error_reporting(E_ALL);
ini_set('memory_limit','1G');
set_time_limit(0);
ini_set('max_execution_time', 0); //300 seconds = 5 minutes
require "connconf.php";

date_default_timezone_set("Asia/Jakarta");

function sendToSlack($room, $icon, $username, $message){
    $data       = "payload=" . json_encode(array(         
                  "username"      =>  $username,
                  "channel"       =>  "#{$room}",
                  "text"          =>  $message,
                  "icon_emoji"    =>  $icon
        ));
    $slackHook = "https://hooks.slack.com/services/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";
             
    $c = curl_init();
    curl_setopt($c, CURLOPT_URL, $slackHook);
    curl_setopt($c, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($c, CURLOPT_POSTFIELDS, $data);
    curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($c, CURLOPT_SSL_VERIFYPEER, false);
    $result = curl_exec($c);

    return $result;
}

$trunkQry = "";
$trunkQry = "SELECT namaProvider, noProvider FROM db_agen_pulsa.provider";
$resultTrunk = mysqli_query($conn, $trunkQry);
if (mysqli_num_rows($resultTrunk) > 0) {
    while($rowTrunk = mysqli_fetch_array($resultTrunk)){
        $trunk[$rowTrunk['noProvider']] = $rowTrunk['namaProvider'];
    }
}

$time_now_start = date("Y-m-d H:i:s", strtotime("-1 minutes"));
$time_now_end = date("Y-m-d H:i:s");

$inboxAgenPulsaQry = "";
$inboxAgenPulsaQry = "SELECT * FROM db_agen_pulsa.inbox WHERE ReceivingDateTime BETWEEN '".$time_now_start."' AND '".$time_now_end."'";
$resultInbox = mysqli_query($conn, $inboxAgenPulsaQry);
if (mysqli_num_rows($resultInbox) > 0) {
    while($rowInbox = mysqli_fetch_array($resultInbox)){
        $inboxTxt   = $rowInbox['TextDecoded'];
        $tanggal    = $rowInbox['ReceivingDateTime'];
        $noPengirim = $rowInbox['SenderNumber'];
        
        $message = "Tanggal : ".$tanggal." \r\n No Pengirim : ".$noPengirim." \r\n Isi Pesan : \r\n ".$inboxTxt."";
        sendToSlack("agenpulsa", ":incoming_envelope:", "Agen Pulsa Inbox", $message);

        // ===================================================================
        // INBOX STRING PARSING
        // ===================================================================
        //saldo
        $firsPinSaldo = strpos($inboxTxt,"Rp.") + 3;
        $lastPinSaldo = strpos(substr($inboxTxt,$firsPinSaldo)," ");
        //harga TRX
        $firstPinHrg = strpos($inboxTxt,"Hrg=") + 4;
        $lastPinHrg = strpos(substr($inboxTxt,$firstPinHrg)," ");
        //TRX
        if(strpos($inboxTxt, "\n") !== FALSE) {
            $firstPinTRX = strrpos(substr($inboxTxt,0,strpos($inboxTxt,"ke") - 1),"\n") + 1;
            $lastPinTRX = strpos(substr($inboxTxt, $firstPinTRX)," ");
        }
        else {
            $firstPinTRX = strrpos(substr($inboxTxt,0,strpos($inboxTxt,"ke") - 1),"\n");
            $lastPinTRX = strpos(substr($inboxTxt, $firstPinTRX)," ");
        }
        //Nomor
        $firstPinPhone = strpos($inboxTxt,"ke") + 3;
        $lastPinPhone = strpos(substr($inboxTxt, $firstPinPhone)," ");
        //Status
        $firstPinStatus = strrpos(substr($inboxTxt,0,strpos($inboxTxt,"SN") - 1)," ") + 1;
        $lastPinStatus = strpos(substr($inboxTxt, $firstPinStatus)," ");


        $hargaTrx = substr($inboxTxt, $firstPinHrg, $lastPinHrg);
        $TRX = substr($inboxTxt, $firstPinTRX, $lastPinTRX);
        $phone = substr($inboxTxt, $firstPinPhone, $lastPinPhone);
        $inboxStatus = substr($inboxTxt, $firstPinStatus, $lastPinStatus);
        $inboxSaldo = substr($inboxTxt,$firsPinSaldo);

        if ($hargaTrx != "" || $hargaTrx != "" || $hargaTrx != "" || $hargaTrx != "" || $hargaTrx != ""){
            $saldoQry = "";
            $saldoQry = "SELECT * FROM db_agen_pulsa.saldos";
            $resultSaldo = mysqli_query($conn, $saldoQry);
            if (mysqli_num_rows($resultSaldo) > 0) {
                $rowSaldo = mysqli_fetch_array($resultSaldo);
                $idSaldo            = $rowSaldo['idsaldos'];
                $lastSaldo          = $rowSaldo['saldo'];
                $lastTrx            = $rowSaldo['lastTrx'];
                $lastDebet          = $rowSaldo['lastDebet'];
                $lastKredit         = $rowSaldo['lastKredit'];
                $pendingSaldo       = $rowSaldo['pendingSaldo'];
                $pendingLastTrx     = $rowSaldo['pendingLastTrx'];
                $pendingLastDebet   = $rowSaldo['pendingLastDebet'];
                $pendingLastKredit  = $rowSaldo['pendingLastKredit'];
            };

            if ($inboxSaldo == $lastSaldo) {
                //update report
                $updateReportByInbox = "UPDATE db_agen_pulsa.report 
                                        SET trunk = '".$rowTrunk[$phone]."', harga = '".$hargaTrx."', status = '".$inboxStatus."' 
                                        WHERE (status = 'pending' OR status = 'Sent') AND no = '".$phone."' AND trx = '".$TRX."' LIMIT 1";

                echo "[".$time_now_end."] ".$updateReportByInbox."\r\n";
                if (mysqli_query($conn, $updateReportByInbox)) {
                    echo "[".$time_now_end."] update by inbox\r\n";
                } else {
                    echo "[".$time_now_end."] report by inbox update failed.. Error : " . mysqli_error($conn) . "\r\n";
                }

            } else{
                if (($lastSaldo - $hargaTrx) == $inboxSaldo) {
                    //update saldos
                    $updateSaldoByInbox = "UPDATE db_agen_pulsa.saldos 
                                            SET saldo = '".$inboxSaldo."', lastTrx = '".$TRX."', lastDebet = '".$hargaTrx."'";

                    echo "[".$time_now_end."] ".$updateSaldoByInbox."\r\n";
                    if (mysqli_query($conn, $updateSaldoByInbox)) {
                        echo "[".$time_now_end."] saldo updated by inbox\r\n";
                    } else {
                        echo "[".$time_now_end."] saldo updated by inbox failed.. Error : " . mysqli_error($conn) . "\r\n";
                    }

                    //update report
                    $updateReportByInbox = "UPDATE db_agen_pulsa.report 
                                            SET trunk = '".$rowTrunk[$phone]."', harga = '".$hargaTrx."', status = '".$inboxStatus."', saldo_akhir = '".$inboxSaldo."'
                                            WHERE (status = 'pending' OR status = 'Sent') AND no = '".$phone."' AND trx = '".$TRX."' LIMIT 1";

                    echo "[".$time_now_end."] ".$updateReportByInbox."\r\n";
                    if (mysqli_query($conn, $updateReportByInbox)) {
                        echo "[".$time_now_end."] update by inbox\r\n";
                    } else {
                        echo "[".$time_now_end."] report by inbox update failed.. Error : " . mysqli_error($conn) . "\r\n";
                    }
                } else {
                    if (($inboxSaldo - $hargaTrx) == $pendingSaldo) {
                        //update saldos
                        $updateSaldoByInbox = "UPDATE db_agen_pulsa.saldos 
                                                SET saldo = '".$pendingSaldo."', lastTrx = '".$pendingLastTrx."', lastDebet = '".$pendingLastDebet."'";

                        echo "[".$time_now_end."] ".$updateSaldoByInbox."\r\n";
                        if (mysqli_query($conn, $updateSaldoByInbox)) {
                            echo "[".$time_now_end."] saldo updated by inbox\r\n";
                        } else {
                            echo "[".$time_now_end."] saldo updated by inbox failed.. Error : " . mysqli_error($conn) . "\r\n";
                        }

                        //update pending saldos
                        $updateSaldoByInbox = "UPDATE db_agen_pulsa.saldos 
                                                SET pendingSaldo = '".$inboxSaldo."', pendingLastTrx = '".$TRX."', pendingLastDebet = '".$hargaTrx."'";

                        echo "[".$time_now_end."] ".$updateSaldoByInbox."\r\n";
                        if (mysqli_query($conn, $updateSaldoByInbox)) {
                            echo "[".$time_now_end."] saldo updated by inbox\r\n";
                        } else {
                            echo "[".$time_now_end."] saldo updated by inbox failed.. Error : " . mysqli_error($conn) . "\r\n";
                        }

                        //update report
                        $updateReportByInbox = "UPDATE db_agen_pulsa.report 
                                                SET trunk = '".$rowTrunk[$phone]."', harga = '".$hargaTrx."', status = '".$inboxStatus."', saldo_akhir = '".$pendingSaldo."' 
                                                WHERE (status = 'pending' OR status = 'Sent') AND no = '".$phone."' AND trx = '".$TRX."' LIMIT 1";

                        echo "[".$time_now_end."] ".$updateReportByInbox."\r\n";
                        if (mysqli_query($conn, $updateReportByInbox)) {
                            echo "[".$time_now_end."] update by inbox\r\n";
                        } else {
                            echo "[".$time_now_end."] report by inbox update failed.. Error : " . mysqli_error($conn) . "\r\n";
                        }
                    }else{
                        //update pending saldos
                        $updateSaldoByInbox = "UPDATE db_agen_pulsa.saldos 
                                                SET pendingSaldo = '".$inboxSaldo."', pendingLastTrx = '".$TRX."', pendingLastDebet = '".$hargaTrx."'";

                        echo "[".$time_now_end."] ".$updateSaldoByInbox."\r\n";
                        if (mysqli_query($conn, $updateSaldoByInbox)) {
                            echo "[".$time_now_end."] saldo updated by inbox\r\n";
                        } else {
                            echo "[".$time_now_end."] saldo updated by inbox failed.. Error : " . mysqli_error($conn) . "\r\n";
                        }
                    }
                }
            }
        }

        
        

        echo "[".$time_now_end."] Scrap Inbox\r\n";
        echo "[".$time_now_end."] =============================================================\r\n";
        echo "[".$time_now_end."] TRX: ".$TRX."\n";
        echo "[".$time_now_end."] Nomor: ".$phone."\n";
        echo "[".$time_now_end."] Saldo: ".$inboxSaldo."\n";
        echo "[".$time_now_end."] Harga Trx: ".$hargaTrx."\n";
        echo "[".$time_now_end."] Inbox Status Trx: ".$inboxStatus."\n";
    };
}else{
    echo "[".$time_now_end."] inbox kosong\r\n";
};

$sentitemsAgenPulsaQry = "";
$sentitemsAgenPulsaQry = "SELECT * FROM db_agen_pulsa.sentitems WHERE SendingDateTime BETWEEN '".$time_now_start."' AND '".$time_now_end."'";
$resultSentitems = mysqli_query($conn, $sentitemsAgenPulsaQry);
if (mysqli_num_rows($resultSentitems) > 0) {
    while($rowSentitems = mysqli_fetch_array($resultSentitems)){
        $sentTxt        = $rowSentitems['TextDecoded'];
        $tanggalKirim   = $rowSentitems['SendingDateTime'];
        $noPenerima     = $rowSentitems['DestinationNumber'];
        $status         = $rowSentitems['Status'];

        switch ($status){
            case 'SendingOK'        : $status='Sent'    ; $icon=':thumbsup:'; break;
            case 'SendingOKNoReport': $status='Sent'    ; $icon=':thumbsup:'; break;
            case 'SendingError'     : $status='Failed'  ; $icon=':fire:'  ; break;
            case 'DeliveryOK'       : $status='Sent'    ; $icon=':thumbsup:'; break;
            case 'DeliveryFailed'   : $status='Failed'  ; $icon=':fire:'  ; break;
            case 'DeliveryPending'  : $status='Pending' ; $icon=':thinking_face: '; break;
            case 'DeliveryUnknown'  : $status='Failed'  ; $icon=':fire:'  ; break;
            case 'Error'            : $status='Failed'  ; $icon=':fire:'  ; break;
            default                 : $status='Failed'  ; $icon=':fire:'  ; break;
        }

        $sliceSentTxt = explode('.', $sentTxt);
        $trx = $sliceSentTxt[0];
        $phone = $sliceSentTxt[1];

        $updateReportQry = "";
        $updateReportQry = "UPDATE db_agen_pulsa.report SET status = '".$status."' WHERE trx = '".$trx."' AND no = '".$phone."' AND status = 'pending' LIMIT 1";
        echo "[".$time_now_end."] ".$updateReportQry."\r\n";
        if (mysqli_query($conn, $updateReportQry)) {
            echo "[".$time_now_end."] update report by sentitems\r\n";
        } else {
            echo "[".$time_now_end."] report update by inbox failed.. Error : " . mysqli_error($conn) . "\r\n";
        }
        
        $message = "Tanggal : ".$tanggalKirim." \r\n No Penerima : ".$noPenerima." \r\n Status : ".$status." \r\n Isi Pesan : \r\n ".$sentTxt."";
        sendToSlack("agenpulsa",$icon, "Agen Pulsa Sentitems", $message);
        echo "[".$time_now_end."] scrap sentitems\r\n";
    }
}else{
    echo "[".$time_now_end."] sentitems kosong\r\n";
};