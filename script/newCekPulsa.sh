
#! /bin/bash
# clear
#===============================================================================
#Konfigurasi Database
#===============================================================================
HOST='1.1.1.200'
USER='root'
PASSWORD='c3rmat'
#===============================================================================
#Inisialisasi harga paket masing-masing provider,, nantinya jika pulsa kurang dari harga paket maka akan minta isi pulsa ke Tukang Pulsa
#===============================================================================
HARGA_PAKET_SIMPATI=12500
HARGA_PAKET_XL=132000
HARGA_PAKET_THREE=5000

#===============================================================================
#Inisialisasi parameter untuk post to slack
#===============================================================================
CHANNEL="#cermati_pulsa"
USERNAME="Pika Pulsa"
ICONEMOJI=":pika-shy:"
ICONEMOJI2=":pikapika:"

#===============================================================================
#inisialisasi tanggal habis paket untuk provider Simpati/Telkomsel
#jika tanggal = hari ini, maka paket akan diperpanjang
#jika paket diperpanjang, maka tanggal akan diupdate / ditambahkan sesuai panjangnya masa berlaku paket
#paket Indosat tidak ada karena Indosat diperpanjang setiap hari selama pulsa mencukupi
#===============================================================================
#===============================================================================
#mengambil semua element dalam database, query dari database
#===============================================================================
#===============================================================================
#TELKOMSEL
#===============================================================================
telkomselResult=($(mysql dbpulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, hargaPaket, expDatePaket, caraCekPulsa, caraAktivasi from provider where namaProvider like 'Telkomsel%' order by namaProvider;"))
cntTelkomselElm=8
cntTelkomsel=${#telkomselResult[@]}
telkomselSet=$(((cntTelkomsel+1)/cntTelkomselElm))

for (( i=1 ; i<=telkomselSet ; i++ ))
do
	x=$((cntTelkomselElm * (i-1)))
	telkomselNama[$i]=${telkomselResult[$((x + 0 ))]};
	telkomselNo[$i]=${telkomselResult[$((x + 1))]};
	telkomselHost[$i]=${telkomselResult[$((x + 2))]};
	telkomselSpan[$i]=${telkomselResult[$((x + 3))]};
	telkomselHargaPaket[$i]=${telkomselResult[$((x + 4))]};
	telkomselExpDatePaket[$i]=${telkomselResult[$((x + 5))]};
	telkomselCaraCekPulsa[$i]=${telkomselResult[$((x + 6))]};
	telkomselCaraAktivasi[$i]=${telkomselResult[$((x + 7))]};
done
#===============================================================================
#XL
#===============================================================================
XLResult=($(mysql dbpulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, hargaPaket, expDatePaket, caraCekPulsa, caraAktivasi from provider where namaProvider like 'XL%' order by namaProvider;"))
cntXLElm=8
cntXL=${#XLResult[@]}
XLSet=$(((cntXL+1)/cntXLElm))

for (( i=1 ; i<=XLSet ; i++ ))
do
	x=$((cntXLElm * (i-1)))
	XLNama[$i]=${XLResult[$((x + 0 ))]};
	XLNo[$i]=${XLResult[$((x + 1))]};
	XLHost[$i]=${XLResult[$((x + 2))]};
	XLSpan[$i]=${XLResult[$((x + 3))]};
	XLHargaPaket[$i]=${XLResult[$((x + 4))]};
	XLExpDatePaket[$i]=${XLResult[$((x + 5))]};
	XLCaraCekPulsa[$i]=${XLResult[$((x + 6))]};
	XLCaraAktivasi[$i]=${XLResult[$((x + 7))]};
done
#===============================================================================
#THREE
#===============================================================================
threeResult=($(mysql dbpulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, hargaPaket, expDatePaket, caraCekPulsa from provider where namaProvider like 'Three%' order by namaProvider;"))
cntThreeElm=7
cntThree=${#threeResult[@]}
threeSet=$(((cntThree+1)/cntThreeElm))

for (( i=1 ; i<=threeSet ; i++ ))
do
	x=$((cntThreeElm * (i-1)))
	threeNama[$i]=${threeResult[$((x + 0 ))]};
	threeNo[$i]=${threeResult[$((x + 1))]};
	threeHost[$i]=${threeResult[$((x + 2))]};
	threeSpan[$i]=${threeResult[$((x + 3))]};
	threeHargaPaket[$i]=${threeResult[$((x + 4))]};
	threeExpDatePaket[$i]=${threeResult[$((x + 5))]};
	threeCaraCekPulsa[$i]=${threeResult[$((x + 6))]};
done

cnt=${#telkomselExpDatePaket[@]} #menghitung total row
for (( i=1 ; i<=${cnt} ; i++ )) #loooping sebanyak total row
do
    telkomselExpDatePaket[$i]=${telkomselExpDatePaket[$i]//[-]/} #merubah dateformat menjadi yyyymmdd yang sebelumnya yyy-dd-mm dengan menghilangkan "-"
done

#===============================================================================
#mencari tanggal hari ini dalam format yyyymmdd
#===============================================================================
NOW=$(date +%Y%m%d)
currentTime=$(date +"[ %Y-%m-%d %H:%M:%S ]")
mysqlDateNow=$(date +"%Y-%m-%d %H:%M:%S")

#===============================================================================
#inisialisasi nomor tukang pulsa a.k.a Karin dan tukang ketik a.k.a ian
#===============================================================================
TUKANGPULSA=081381171337
TUKANGKETIK=08992112203

#===============================================================================
#inisialisasi array untuk nomor telp masing-masing provider.. urutan nomor tergantung kepada posisi pada slot openvox..
#===============================================================================
# TELKOMSEL=(081212232674 081212232835 081212232617 081319468847 082112592932 081213374483 081295882084 081295741478 081212232638)
# XL=(081807184805 087886347632 087780867200 087883072681)
# INDOSAT=(085710250739 085710250748 081513779454)
# THREE=(089629783240 089629779562 089629789574)

if [ -t 1 ] ; then #mengecek apakan dijalankan di terminal atau di cronjob, karena cronjob tidak dapat membaca tput
	#===============================================================================
	#Inisialisasi warna text untuk memudahkan membaca output
	#===============================================================================
	red=`tput setaf 1`
	green=`tput setaf 2`
	yellow=`tput setaf 3`
	reset=`tput sgr0`
else
	red=''
	green=''
	yellow=''
	reset=''
fi

#===============================================================================
#restarting openvox, tujuannya untuk memastikan cek pulsa dengan kode USSD berhasil.. Karena menurut pengalaman, adakalanya USSD gagal dijalankan..
#metode restart adalah mengirim SMS dengan isi pesan 'reboot system <password> ke masing-masing modul openvox (3.3.3.2, 3.3.3.3, 3.3.3.4 & 3.3.3.5)'
#===============================================================================
echo "$currentTime - Restarting openvox..."
echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${telkomselNo[1]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${telkomselNo[5]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${telkomselNo[5]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${telkomselNo[17]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${XLNo[1]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${XLNo[5]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${XLNo[9]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${threeNo[1]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms

#===============================================================================
#memberikan waktu untuk openvox kembali UP setelah di restart.. 
#===============================================================================
sleep 3m

#===============================================================================
#menghapus file known_host, tujuannya agar setiap kali ssh akan membuat RSA baru.. Jadi tidak ada kegagalan saat pertamakali SSH ke host tersebut..
#===============================================================================
echo $(rm -rf ~/.ssh/known_hosts)

#===============================================================================
#inisialisasi function command script cek pulsa
#===============================================================================
telkomselFx1()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[1]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[1]} ${telkomselCaraCekPulsa[1]}'")
}
telkomselFx2()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[2]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[2]} ${telkomselCaraCekPulsa[2]}'")
}
telkomselFx3()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[3]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[3]} ${telkomselCaraCekPulsa[3]}'")
}
telkomselFx4()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[4]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[4]} ${telkomselCaraCekPulsa[4]}'")
}
telkomselFx5()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[5]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[5]} ${telkomselCaraCekPulsa[5]}'")
}
telkomselFx6()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[6]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[6]} ${telkomselCaraCekPulsa[6]}'")
}
telkomselFx7()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[7]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[7]} ${telkomselCaraCekPulsa[7]}'")
}
telkomselFx8()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[8]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[8]} ${telkomselCaraCekPulsa[8]}'")
}
telkomselFx9()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[9]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[9]} ${telkomselCaraCekPulsa[9]}'")
}
telkomselFx10()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[10]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[10]} ${telkomselCaraCekPulsa[10]}'")
}
telkomselFx11()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[11]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[11]} ${telkomselCaraCekPulsa[11]}'")
}
telkomselFx12()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[12]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[12]} ${telkomselCaraCekPulsa[12]}'")
}
telkomselFx13()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[13]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[13]} ${telkomselCaraCekPulsa[13]}'")
}
telkomselFx14()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[14]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[14]} ${telkomselCaraCekPulsa[14]}'")
}
telkomselFx15()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[15]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[15]} ${telkomselCaraCekPulsa[15]}'")
}
telkomselFx16()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[16]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[16]} ${telkomselCaraCekPulsa[16]}'")
}
telkomselFx17()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[17]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[17]} ${telkomselCaraCekPulsa[17]}'")
}

