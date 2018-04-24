<?php
ini_set('display_errors', '1');
ini_set('error_reporting', E_ALL & ~E_NOTICE);
error_reporting(0);
ini_set('memory_limit','1G');
set_time_limit(0);
ini_set('max_execution_time', 0); //300 seconds = 5 minutes
require "connconf.php";

date_default_timezone_set("Asia/Jakarta");

$time_now_start = date("Y/m/d%20H:i:s", strtotime("-30 minutes"));
$time_now_end = date("Y/m/d%20H:i:s");

$noAntrianBaru = 1;

$laporanQry = "";
$laporanQry = "SELECT * FROM db_portal_it.laporan where resolve = 'FALSE' AND status != 'Done' ORDER BY tanggalBuat ";
$resultLaporan = mysqli_query($conn, $laporanQry);
if (mysqli_num_rows($resultLaporan) > 0) {
    while($rowLaporan = mysqli_fetch_array($resultLaporan)){
        // echo $rowLaporan['noantrian']."\n";

        $updateAntrianQry = "UPDATE db_portal_it.laporan SET noantrian = '".$noAntrianBaru."' WHERE idLaporan = '".$rowLaporan['idlaporan']."'";

        if(mysqli_query($conn, $updateAntrianQry)){
            echo "reset no antrianan sukses..\n";
        }else{
            echo "ERROR: Could not able to execute ".$updateAntrianQry.". " . mysqli_error($conn);
        }
    $noAntrianBaru++;
    }
}
?>
