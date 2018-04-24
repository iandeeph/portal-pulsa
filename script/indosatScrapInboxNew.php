<?php
// ini_set('display_errors', '1');
// ini_set('error_reporting', E_ALL & ~E_NOTICE);
error_reporting(0);
ini_set('memory_limit','1G');
set_time_limit(0);
ini_set('max_execution_time', 0); //300 seconds = 5 minutes
require "connconf.php";

date_default_timezone_set("Asia/Jakarta");

// function sendSms($phoneNumber, $message, $conn){
//     $now = date("Y-m-d H:i:s");
//     $msg = array();
//     $totSmsPage = ceil(strlen($message)/160);

//     if($totSmsPage == 1){
//         $inserttooutbox1 = "INSERT INTO db_agen_pulsa.outbox (DestinationNumber, TextDecoded, CreatorID, Coding) 
//                             VALUES ('".$phoneNumber."', '".$message."', 'agenpulsa', 'Default_No_Compression');";

//         if (mysqli_query($conn, $inserttooutbox1)) {
//             echo "Message sent to ".$phoneNumber." - ".$message."";
//         } else {
//             echo "Error: ".$inserttooutbox1. " ".mysqli_error($conn);
//         }
//     }else{
//         $hitsplit = ceil(strlen($message)/153);
//         $split  = str_split($message, 153);

//         for ($i=1; $i<=$totSmsPage; $i++){
//             $udh = "050003A7".sprintf("%02s", $hitsplit).sprintf("%02s", $i);
//             $msg = $split[$i-1];

//             if ($i == 1){
//                 $inserttooutbox = "INSERT INTO db_agen_pulsa.outbox (DestinationNumber, UDH, TextDecoded, MultiPart, CreatorID, Class)
//                 VALUES ('".$phoneNumber."', '".$udh."', '".$msg."', 'true', 'agenpulsa', '-1')";
//             }else{
//                 $inserttooutbox = "INSERT INTO db_agen_pulsa.outbox_multipart(UDH, TextDecoded, SequencePosition)
//                 VALUES ('".$udh."', '".$msg."', '".$i."')";
//             }
//             if (mysqli_query($conn, $inserttooutbox)) {
//                 echo "Message sent to ".$phoneNumber." - ".$message."";
//             } else {
//                 echo "Error: ".$inserttooutbox. " ".mysqli_error($conn);
//             }
//         } 
//     }
// }
//the name of the curl function
function curl_get_contents($url){
    $username = "admin";
    $password = "c3rmat";

    //Initiate the curl
    $ch=curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    //removes the header of the webpage
    curl_setopt($ch, CURLOPT_HEADER, 0);
    //do not display the whole page
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_ANY);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
    //insert openvox password
    curl_setopt($ch, CURLOPT_USERPWD, $username.":".$password);
    $headers = array(
        'Content-Type:application/json',
        'Authorization: Basic '. base64_encode("$username:$password")
    );
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    //execute the curl
    $output = curl_exec($ch);
    //close the curl so that resources are not wasted
    //curl_close($ch);
    return $output;
}