xlFx1()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[1]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[1]} ${XLCaraCekPulsa[1]}'")
}
xlFx2()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[2]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[2]} ${XLCaraCekPulsa[2]}'")
}
xlFx3()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[3]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[3]} ${XLCaraCekPulsa[3]}'")
}
xlFx4()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[4]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[4]} ${XLCaraCekPulsa[4]}'")
}
xlFx5()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[5]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[5]} ${XLCaraCekPulsa[5]}'")
}
xlFx6()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[6]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[6]} ${XLCaraCekPulsa[6]}'")
}
xlFx7()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[7]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[7]} ${XLCaraCekPulsa[7]}'")
}
xlFx8()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[8]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[8]} ${XLCaraCekPulsa[8]}'")
}
xlFx9()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[9]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[9]} ${XLCaraCekPulsa[9]}'")
}
xlFx10()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[10]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[10]} ${XLCaraCekPulsa[10]}'")
}
xlFx11()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[11]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[11]} ${XLCaraCekPulsa[11]}'")
}
xlFx12()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	xl=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[12]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[12]} ${XLCaraCekPulsa[12]}'")
}

# indosatFx1()
# {
# 	echo $(rm -rf ~/.ssh/known_hosts)
# 	indosat=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.4 -p12345 "asterisk -rx 'gsm send ussd 2 *555#'")
# }
# indosatFx2()
# {
# 	echo $(rm -rf ~/.ssh/known_hosts)
# 	indosat=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.4 -p12345 "asterisk -rx 'gsm send ussd 3 *555#'")
# }
# indosatFx3()
# {
# 	echo $(rm -rf ~/.ssh/known_hosts)
# 	indosat=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.4 -p12345 "asterisk -rx 'gsm send ussd 4 *555#'")
# }

threeFx1()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	three=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[1]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[1]} ${threeCaraCekPulsa[1]}'")
}
threeFx2()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	three=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[2]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[2]} ${threeCaraCekPulsa[2]}'")
}
threeFx3()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	three=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[3]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[3]} ${threeCaraCekPulsa[3]}'")
}


renewalTelkomselFx1()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[1]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[1]} ${telkomselCaraAktivasi[1]}'")
}
renewalTelkomselFx2()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[2]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[2]} ${telkomselCaraAktivasi[2]}'")
}
renewalTelkomselFx3()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[3]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[3]} ${telkomselCaraAktivasi[3]}'")
}
renewalTelkomselFx4()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[4]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[4]} ${telkomselCaraAktivasi[4]}'")
}
renewalTelkomselFx5()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[5]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[5]} ${telkomselCaraAktivasi[5]}'")
}
renewalTelkomselFx6()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[6]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[6]} ${telkomselCaraAktivasi[6]}'")
}
renewalTelkomselFx7()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[7]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[7]} ${telkomselCaraAktivasi[7]}'")
}
renewalTelkomselFx8()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[8]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[8]} ${telkomselCaraAktivasi[8]}'")
}
renewalTelkomselFx9()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[9]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[9]} ${telkomselCaraAktivasi[9]}'")
}
renewalTelkomselFx10()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[10]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[10]} ${telkomselCaraAktivasi[10]}'")
}
renewalTelkomselFx11()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[11]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[11]} ${telkomselCaraAktivasi[11]}'")
}
renewalTelkomselFx12()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[12]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[12]} ${telkomselCaraAktivasi[12]}'")
}
renewalTelkomselFx13()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[13]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[13]} ${telkomselCaraAktivasi[13]}'")
}
renewalTelkomselFx14()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[14]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[14]} ${telkomselCaraAktivasi[14]}'")
}
renewalTelkomselFx15()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[15]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[15]} ${telkomselCaraAktivasi[15]}'")
}
renewalTelkomselFx16()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[16]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[16]} ${telkomselCaraAktivasi[16]}'")
}
renewalTelkomselFx17()
{
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[17]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[17]} ${telkomselCaraAktivasi[17]}'")
}

