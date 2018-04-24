<?php
// ini_set('display_errors', '1');
// ini_set('error_reporting', E_ALL & ~E_NOTICE);
error_reporting(0);
ini_set('memory_limit','1G');
set_time_limit(0);
ini_set('max_execution_time', 0); //300 seconds = 5 minutes
require "connconf.php";

date_default_timezone_set("Asia/Jakarta");

function isiPulsa ($currPulsa, $packPrice, $nomorTujuan, $nomorAgenPulsa){
    if ($currPulsa < $packPrice) {
        $pulsa100 = 0;
        $pulsa50 = 0;
        $outstanding = $packPrice - $currPulsa;
        if ($outstanding > 100000) {
            $pulsa100 = $outstanding/100000;
            $outstanding = $outstanding-($pulsa100*100000);
            if ($outstanding > 50000) {
                $pulsa100 = $pulsa100+1;
            } else {
                $pulsa50 = 1;
            }
        } else if ($outstanding < 100000 && $outstanding > 50000) {
            $pulsa100 = $pulsa100+1;
        } else {
            $pulsa50 = 1;
        }
        
        for ($i=0; $i < $pulsa100; $i++) { 
            if ($i > 1) {
                $mintaPulsaQry = "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('".$nomorAgenPulsa."', '".$i.".100.".$nomorTujuan.".0312', 'agenpulsa', 'Default_No_Compression')";
                if (!mysqli_query($conn, $mintaPulsaQry)) {
                    echo "Error: ".mysqli_error($conn);
                }
            } else {
                $mintaPulsaQry = "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('".$nomorAgenPulsa."', '100.".$nomorTujuan.".0312', 'agenpulsa', 'Default_No_Compression')";
                if (!mysqli_query($conn, $mintaPulsaQry)) {
                    echo "Error: ".mysqli_error($conn);
                }
            }
            
        }

        if ($pulsa50 >= 1) {
            $mintaPulsaQry = "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('".$nomorAgenPulsa."', '50.".$nomorTujuan.".0312', 'agenpulsa', 'Default_No_Compression')";
            if (!mysqli_query($conn, $mintaPulsaQry)) {
                echo "Error: ".mysqli_error($conn);
            }
        }

    }
}

$nomorAgenPulsa = "08562699002";

$providerQry = "";
$providerQry = "SELECT * FROM db_agen_pulsa.provider where statusPaket = '0' AND namaProvider not like '%XL%' ORDER BY length(namaProvider), namaProvider";
$resultProvider = mysqli_query($conn, $providerQry);
if (mysqli_num_rows($resultProvider) > 0) {
    while($rowProvider = mysqli_fetch_array($resultProvider)){
        $idProvider    = $rowProvider['idProvider'];
        $namaProvider  = $rowProvider['namaProvider'];
        $noProvider    = $rowProvider['noProvider'];
        $tmpHost       = $rowProvider['host'];
        $tmpSpan       = $rowProvider['span'];
        $lastPaket     = $rowProvider['lastPaket'];
        $lastPulsa     = $rowProvider['lastPulsa'];
        $statusPulsa   = $rowProvider['statusPulsa'];
        $hargaPaket    = $rowProvider['hargaPaket'];

        if ($statusPulsa == '0') {
            isiPulsa($lastPulsa, $hargaPaket, $noProvider, $nomorAgenPulsa);
             $updateStatusQry = "UPDATE db_agen_pulsa.provider SET statusPulsa = '3' WHERE idProvider = '".$idProvider."'";

            if(!mysqli_query($conn, $updateStatusQry)){
                echo "ERROR: Could not able to execute ".$updateStatusQry.". " . mysqli_error($conn);
            }
        } else {
            # code...
        }
        
        
    }
}