function sendToSlack($room, $username, $message){
    $icon       = ":exclamation:"; 
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

$time_now_start = date("Y/m/d%20H:i:s", strtotime("-30 minutes"));
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
$providerQry = "SELECT * FROM db_agen_pulsa.provider where namaProvider not like '%XL%' ORDER BY length(namaProvider), namaProvider";
$resultProvider = mysqli_query($conn, $providerQry);
if (mysqli_num_rows($resultProvider) > 0) {
    while($rowProvider = mysqli_fetch_array($resultProvider)){
        $idProvider    = $rowProvider['idProvider'];
        $namaProvider  = $rowProvider['namaProvider'];
        $noProvider    = $rowProvider['noProvider'];
        $tmpHost       = $rowProvider['host'];
        $tmpSpan       = $rowProvider['span'];

        $updateStatusQry = "UPDATE db_agen_pulsa.provider SET statusPaket = '2' WHERE idProvider = '".$idProvider."'";

        if(!mysqli_query($conn, $updateStatusQry)){
            echo "ERROR: Could not able to execute ".$updateStatusQry.". " . mysqli_error($conn);
        }

        $lastNum = strrpos($tmpHost, ".",-1);
        // echo $lastNum."\n";

        $hasil=substr($tmpHost, intval($lastNum)+1,3);
        // echo $hasil."\n";

            if ($hasil % 2 == 0) {
              $host = $tmpHost;
              $span = $tmpSpan;
            } else {
              $host = substr($tmpHost, 0, $lastNum).".".($hasil-1);
              $span = $tmpSpan + 4;
            }

        // Kamu belum trdaftar di Pkt Internet.Utk mnghindari tarif internet perKB, Aktifkan FREEDOMCOMBO! UNLIMITED4G, STREAM ON,UNLIMITED Nelp&SMS di*123# atau im
        $url1 = "http://".$host."/cgi-bin/php/sms-inbox.php?current_page=1&port_filter=gsm-".$span."&phone_number_filter=123&start_datetime_filter=".$time_now_start."&end_datetime_filter=".$time_now_end."&message_filter=Kamu%20belum%20trdaftar%20di%20Pkt%20Internet&";
        // $url1 = "http://3.3.3.13/cgi-bin/php/sms-inbox.php?current_page=1&port_filter=gsm-".$span."&phone_number_filter=123&start_datetime_filter=".$time_now_start."&end_datetime_filter=".$time_now_end."&message_filter=Kamu%20belum%20trdaftar%20di%20Pkt%20Internet&";
        echo $url1."\n";
        $output1 = curl_get_contents($url1);

        // untuk develope pake ini. verbose
        // echo $output1;

        if ($output1) {
            $dom1 = new DOMDocument();
            $dom1->preserveWhiteSpace = false;
            $dom1->formatOutput       = true;
            $dom1->loadHTML($output1);
            $title = $dom1->getElementsByTagName("title");
            $item = $dom1->getElementById('mainform');

            if($title->item(0)->textContent == "401 - Unauthorized"){
                echo '['.$date.'] Parsing : '.$url." << 401 - Unauthorized..!!! \n";
            }else{
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
                    $url = "http://".$host."/cgi-bin/php/sms-inbox.php?current_page=1&port_filter=gsm-".$span."&phone_number_filter=123&start_datetime_filter=".$time_now_start."&end_datetime_filter=".$time_now_end."&message_filter=Sisa%20kuota%20Obrol%20bulanan%20ke%20semua%20operator&";
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
                            // sebelumnya
                            // Sisa Bonus Nelpon Bulanan ke Semua Operator:371 menit ke Semua Operator berlaku sd 28/01/2017 09:58.Pakai terus Indosat Ooredoo-mu &Nikmati kebebasan ber
                            // 20180208
                            // Sisa kuota Obrol bulanan ke semua operator 0 menit berlaku sd 05/03/2018 06:41. Pakai terus IM3 Ooredoo-mu & nikmati kebebasan berkomunikasi. Info *123#
                            // Sisa kuota Obrol bulanan ke semua operator Voice allnet: 451    menit berlaku sd 10/03/2018 11:37. Pakai terus IM3 Ooredoo-mu & nikmati kebebasan berkomunikasi
                            // 20180329
                            // @Sisa kuota Obrol bulanan ke semua operator Voice allnet: 473    menit berlaku sd 28/04/2018 06:35. Pakai terus IM3 Ooredoo-mu & nikmati kebebasan berkomu
                            if(substr($msg, 1, 57) == "Sisa kuota Obrol bulanan ke semua operator Voice allnet: "){
                                $packetRest = preg_replace("/\D/", "", substr($msg, 57, 5));
                            }else{
                                $packetRest = preg_replace("/\D/", "", substr($msg, 43, 5));
                            }
                            echo $msg;
                            echo $packetRest;

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

                            if(intval($packetRest) <= 300){
                                $updateStatusQry = "UPDATE db_agen_pulsa.provider SET statusPaket = '0', lastPaket='".$packetRest."' WHERE idProvider = '".$idProvider."'";

                                if(!mysqli_query($conn, $updateStatusQry)){
                                    echo "ERROR: Could not able to execute ".$updateStatusQry.". " . mysqli_error($conn);
                                }
                            }else{
                                $updateStatusQry = "UPDATE db_agen_pulsa.provider SET statusPaket = '1', lastPaket='".$packetRest."' WHERE idProvider = '".$idProvider."'";

                                if(!mysqli_query($conn, $updateStatusQry)){
                                    echo "ERROR: Could not able to execute ".$updateStatusQry.". " . mysqli_error($conn);
                                }
                            }
                        }
                    }else{
                        echo "kosong\n\n";
                    }
                }
                $numNamaProvider++;    
            }
        }  
    }
}
echo "try to insert to DB..";
echo "$inserts";
if (count($inserts) > 0) {
    echo "inserting to db..";
    $insertToDB = "INSERT INTO db_agen_pulsa.paket (namaProvider, sisaPaket, tanggal, ussdReply) VALUES ".implode($inserts, ',');
    if (!mysqli_query($conn, $insertToDB)) {
        echo "Error: ".mysqli_error($conn);
    }
} else {
    echo 'Nothing';
}