for (( i = 1; i <= 17; i++ )); do
	telkomsel[$i]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[$i]} ${telkomselCaraCekPulsa[$i]}'")
	sleep 5s
done

for (( i = 1; i <= 14; i++ )); do
	XL[$i]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${XLHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${XLSpan[$i]} ${XLCaraCekPulsa[$i]}'")
	sleep 5s
done

# indosat[1]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.4 -p12345 "asterisk -rx 'gsm send ussd 2 *555#'")
# sleep 5s
# indosat[2]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.4 -p12345 "asterisk -rx 'gsm send ussd 3 *555#'")
# sleep 5s
# indosat[3]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.4 -p12345 "asterisk -rx 'gsm send ussd 4 *555#'")
# sleep 5s

for (( i = 1; i <= 3; i++ )); do
	three[$i]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[$i]} ${threeCaraCekPulsa[$i]}'")
	sleep 5s
done

numSimpati=1
numXl=1
numIndosat=1
numThree=1
maxAttempt=5
maxAttempt=$((maxAttempt+0))

# ==================================================================================================
# Simpati
# ==================================================================================================

for i in "${telkomselNo[@]}" #looping sebanyak jumlah variable array
do
	#===============================================================================
	#melakukan cek pulsa untuk masing-masing nomor pada slot openvox
	#metodenya adalah SSH pada openvox dan menjalankan USSD pada asterisk di openvox
	#===============================================================================
	echo "$currentTime - ===================================================================================================="
	echo "$currentTime - Checking Pulsa ${telkomselNama[$numSimpati]}..."
	echo "$currentTime - ===================================================================================================="
	cekString=${telkomsel[$numSimpati]:2:6} # mengecek respon dari openvox
	cekString2=${telkomsel[$numSimpati]:49:4} # mengecek respon dari openvox
	cekString3=${telkomsel[$numSimpati]:48:4} # mengecek respon dari openvox

	echo "$currentTime - USSD REPLY : ${yellow}${telkomsel[$numSimpati]}${reset}"

	if [ "$cekString" = "Recive"  ] ; then #bila respon open = Recive
		if [[ "$cekString2" != "Maaf" ]] || [[ "$cekString3" != "Maaf" ]]; then
			echo "$currentTime - ${green}${telkomselNama[$numSimpati]} Cek Berhasil...${reset}"
			echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
			USSDReplyTelkomsel[$numSimpati]="${telkomsel[$numSimpati]}"
			telkomsel[$numSimpati]=${telkomsel[$numSimpati]:62:6} #mengambil character yang bernilai jumlah pulsa
			telkomsel[$numSimpati]=${telkomsel[$numSimpati]//[.Aktif]/} #mengabaikan character lain selain angka
			telkomsel[$numSimpati]=$((telkomsel[$numSimpati] + 0)) #merubah variable yang semula string menjadi integer
			echo "$currentTime - ${green}Sisa pulsa ${telkomselNama[$numSimpati]} : ${telkomsel[$numSimpati]}${reset}"
			#===============================================================================
			#memasukan nilai cek pulsa (pulsa) kedalam database
			#===============================================================================
			sisaPulsaTelkomsel[$numSimpati]=${telkomsel[$numSimpati]}

			if [[ ${telkomsel[$numSimpati]} -lt ${telkomselHargaPaket[$numSimpati]} ]]; then #mengecek jika pulsa kurang dari harga paket masing-masing provider
				echo "$currentTime - Kirim Slack ke PIKArin, minta isi pulsa Telkomsel - ${telkomselNo[$numSimpati]}"
				#insert ke database sms untuk mengirim pulsa ke tukang pulsa
				# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : ${telkomselNo[$numSimpati]}, sisa pulsa: (${telkomsel[$numSimpati]}), harga paket: ${telkomselHargaPaket[$numSimpati]}, Exp Date Paket: ${telkomselExpDatePaket[$numSimpati]}', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
				slackText="Simpati No : $i,\nSisa Pulsa: ${telkomsel[$numSimpati]},\nHarga Paket: ${telkomselHargaPaket[$numSimpati]},\nExp Date Paket: ${telkomselExpDatePaket[$numSimpati]}"
				curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
			fi
		else
			attempt=1
			attempt=$((attempt + 0))
			cekBerhasil=""
			echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Cek Gagal...${reset}"
			echo "----------------------------------------------"
			while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
				echo "$currentTime - ${telkomselNama[$numSimpati]} percobaan ke-$attempt"
				telkomselFx$numSimpati
				cekString=${telkomsel:2:6}
				cekString2=${telkomsel:49:4}
				cekString3=${telkomsel:49:4}
				echo "$currentTime - USSD REPLY : ${yellow}$telkomsel${reset}"
				USSDReplyTelkomsel[$numSimpati]="$telkomsel"

				if [ "$cekString" = "Recive"  ]; then
					if [[ "$cekString2" != "Maaf" ]] || [[ "$cekString3" != "Maaf" ]]; then
						echo "$currentTime - ${green}${telkomselNama[$numSimpati]} Cek Berhasil...${reset}"
						echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
						cekBerhasil="berhasil"
						attempt=$((attempt + 3))
						telkomsel=${telkomsel:62:6}
						telkomsel=${telkomsel//[.Aktif]/}
						telkomsel=$((telkomsel + 0))
						echo "$currentTime - ${green}Sisa pulsa }${telkomselNama[$numSimpati]} : $telkomsel${reset}"

						#===============================================================================
						#memasukan nilai cek pulsa (pulsa) kedalam database
						#===============================================================================
						sisaPulsaTelkomsel[$numSimpati]=$telkomsel

						if [[ $telkomsel -lt ${telkomselHargaPaket[$numSimpati]} ]]; then
							echo "$currentTime - Kirim SMS ke PIKArin, minta isi pulsa Telkomsel - ${telkomselNo[$numSimpati]}"
							#insert ke database sms untuk mengirim pulsa ke tukang pulsa
							# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : ${telkomselNo[$numSimpati]}, sisa pulsa: ($telkomsel), harga paket: ${telkomselHargaPaket[$numSimpati]}, Exp Date Paket: ${telkomselExpDatePaket[$numSimpati]}', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
							slackText="Simpati No : $i,\nSisa Pulsa: Sisa Pulsa: $telkomsel,\nHarga Paket: ${telkomselHargaPaket[$numSimpati]},\nExp Date Paket: ${telkomselExpDatePaket[$numSimpati]}"
							curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
						fi
					else
						cekBerhasil="gagal"
						echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Cek Gagal...${reset}"
						echo "----------------------------------------------"
						attempt=$((attempt + 1))
						if [[ $attempt == $maxAttempt ]]; then
							#===============================================================================
							#jika cek gagal,, tetap diinsert dengan nilai 0
							#===============================================================================
							sisaPulsaTelkomsel[$numSimpati]=0
						fi
					fi
				else
					cekBerhasil="gagal"
					echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Cek Gagal...${reset}"
					echo "----------------------------------------------"
					attempt=$((attempt + 1))
					if [[ $attempt == $maxAttempt ]]; then
						#===============================================================================
						#jika cek gagal,, tetap diinsert dengan nilai 0
						#===============================================================================
						sisaPulsaTelkomsel[$numSimpati]=0
					fi
				fi
			done
		fi
	else
		attempt=1
		attempt=$((attempt + 0))
		cekBerhasil=""
		echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Cek Gagal...${reset}"
		echo "----------------------------------------------"
		while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
			echo "$currentTime - ${telkomselNama[$numSimpati]} percobaan ke-$attempt"
			telkomselFx$numSimpati
			cekString=${telkomsel:2:6}
			cekString2=${telkomsel:49:4}
			cekString3=${telkomsel:49:4}
			echo "$currentTime - USSD REPLY : ${yellow}$telkomsel${reset}"
			USSDReplyTelkomsel[$numSimpati]="$telkomsel"

			if [ "$cekString" = "Recive"  ]; then
				if [[ "$cekString2" != "Maaf" ]] || [[ "$cekString3" != "Maaf" ]]; then
					echo "$currentTime - ${green}${telkomselNama[$numSimpati]} Cek Berhasil...${reset}"
					echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
					cekBerhasil="berhasil"
					attempt=$((attempt + 3))
					telkomsel=${telkomsel:62:6}
					telkomsel=${telkomsel//[.Aktif]/}
					telkomsel=$((telkomsel + 0))
					echo "$currentTime - ${green}Sisa pulsa }${telkomselNama[$numSimpati]} : $telkomsel${reset}"

					#===============================================================================
					#memasukan nilai cek pulsa (pulsa) kedalam database
					#===============================================================================
					sisaPulsaTelkomsel[$numSimpati]=$telkomsel

					if [[ $telkomsel -lt ${telkomselHargaPaket[$numSimpati]} ]]; then
						echo "$currentTime - Kirim SMS ke PIKArin, minta isi pulsa Telkomsel - ${telkomselNo[$numSimpati]}"
						#insert ke database sms untuk mengirim pulsa ke tukang pulsa
						# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : ${telkomselNo[$numSimpati]}, sisa pulsa: ($telkomsel), harga paket: ${telkomselHargaPaket[$numSimpati]}, Exp Date Paket: ${telkomselExpDatePaket[$numSimpati]}', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
						slackText="Simpati No : $i,\nSisa Pulsa: Sisa Pulsa: $telkomsel,\nHarga Paket: ${telkomselHargaPaket[$numSimpati]},\nExp Date Paket: ${telkomselExpDatePaket[$numSimpati]}"
						curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
					fi
				else
					cekBerhasil="gagal"
					echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Cek Gagal...${reset}"
					echo "----------------------------------------------"
					attempt=$((attempt + 1))
					if [[ $attempt == $maxAttempt ]]; then
						#===============================================================================
						#jika cek gagal,, tetap diinsert dengan nilai 0
						#===============================================================================
						sisaPulsaTelkomsel[$numSimpati]=0
					fi
				fi
			else
				cekBerhasil="gagal"
				echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Cek Gagal...${reset}"
				echo "----------------------------------------------"
				attempt=$((attempt + 1))
				if [[ $attempt == $maxAttempt ]]; then
					#===============================================================================
					#jika cek gagal,, tetap diinsert dengan nilai 0
					#===============================================================================
					sisaPulsaTelkomsel[$numSimpati]=0
				fi
			fi
		done
	fi
	echo "$currentTime - ${green}+++++++++++++++++++++++ CHECKING ${telkomselNama[$numSimpati]} FINISHED+++++++++++++++++++++${reset}"

	if [[ $NOW -ge ${telkomselExpDatePaket[$numSimpati]} ]]; then
		if [[ ${sisaPulsaTelkomsel[$numSimpati]} -lt ${telkomselHargaPaket[$numSimpati]} ]]; then
			echo "$currentTime - ===================================================================================================="
			echo "$currentTime - Perpanjang Paket ${telkomselNama[$numSimpati]}..."
			echo "$currentTime - ===================================================================================================="
			echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Gagal Perpanjang... Pulsa tidak cukup..${reset}"
			echo "$currentTime - -------------------------------------------------------------------------------------------------------------"

			textNotifikasiTelkomsel[$numSimpati]="${telkomselNama[$numSimpati]} perpanjang paket gagal, pulsa tidak cukup untuk perpanjang paket.. \nSisa Pulsa : ${sisaPulsaTelkomsel[$numSimpati]}"
			curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"${textNotifikasiTelkomsel[$numSimpati]}"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
		else
			echo "$currentTime - ===================================================================================================="
			echo "$currentTime - Perpanjang Paket ${telkomselNama[$numSimpati]}..."
			echo "$currentTime - ===================================================================================================="
			# ===============================================================================
			# menentukan tanggal baru untuk tanggal habis paket selanjutnya
			# ===============================================================================
			newDate=$(date -d "6 days" +%Y-%m-%d)
			# ===============================================================================
			# Memanggil funtion
			# ===============================================================================
			renewalTelkomselFx$numSimpati
			cekString=${perpanjangTelkomsel:2:6} # mengecek respon dari openvox
			cekString2=${perpanjangTelkomsel:48:4} # mengecek respon dari openvox
			echo "$currentTime - USSD REPLY${yellow}$perpanjangTelkomsel${reset}"

			if [[ "$cekString" == "Recive" ]] && [[ "$cekString2" != "maaf" ]]; then #bila respon openvox = Recive
				echo "$currentTime - ${green}${telkomselNama[$numSimpati]} Berhasil Perpanjang...${reset}"
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
				# ===============================================================================
				# mengirim sms ke admin, kalo baru saja paket diperpanjang.. tujuannya agar admin memastikan perpanjangan berjalan sesuai dengan seharusnya
				# ===============================================================================
				echo "$currentTime - ${green}Kirim SMS ke Admin, ngasih tau kalo ${telkomselNama[$numSimpati]} baru aja perpanjang paket.. ${reset}"
				# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGKETIK', '${telkomselNama[$numSimpati]} perpanjang paket berhasil.. USSD REPLY : $perpanjangTelkomsel', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
				textNotifikasiTelkomsel[$numSimpati]="${telkomselNama[$numSimpati]} perpanjang paket berhasil.. \nUSSD REPLY : $perpanjangTelkomsel"
				curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"${textNotifikasiTelkomsel[$numSimpati]}"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
				# ===============================================================================
				# jika berhasil maka tanggal exp date akan diupdate
				# ===============================================================================
				mysql -h1.1.1.200 -uroot -pc3rmat dbpulsa -e "update provider set expDatePaket = '$newDate' where namaProvider = '${telkomselNama[$numSimpati]}';"
			else
				echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Gagal Perpanjang...${reset}"
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
				attempt=1
				attempt=$((attempt + 0))
				while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
					echo "$currentTime - ${telkomselNama[$numSimpati]} percobaan ke-$attempt"
					renewalTelkomselFx$numSimpati
					cekString=${perpanjangTelkomsel:2:6}
					echo "$currentTime - USSD REPLY : ${yellow}$perpanjangTelkomsel${reset}"

					if [ "$cekString" = "Recive" ]; then
						echo "$currentTime - ${green}${telkomselNama[$numSimpati]} Berhasil Perpanjang...${reset}"
						echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
						# ===============================================================================
						# mengirim sms ke admin
						# ===============================================================================
						echo "$currentTime - ${green}Kirim SMS ke Admin, ngasih tau kalo ${telkomselNama[$numSimpati]} baru aja perpanjang paket.. ${reset}"
						# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGKETIK', '${telkomselNama[$numSimpati]} perpanjang paket berhasil setelah percobaan ke-$attempt.. USSD REPLY : $perpanjangTelkomsel', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
						textNotifikasiTelkomsel[$numSimpati]="${telkomselNama[$numSimpati]} perpanjang paket berhasil setelah percobaan ke-$attempt.. \nUSSD REPLY : $perpanjangTelkomsel"
						curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"${textNotifikasiTelkomsel[$numSimpati]}"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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

						# ===============================================================================
						# jika berhasil maka tanggal exp date akan diupdate
						# ===============================================================================
						mysql -h1.1.1.200 -uroot -pc3rmat dbpulsa -e "update provider set expDatePaket = '$newDate' where namaProvider = '${telkomselNama[$numSimpati]}';"
						cekBerhasil="berhasil"
						attempt=$((attempt + 3))
					else
						cekBerhasil="gagal"
						echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Gagal Perpanjang...${reset}"
						echo "$currentTime - ----------------------------------------------"
						attempt=$((attempt + 1))
						sleep 5s
						if [[ $attempt == $maxAttempt ]]; then
							# ===============================================================================
							# mengirim sms ke admin
							# ===============================================================================
							echo "$currentTime - ${green}Kirim SMS ke Admin, ngasih tau kalo ${telkomselNama[$numSimpati]} baru aja perpanjang paket.. ${reset}"
							# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGKETIK', '${telkomselNama[$numSimpati]} perpanjang paket gagal.. USSD REPLY : $perpanjangTelkomsel', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
							textNotifikasiTelkomsel[$numSimpati]="${telkomselNama[$numSimpati]} perpanjang paket gagal.. \nUSSD REPLY : $perpanjangTelkomsel"
							curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"${textNotifikasiTelkomsel[$numSimpati]}"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
						fi
					fi
				done
			fi
		fi
		echo "$currentTime - ${green}+++++++++++++++++++++++ RENEWAL ${telkomselNama[$numSimpati]} FINISHED+++++++++++++++++++++${reset}"
	fi

	#===============================================================================
	#memasukan nilai cek pulsa kedalam database
	#===============================================================================
	echo "INSERT INTO pulsa (namaProvider, sisaPulsa, tanggal, ussdReply) VALUES ('${telkomselNama[$numSimpati]}', '${sisaPulsaTelkomsel[$numSimpati]}', '$mysqlDateNow', '${USSDReplyTelkomsel[$numSimpati]}');"| mysql -h$HOST -u$USER -p$PASSWORD dbpulsa

	numSimpati=$((numSimpati + 1))
done

# #alert Paket Habis Simpati
# #===============================================================================
# #mengecek apakah tanggal habis paket >= hari ini
# #===============================================================================
# if [[ $NOW -ge $NEXT_UPDATE_SIMPATI ]]; then
# 	echo "$currentTime - ===================================================================================================="
# 	echo "$currentTime - Perpanjang Paket Telkomsel"
# 	echo "$currentTime - ===================================================================================================="
# 	# ===============================================================================
# 	# menentukan tanggal baru untuk tanggal habis paket selanjutnya
# 	# ===============================================================================
# 	newDate=$(date -d "6 days" +%Y%m%d)
# 	# ===============================================================================
# 	# mengirim sms ke admin, kalo baru saja paket diperpanjang.. tujuannya agar admin make sure perpanjangan berjalan sesuai dengan seharusnya
# 	# ===============================================================================
# 	echo "$currentTime - ${green}Kirim SMS ke Admin, ngasih tau kalo Telkomsel baru aja perpanjang paket.. ${reset}"
# 	echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGKETIK', 'Telkomsel perpanjang paket... coba cek..!!!', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms

# 	# ===============================================================================
# 	# restarting openvox lagi, alasannya untuk memastikan tidak ada kegagalan saat mengirimkan request ke openvox
# 	# ===============================================================================
# 	echo "$currentTime - Restarting openvox..."
# 	echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${TELKOMSEL[0]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
# 	echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${TELKOMSEL[5]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
# 	echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${TELKOMSEL[8]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
# 	sleep 3m

# 	#===============================================================================
# 	# Perpanjang Paket Via USSD
# 	#===============================================================================
# 	echo "$currentTime - Kirim USSD Perpanjang Paket Simpati"
# 	echo $(rm -rf ~/.ssh/known_hosts)
# 	renewalTelkomsel[1]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.2 -p12345 "asterisk -rx 'gsm send ussd 1 *999*4*2*1*1#'")
# 	sleep 5s
# 	renewalTelkomsel[2]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.2 -p12345 "asterisk -rx 'gsm send ussd 2 *999*4*2*1*1#'")
# 	sleep 5s
# 	renewalTelkomsel[3]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.2 -p12345 "asterisk -rx 'gsm send ussd 3 *999*4*2*1*1#'")
# 	sleep 5s
# 	renewalTelkomsel[4]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.2 -p12345 "asterisk -rx 'gsm send ussd 4 *999*4*2*1*1#'")
# 	sleep 5s
# 	renewalTelkomsel[5]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.3 -p12345 "asterisk -rx 'gsm send ussd 1 *999*4*3*1*1#'")
# 	sleep 5s
# 	renewalTelkomsel[6]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.3 -p12345 "asterisk -rx 'gsm send ussd 2 *999*4*2*1*1#'")
# 	sleep 5s
# 	renewalTelkomsel[7]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.3 -p12345 "asterisk -rx 'gsm send ussd 3 *999*4*2*1*1#'")
# 	sleep 5s
# 	renewalTelkomsel[8]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.3 -p12345 "asterisk -rx 'gsm send ussd 4 *999*4*2*1*1#'")
# 	sleep 5s
# 	renewalTelkomsel[9]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@3.3.3.4 -p12345 "asterisk -rx 'gsm send ussd 1 *999*4*2*1*1#'")

# 	numRenewal=1
# 	for i in "${renewalTelkomsel[@]}" #looping sebanyak jumlah variable array
# 	do
# 		cekString=${renewalTelkomsel[$numRenewal]:2:6} # mengecek respon dari openvox
# 		echo "$currentTime - USSD REPLY${yellow}${renewalTelkomsel[$numRenewal]}${reset}"

# 		if [ "$cekString" = "Recive" ]; then #bila respon openvox = Recive
# 			echo "$currentTime - ${green}Simpati$numRenewal Berhasil Perpanjang...${reset}"
# 			echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
# 			# ===============================================================================
# 			# jika tanggal habis paket adalah >= hari ini, maka paket diperpanjang selama panjangnya masa berlaku paket
# 			# ===============================================================================
# 			echo "$newDate">paketHabisSimpati.txt
# 		else
# 			echo "$currentTime - ${red}Simpati$numRenewal Gagal Perpanjang...${reset}"
# 			echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
# 			attempt=1
# 			attempt=$((attempt + 0))
# 			while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
# 				echo "$currentTime - ${telkomselNama[$numSimpati]} percobaan ke-$attempt"
# 				renewalTelkomsel$numRenewalFx
# 				cekString=${perpanjangTelkomsel:2:6}
# 				echo "$currentTime - USSD REPLY : ${yellow}$perpanjangTelkomsel${reset}"

# 				if [ "$cekString" = "Recive" ]; then
# 					echo "$currentTime - ${green}Simpati$numRenewal Berhasil Perpanjang...${reset}"
# 					echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
# 					cekBerhasil="berhasil"
# 					attempt=$((attempt + 3))
# 				else
# 					cekBerhasil="gagal"
# 					echo "$currentTime - ${red}Simpati$numRenewal Gagal Perpanjang...${reset}"
# 					echo "$currentTime - ----------------------------------------------"
# 					attempt=$((attempt + 1))
# 					sleep 5s
# 				fi
# 			done
# 		fi
# 		numRenewal=$((numRenewal + 1))
# 	done
# fi

# ==================================================================================================
# XL
# ==================================================================================================
for i in "${XLNo[@]}" #looping sebanyak jumlah variable array
do
	#===============================================================================
	#melakukan cek pulsa untuk masing-masing nomor pada slot openvox
	#metodenya adalah SSH pada openvox dan menjalankan USSD pada asterisk di openvox
	#===============================================================================
	echo "$currentTime - ===================================================================================================="
	echo "$currentTime - Checking Pulsa ${XLNama[$numXl]}..."
	echo "$currentTime - ===================================================================================================="
	cekString=${XL[$numXl]:2:6} # mengecek respon dari openvox
	echo "$currentTime - USSD REPLY : ${yellow}${XL[$numXl]}${reset}"

	if [ "$cekString" = "Recive" ]; then #bila respon open = Recive
		echo "$currentTime - ${green}${XLNama[$numXl]} Cek Berhasil...${reset}"
		echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
		USSDReplyXL[$numXl]="${XL[$numXl]}"
		XL[$numXl]=${XL[$numXl]:55:6} #mengambil character yang bernilai jumlah pulsa
		XL[$numXl]=${XL[$numXl]//[ . sd\/ ]/} #mengabaikan character lain selain angka
		XL[$numXl]=$((XL[$numXl] + 0)) #merubah variable yang semula string menjadi integer
		echo "$currentTime - ${green}Sisa Pulsa : ${XL[$numXl]}${reset}"

		#===============================================================================
		#memasukan nilai cek pulsa (pulsa) kedalam database
		#===============================================================================
		sisaPulsaXL[$numXl]=${XL[$numXl]}

		if [[ ${XL[$numXl]} -lt ${XLHargaPaket[$numXl]} ]]; then #mengecek jika pulsa kurang dari harga paket masing-masing provider
			echo "$currentTime - Kirim SMS ke PIKArin, minta isi pulsa XL - ${XLNo[$numXl]}"
			#insert ke database sms untuk mengirim pulsa ke tukang pulsa
			# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : XL $i, sisa pulsa: (${XL[$numXl]}), harga paket: ${XLHargaPaket[$numXl]}, Exp Date Paket: ${XLExpDatePaket[$numXl]}', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
			# textMintaPulsaXL[$numXl]="XL No : $i, Sisa Pulsa: ${XL[$numXl]}, Harga Paket: ${XLHargaPaket[$numXl]}, Exp Date Paket: ${XLExpDatePaket[$numXl]}"
			slackText="XL No : $i,\nSisa Pulsa: ${XL[$numXl]},\nHarga Paket: ${XLHargaPaket[$numXl]},\nExp Date Paket: ${XLExpDatePaket[$numXl]}"
			curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
		fi
	else
		attempt=1
		attempt=$((attempt + 0))
		cekBerhasil=""
		echo "$currentTime - ${red}${XLNama[$numXl]} Cek Gagal...${reset}"
		echo "$currentTime - ----------------------------------------------"
		while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
			echo "$currentTime - ${XLNama[$numXl]} percobaan ke-$attempt"
			xlFx$numXl
			cekString=${xl:2:6}
			echo "$currentTime - USSD REPLY : ${yellow}$xl${reset}"
			USSDReplyXL[$numXl]="$xl"

			if [[ "$cekString" = "Recive" ]]; then
				echo "$currentTime - ${green}${XLNama[$numXl]} Cek Berhasil...${reset}"
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
				cekBerhasil="berhasil"
				attempt=$((attempt + 3))
				xl=${xl:55:6}
				xl=${xl//[ . sd\/ ]/}
				xl=$((xl + 0))
				echo "$currentTime - ${green}Sisa Pulsa : $xl${reset}"
				
				#===============================================================================
				#memasukan nilai cek pulsa (pulsa) kedalam database
				#===============================================================================
				sisaPulsaXL[$numXl]=$xl

				if [[ $xl -lt ${XLHargaPaket[$numXl]} ]]; then
					echo "$currentTime - Kirim SMS ke PIKArin, minta isi pulsa XL - ${XLNo[$numXl]}"
					#insert ke database sms untuk mengirim pulsa ke tukang pulsa
					# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : XL $i, sisa pulsa: ($xl), harga paket: ${XLHargaPaket[$numXl]}, Exp Date Paket: ${XLExpDatePaket[$numXl]}', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
					slackText="XL No : $i,\nSisa Pulsa: $xl,\nHarga Paket: ${XLHargaPaket[$numXl]},\nExp Date Paket: ${XLExpDatePaket[$numXl]}"
					curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
				fi
			else
				cekBerhasil="gagal"
				echo "$currentTime - ${red}${XLNama[$numXl]} Cek Gagal...${reset}"
				echo "$currentTime - ----------------------------------------------"
				
				attempt=$((attempt + 1))
				if [[ $attempt == $maxAttempt ]]; then
					#===============================================================================
					#jika cek gagal,, tetap diinsert dengan nilai "-"
					#===============================================================================
					sisaPulsaXL[$numXl]=0
				fi
			fi
		done
	fi
	echo "$currentTime - ${yellow}+++++++++++++++++++++++ CHECKING ${XLNama[$numXl]} FINISHED+++++++++++++++++++++${reset}"

	#===============================================================================
	#memasukan nilai cek pulsa dan paket kedalam database
	#===============================================================================
	echo "INSERT INTO pulsa (namaProvider, sisaPulsa, tanggal,ussdReply) VALUES ('${XLNama[$numXl]}', '${sisaPulsaXL[$numXl]}', '$mysqlDateNow', '${USSDReplyXL[$numXl]}');"| mysql -h$HOST -u$USER -p$PASSWORD dbpulsa

	numXl=$((numXl + 1))
done

# # ==================================================================================================
# # INDOSAT
# # ==================================================================================================
# for i in "${indosat[@]}" #looping sebanyak jumlah variable array
# do
# 	textMintaPulsa[$numIndosat]="Mentari 100.000 : ${INDOSAT[$((numIndosat-1))]}"
# 	#===============================================================================
# 	#melakukan cek pulsa untuk masing-masing nomor pada slot openvox
# 	#metodenya adalah SSH pada openvox dan menjalankan USSD pada asterisk di openvox
# 	#===============================================================================
# 	echo "$currentTime - ===================================================================================================="
# 	echo "$currentTime - Checking Pulsa INDOSAT$numIndosat..."
# 	echo "$currentTime - ===================================================================================================="
# 	cekString=${indosat[$numIndosat]:2:6} # mengecek respon dari openvox
# 	cekString2=${indosat[$numIndosat]:49:10} # mengecek respon dari openvox
# 	echo "$currentTime - USSD REPLY : ${yellow}${indosat[$numIndosat]}${reset}"

# 	if [ "$cekString" = "Recive"  ] && [ "$cekString2" = "PulsaUTAMA"  ]; then #bila respon open = Recive
# 		echo "$currentTime - ${green}INDOSAT$numIndosat Cek Berhasil...${reset}"
# 		echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
# 		indosat[$numIndosat]=${indosat[$numIndosat]:63:6} #mengambil character yang bernilai jumlah pulsa
# 		indosat[$numIndosat]=${indosat[$numIndosat]//[. Aktif]/} #mengabaikan character lain selain angka
# 		indosat[$numIndosat]=$((indosat[$numIndosat] + 0)) #merubah variable yang semula string menjadi integer
# 		echo "$currentTime - ${green}Sisa Pulsa INDOSAT$numIndosat : ${indosat[$numIndosat]}${reset}"

# 		# jsonIndosat$numIndosat="{namaProvider:\"Indosat$numIndosat\", sisaPulsa:\"${indosat[$numIndosat]}\", tanggal: \"$mysqlDateNow\"}"
# 		echo "INSERT INTO pulsa (namaProvider, sisaPulsa, tanggal) VALUES ('Indosat$numIndosat', '${indosat[$numIndosat]}', '$mysqlDateNow');"| mysql -h$HOST -u$USER -p$PASSWORD dbpulsa

# 		if [[ ${indosat[$numIndosat]} -lt $HARGA_PAKET_INDOSAT ]]; then #mengecek jika pulsa kurang dari harga paket masing-masing provider
# 			echo "$currentTime - Kirim SMS ke PIKArin, minta isi pulsa INDOSAT - ${INDOSAT[$((numIndosat-1))]}"
# 			#insert ke database sms untuk mengirim pulsa ke tukang pulsa
# 			echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : ${textMintaPulsa[$numIndosat]}, sisa pulsa: (${indosat[$numIndosat]})', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
# 		fi
# 	else
# 		attempt=1
# 		attempt=$((attempt + 0))
# 		cekBerhasil=""
# 		echo "$currentTime - ${red}INDOSAT$numIndosat Cek Gagal...${reset}"
# 		while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
# 			echo "$currentTime - INDOSAT$numIndosat percobaan ke-$attempt"
# 			indosatFx$numIndosat
# 			cekString=${indosat:2:6}
# 			cekString2=${indosat:49:10}
# 			echo "$currentTime - USSD REPLY : ${yellow}$indosat${reset}"

# 			if [ "$cekString" = "Recive"  ] && [ "$cekString2" = "PulsaUTAMA"  ]; then
# 				echo "$currentTime - ${green}INDOSAT$numIndosat Cek Berhasil...${reset}"
# 				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
# 				cekBerhasil="berhasil"
# 				attempt=$((attempt + 3))
# 				indosat=${indosat:63:6}
# 				indosat=${indosat//[. Aktif]/}
# 				indosat=$((indosat + 0))
# 				echo "$currentTime - ${green}Sisa Pulsa INDOSAT$numIndosat : $indosat${reset}"

# 				# jsonIndosat$numIndosat="{namaProvider:\"Indosat$numIndosat\", sisaPulsa:\"$indosat\", tanggal: \"$mysqlDateNow\"}"
# 				echo "INSERT INTO pulsa (namaProvider, sisaPulsa, tanggal) VALUES ('Indosat$numIndosat', '$indosat', '$mysqlDateNow');"| mysql -h$HOST -u$USER -p$PASSWORD dbpulsa

# 				if [[ ${indosat} -lt $HARGA_PAKET_SIMPATI ]]; then
# 					echo "$currentTime - Kirim SMS ke PIKArin, minta isi pulsa INDOSAT - ${INDOSAT[$((numIndosat-1))]}"
# 					#insert ke database sms untuk mengirim pulsa ke tukang pulsa
# 					echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : ${textMintaPulsa[$numIndosat]}, sisa pulsa: $indosat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
# 				fi
# 			else
# 				cekBerhasil="gagal"
# 				echo "$currentTime - ${red}INDOSAT$numIndosat Cek Gagal...${reset}"
# 				echo "$currentTime - ----------------------------------------------"
# 				attempt=$((attempt + 1))
# 				if [[ $attempt == $maxAttempt ]]; then
# 					# jsonIndosat$numIndosat="{namaProvider:\"Indosat$numIndosat\", sisaPulsa:"-", tanggal: \"$mysqlDateNow\"}"
# 					echo "INSERT INTO pulsa (namaProvider, sisaPulsa, tanggal) VALUES ('Indosat$numIndosat', '-', '$mysqlDateNow');"| mysql -h$HOST -u$USER -p$PASSWORD dbpulsa
# 				fi
# 			fi
# 		done
# 	fi
# 	echo "$currentTime - ${yellow}+++++++++++++++++++++++ CHECKING INDOSAT$numIndosat FINISHED+++++++++++++++++++++${reset}"
# 	numIndosat=$((numIndosat + 1))
# done

# ==================================================================================================
# THREE
# ==================================================================================================
for i in "${threeNo[@]}" #looping sebanyak jumlah variable array
do
	#===============================================================================
	#melakukan cek pulsa untuk masing-masing nomor pada slot openvox
	#metodenya adalah SSH pada openvox dan menjalankan USSD pada asterisk di openvox
	#===============================================================================
	echo "$currentTime - ===================================================================================================="
	echo "$currentTime - Checking Pulsa ${threeNama[$numThree]}..."
	echo "$currentTime - ===================================================================================================="
	cekString=${three[$numThree]:2:6} # mengecek respon dari openvox
	cekString2=${three[$numThree]:74:3}
	echo "$currentTime - USSD REPLY : ${yellow}${three[$numThree]}${reset}"

	if [ "$cekString" = "Recive" ] && [ "$cekString2" = "Pul" ]; then #bila respon open = Recive
		echo "$currentTime - ${green}${threeNama[$numThree]} Cek Berhasil...${reset}"
		echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
		USSDReplyThree[$numThree]="${three[$numThree]}"
		three[$numThree]=${three[$numThree]:82:6} #mengambil character yang bernilai jumlah pulsa
		three[$numThree]=${three[$numThree]//[,Bonus]/} #mengabaikan character lain selain angka
		three[$numThree]=$((three[$numThree] + 0)) #merubah variable yang semula string menjadi integer
		echo "$currentTime - ${green}Sisa Pulsa ${threeNama[$numThree]} : ${three[$numThree]}${reset}"

		sisaPulsaThree[$numThree]=${three[$numThree]}

		if [[ ${three[$numThree]} -lt ${threeHargaPaket[$numThree]} ]]; then #mengecek jika pulsa kurang dari harga paket masing-masing provider
			echo "$currentTime - Kirim SMS ke PIKArin, minta isi pulsa THREE - $i"
			#insert ke database sms untuk mengirim pulsa ke tukang pulsa
			# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : Three $i, sisa pulsa: (${three[$numThree]}), harga paket: ${threeHargaPaket[$numThree]}, Exp Date Paket: Hari ini Jam 23:59', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
			slackText="Three No : $i,\nSisa Pulsa: ${three[$numThree]},\nHarga Paket: ${threeHargaPaket[$numThree]},\nExp Date Paket: Hari ini Jam 23:59"
			curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
		fi
	else
		attempt=1
		attempt=$((attempt + 0))
		cekBerhasil=""
		echo "$currentTime - ${red}${threeNama[$numThree]} Cek Gagal...${reset}"
		while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
			echo "$currentTime - ${threeNama[$numThree]} percobaan ke-$attempt"
			threeFx$numThree
			cekString=${three:2:6}
			cekString2=${three:74:3}
			echo "$currentTime - USSD REPLY : ${yellow}$three${reset}"
			USSDReplyThree[$numThree]="$three"

			if [ "$cekString" = "Recive"  ] && [ "$cekString2" = "Pul"  ]; then
				echo "$currentTime - ${green}${threeNama[$numThree]} Cek Berhasil...${reset}"
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
				cekBerhasil="berhasil"
				attempt=$((attempt + 3))
				three=${three:82:6}
				three=${three//[,Bonus]/}
				three=$((three + 0))
				echo "$currentTime - ${green}Sisa Pulsa ${threeNama[$numThree]} : $three${reset}"

				sisaPulsaThree[$numThree]=$three

				if [[ $three -lt ${threeHargaPaket[$numThree]} ]]; then
					echo "$currentTime - Kirim SMS ke PIKArin, minta isi pulsa THREE - $i"
					#insert ke database sms untuk mengirim pulsa ke tukang pulsa
					# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGPULSA', 'Pikaa ~~ Minta pulsa : Three $i, sisa pulsa: ($three), harga paket: ${threeHargaPaket[$numThree]}, Exp Date Paket: Hari ini Jam 23:59', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
					slackText="Three No : $i,\nSisa Pulsa: $three,\nHarga Paket: ${threeHargaPaket[$numThree]},\nExp Date Paket: Hari ini Jam 23:59"
					curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
				fi
			else
				cekBerhasil="gagal"
				echo "$currentTime - ${red}${threeNama[$numThree]} Cek Gagal...${reset}"
				echo "$currentTime - ----------------------------------------------"
				attempt=$((attempt + 1))
				if [[ $attempt == $maxAttempt ]]; then
					sisaPulsaThree[$numThree]=0
				fi
			fi
		done
	fi
	echo "$currentTime - ${yellow}+++++++++++++++++++++++ CHECKING ${threeNama[$numThree]} FINISHED+++++++++++++++++++++${reset}"

	#===============================================================================
	#memasukan nilai cek pulsa dan paket kedalam database
	#===============================================================================
	echo "INSERT INTO pulsa (namaProvider, sisaPulsa, tanggal, ussdReply) VALUES ('${threeNama[$numThree]}', '${sisaPulsaThree[$numThree]}', '$mysqlDateNow', '${USSDReplyThree[$numThree]}');"| mysql -h$HOST -u$USER -p$PASSWORD dbpulsa

	numThree=$((numThree + 1))
done