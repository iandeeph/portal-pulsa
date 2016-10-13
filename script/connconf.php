<?php
$servername = "1.1.1.200";
$username = "root";
$password = "c3rmat";

// Create connection
$conn = mysqli_connect($servername, $username, $password);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
?>
