#! /bin/bash
# clear

#===============================================================================
#Inisialisasi parameter untuk post to slack
#===============================================================================
CHANNEL="#cermati_pulsa"
USERNAME="Pika Pulsa"
ICONEMOJI=":pika-shy:"
ICONEMOJI2=":pikapika:"

#===============================================================================
#Konfigurasi Database
#===============================================================================
HOST="1.1.1.200"
USER="root"
PASSWORD="c3rmat"

#===============================================================================
#mencari tanggal hari ini dalam format yyyymmdd
#===============================================================================
NOW=$(date +%Y%m%d)
currentTime=$(date +"[ %Y-%m-%d %H:%M:%S ]")
mysqlDateNow=$(date +"%Y-%m-%d %H:%M:%S")	

#===============================================================================
#mengambil semua element dalam database, query dari database
#===============================================================================
#===============================================================================
#ISAT
#===============================================================================
result=($(mysql db_agen_pulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, caraCekKuota, caraCekPulsa from provider where namaProvider like 'indosatAll%' order by length(namaProvider), namaProvider;"))
cntElm=6
cnt=${#result[@]}
sets=$(((cnt+1)/cntElm))

for (( i=1 ; i<=sets ; i++ ))
do
	x=$((cntElm * (i-1)))
	ISATNama[$i]=${result[$((x + 0 ))]};
	ISATNo[$i]=${result[$((x + 1))]};
	ISATHost[$i]=${result[$((x + 2))]};
	ISATSpan[$i]=${result[$((x + 3))]};
	ISATKodecekKuota[$i]=${result[$((x + 4))]};
	ISATKodecekPulsa[$i]=${result[$((x + 5))]};

	# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('081901250006', 'T10.${ISATNo[$i]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
	
	echo $(rm -rf ~/.ssh/known_hosts)
	cekPaket=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${ISATHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${ISATSpan[$i]} ${ISATKodecekKuota[$i]}'")
	echo "$currentTime - $cekPaket"
done