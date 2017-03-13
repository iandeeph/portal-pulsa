<?php
// ini_set('display_errors', '1');
// ini_set('error_reporting', E_ALL & ~E_NOTICE);
error_reporting(0);
ini_set('memory_limit','1G');
set_time_limit(0);
ini_set('max_execution_time', 0); //300 seconds = 5 minutes
require "connconf.php";

date_default_timezone_set("Asia/Jakarta");

function sendSms($phoneNumber, $message, $conn){
    $now = date("Y-m-d H:i:s");
    $msg = array();
    $totSmsPage = ceil(strlen($message)/160);

    if($totSmsPage == 1){
        $inserttooutbox1 = "INSERT INTO db_agen_pulsa.outbox (DestinationNumber, TextDecoded, CreatorID, Coding) 
                            VALUES ('".$phoneNumber."', '".$message."', 'agenpulsa', 'Default_No_Compression');";

        if (mysqli_query($conn, $inserttooutbox1)) {
            echo "Message sent to ".$phoneNumber." - ".$message."";
        } else {
            echo "Error: ".$inserttooutbox1. " ".mysqli_error($conn);
        }
    }else{
        $hitsplit = ceil(strlen($message)/153);
        $split  = str_split($message, 153);

        for ($i=1; $i<=$totSmsPage; $i++){
            $udh = "050003A7".sprintf("%02s", $hitsplit).sprintf("%02s", $i);
            $msg = $split[$i-1];

            if ($i == 1){
                $inserttooutbox = "INSERT INTO db_agen_pulsa.outbox (DestinationNumber, UDH, TextDecoded, MultiPart, CreatorID, Class)
                VALUES ('".$phoneNumber."', '".$udh."', '".$msg."', 'true', 'agenpulsa', '-1')";
            }else{
                $inserttooutbox = "INSERT INTO db_agen_pulsa.outbox_multipart(UDH, TextDecoded, SequencePosition)
                VALUES ('".$udh."', '".$msg."', '".$i."')";
            }
            if (mysqli_query($conn, $inserttooutbox)) {
                echo "Message sent to ".$phoneNumber." - ".$message."";
            } else {
                echo "Error: ".$inserttooutbox. " ".mysqli_error($conn);
            }
        } 
    }
}
//the name of the curl function
function curl_get_contents($url){

    //Initiate the curl
    $ch=curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    //removes the header of the webpage
    curl_setopt($ch, CURLOPT_HEADER, 0);
    //do not display the whole page
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    //insert openvox password
    curl_setopt($ch, CURLOPT_USERPWD, "admin:c3rmat");
    //execute the curl
    $output = curl_exec($ch);
    //close the curl so that resources are not wasted
    //curl_close($ch);
    return $output;
}

function sendToSlack($room, $username, $message){
    $icon       = ":pikapika:"; 
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

$nomorAgenPulsa = "081901250006";

$time_now_start = date("Y/m/d%20H:i:s", strtotime("-10 minutes"));
$time_now_end = date("Y/m/d%20H:i:s");

$itemPerPages = 1;

$data = array();

$inserts = array();
// looping untuk setiap IP openvox
$numNamaProvider = 0;

// ==============================================================================================
// THREE
// ==============================================================================================

$providerQry = "";
$providerQry = "SELECT * FROM db_agen_pulsa.provider WHERE namaProvider LIKE 'indosatAll%' ORDER BY length(namaProvider), namaProvider";
$resultProvider = mysqli_query($conn, $providerQry);
if (mysqli_num_rows($resultProvider) > 0) {
    while($rowProvider = mysqli_fetch_array($resultProvider)){
        $namaProvider   = $rowProvider['namaProvider'];
        $noProvider     = $rowProvider['noProvider'];
        $host           = $rowProvider['host'];
        $span           = $rowProvider['span'];

        // Kamu belum trdaftar di Pkt Internet.Utk mnghindari tarif internet perKB, Aktifkan FREEDOMCOMBO! UNLIMITED4G, STREAM ON,UNLIMITED Nelp&SMS di*123# atau im
        $url1 = "http://".$host."/cgi-bin/php/sms-inbox.php?current_page=1&port_filter=gsm-".$span."&phone_number_filter=123&start_datetime_filter=".$time_now_start."&end_datetime_filter=".$time_now_end."&message_filter=Kamu%20belum%20trdaftar%20di%20Pkt%20Internet&";
        echo $url1."\n";
        $output1 = curl_get_contents($url1);

        $dom1 = new DOMDocument();
        $dom1->preserveWhiteSpace = false;
        $dom1->formatOutput       = true;
        $dom1->loadHTML($output1);
        $body1 = $dom1->getElementById("mainform");
        $tr1 = $body1->getElementsByTagName('tr');
        if($tr1->length > 0){
            $message = "".$namaProvider." Belum terdaftar paket.. No :".$noProvider." (".$host." - ".$span.")";
            sendToSlack("cermati_pulsa", "Paket Officer", $message);
            // sendSms("089697304333", $message, $conn);
            echo "".$namaProvider." Belum terdaftar paket.. No :".$noProvider." (".$host." - ".$span.")";
        }else{
            //set url untuk inbox pada openvox
            // $url = "http://".$host."/cgi-bin/php/sms-inbox.php?current_page=1&port_filter=gsm-".$span."&phone_number_filter=3&start_datetime_filter=".$time_now_start."&end_datetime_filter=".$time_now_end."&message_filter=Sisa&";
            $url = "http://".$host."/cgi-bin/php/sms-inbox.php?current_page=1&port_filter=gsm-".$span."&phone_number_filter=123&start_datetime_filter=".$time_now_start."&end_datetime_filter=".$time_now_end."&message_filter=Sisa%20Bonus%20Nelpon%20Bulanan%20ke%20Semua%20Operator&";
            echo $url."\n";
            $output = curl_get_contents($url);

            $dom = new DOMDocument();
            $dom->preserveWhiteSpace = false;
            $dom->formatOutput       = true;
            $dom->loadHTML($output);
            $body = $dom->getElementById("mainform");
            $tr = $body->getElementsByTagName('tr');
            if($tr->length > 0){
                $row = 0;
                $data[$row] = array();
                //menentukan selector untuk data yang akan diambil

                foreach ($body->getElementsByTagName('tr') as $tr) {
                    $col = 0;
                    foreach ($tr->getElementsByTagName('td') as $td) {
                        $data[$row][$col] = $td;

                        $col++;
                    }
                    $row++;
                }
                //looping sebanyak jumlah item perhalaman
                for($item = 1; $item <= $itemPerPages; $item++){
                    $phone          = trim($data[$item][2]->nodeValue);
                    $date           = trim($data[$item][3]->nodeValue);
                    $msg            = trim($data[$item][4]->nodeValue);
                    // Sisa Bonus Nelpon Bulanan ke Semua Operator:371 menit ke Semua Operator berlaku sd 28/01/2017 09:58.Pakai terus Indosat Ooredoo-mu &Nikmati kebebasan ber
                    $packetRest = preg_replace("/\D/", "", substr($msg, 44, 4));

                    echo "iserting\n";
                    echo $phone."\n";
                    echo $date."\n";
                    echo $msg."\n";
                    echo $packetRest."\n";
                    $inserts[] = "(
                        '".$namaProvider."',
                        '".$packetRest."',
                        '".str_replace('/', '-', $date)."',
                        '".mysqli_real_escape_string($conn, $msg)."'
                        )";
                    if (intval($packetRest) <= 90) {
                        echo "".$namaProvider." - ".$host." (".$span.") sisa paket kurang dari 1,5 jam.. Sisa Paket : ".$packetRest." No. : ".$noProvider."\n";

                        $message = "".$namaProvider." - ".$host." (".$span.") sisa paket kurang dari 1,5 Jam.. Sisa Paket : ".$packetRest." No.: ".$noProvider."";
                        sendToSlack("cermati_pulsa", "Paket Officer", $message);
                        // sendSms("089697304333", $message, $conn);

                        // $totalSendTodayQry = "";
                        // $totalSendTodayQry = "SELECT count(*) as total FROM db_agen_pulsa.report WHERE DATE(tanggal) = DATE(NOW()) AND no = '".$noProvider."'";
                        // $resultToday = mysqli_query($conn, $totalSendTodayQry);
                        // if (mysqli_num_rows($resultToday) > 0) {
                        //     $rowTotal = mysqli_fetch_array($resultToday);
                        //     if ($rowTotal['total'] < 1) {
                        //         $text = "AN30.".$noProvider.".0312";
                        //         sendSms($nomorAgenPulsa, $text, $conn, $namaProvider, $noProvider, "AN30");
                        //         sendToSlack("agenpulsa", "Agenpulsa Officer", "SMS Dikirim, isi pulsa untuk ".$namaProvider.".. Isi pesan : AN30.".$noProvider.".0312");
                        //         echo "agenpulsa", "Agenpulsa Officer", "SMS Dikirim, isi pulsa untuk ".$namaProvider.".. Isi pesan : AN30.".$noProvider.".0312 \n";
                        //     } else {

                        //         $startTime  = date("Y-m-d H:i:s", strtotime("-250 minutes"));
                        //         $endTime    = date("Y-m-d H:i:s");

                        //         $checkQry = "";
                        //         $checkQry = "SELECT count(*) as total FROM db_agen_pulsa.report WHERE tanggal BETWEEN '".$startTime."' AND '".$endTime."' AND no = '".$noProvider."'";
                        //         $resultCheck = mysqli_query($conn, $checkQry);
                        //         if (mysqli_num_rows($resultCheck) > 0) {
                        //             $rowCheck = mysqli_fetch_array($resultCheck);
                        //             if ($rowCheck['total'] < 1) {
                        //                 $text = "AN30.2.".$noProvider.".0312";
                        //                 sendSms($nomorAgenPulsa, $text, $conn, $namaProvider, $noProvider, "AN30.2");
                        //                 sendToSlack("agenpulsa", "Agenpulsa Officer", "SMS Dikirim, isi pulsa untuk ".$namaProvider.".. Isi pesan : AN30.2.".$noProvider.".0312");
                        //                 echo "agenpulsa", "Agenpulsa Officer", "SMS Dikirim, isi pulsa untuk ".$namaProvider.".. Isi pesan : AN30.2.".$noProvider.".0312 \n";
                        //             }else{
                        //                 echo "Double request,, ignoring..\n";
                        //             }
                        //         }
                        //     } 
                        // }
                    }
                }
            }else{
                echo "kosong\n\n";
            }
        }
        $numNamaProvider++;
    }
}
// if (count($inserts) > 0) {
//     echo "inserting to db..";
//     $insertToDB = "INSERT INTO dbpulsa.paket (namaProvider, sisaPaket, tanggal, ussdReply) VALUES ".implode($inserts, ',');
//     if (!mysqli_query($conn, $insertToDB)) {
//         echo "Error: ".mysqli_error($conn);
//     }
// } else {
//     echo 'Nothing';
// }