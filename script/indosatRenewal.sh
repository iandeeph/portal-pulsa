#! /bin/bash
clear

#===============================================================================
#Inisialisasi parameter untuk post to slack
#===============================================================================
CHANNEL="#cermati_pulsa"
USERNAME="Indosat Officer"
ICONEMOJI=":fire:"

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
# mysqlDateNow=$(date +"%Y-%m-%d 11:00:%S")

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
#mengambil semua element dalam database, query dari database
#===============================================================================
#===============================================================================
#ISAT
#===============================================================================
ISATResult=($(mysql db_agen_pulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, caraAktivasi, idProvider from provider where statusPaket = '0' AND statusPulsa = '1' order by length(namaProvider), namaProvider;"))
cntISATElm=6
cntISAT=${#ISATResult[@]}
ISATSet=$(((cntISAT+1)/cntISATElm))

maxAttempt=5
maxAttempt=$((maxAttempt+0))

for (( i=1 ; i<=ISATSet ; i++ ))
do
	x=$((cntISATElm * (i-1)))
	ISATNama[$i]=${ISATResult[$((x + 0 ))]};
	ISATNo[$i]=${ISATResult[$((x + 1))]};
	ISATHost[$i]=${ISATResult[$((x + 2))]};
	ISATSpan[$i]=${ISATResult[$((x + 3))]};
	ISATKodeAktivasi[$i]=${ISATResult[$((x + 4))]};
	idProvider[$i]=${ISATResult[$((x + 5))]};
done

# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('081901250006', 'T10.${ISATNo[$i]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
	
isatnum=1
for j in "${ISATNama[@]}"; do
	echo $(rm -rf ~/.ssh/known_hosts)
	renewal=$(sshpass -pc3rmat ssh -o StrictHostKeyChecking=no admin@${ISATHost[$isatnum]} -p12345 "asterisk -rx 'gsm send ussd ${ISATSpan[$isatnum]} ${ISATKodeAktivasi[$isatnum]}'")
	echo "$currentTime - $renewal"

	cekString=${renewal:2:6} # mengecek respon dari openvox
	cekString2=${renewal:49:9} # mengecek respon dari openvox

	if [[ "$cekString" = "Recive" ]] && [[ "$cekString2" = "Transaksi" ]]; then #bila respon open = Recive
		echo "$currentTime - ${green}${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} Renewal Berhasil...${reset}"
		echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
		sleep 20s
		# KIRIM SMS OK JIKA DAPAT BALASAN SUKSES
		echo "$(sshpass -pc3rmat ssh -o StrictHostKeyChecking=no admin@${ISATHost[$isatnum]} -p12345 "asterisk -rx 'gsm send sms ${ISATSpan[$isatnum]} 123 OK'")"
		echo "UPDATE provider SET statusPaket='1' WHERE idProvider='$idProvider';"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
	else
		attempt=1
		attempt=$((attempt + 0))
		cekBerhasil=""
		echo "$currentTime - Renewal Paket Gagal... $realNum - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]}"
		echo "$cekPulsa"
		while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
			echo "$currentTime - $realNum - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} percobaan ke-$attempt"

			echo $(rm -rf ~/.ssh/known_hosts)
			renewal=$(sshpass -pc3rmat ssh -o StrictHostKeyChecking=no admin@${ISATHost[$isatnum]} -p12345 "asterisk -rx 'gsm send ussd ${ISATSpan[$isatnum]} ${ISATKodeAktivasi[$isatnum]}'")
			echo "$currentTime - $renewal"

			cekString=${renewal:2:6} # mengecek respon dari openvox
			cekString2=${renewal:49:9} # mengecek respon dari openvox

			if [[ "$cekString" = "Recive" ]] && [[ "$cekString2" = "Transaksi" ]]; then #bila respon open = Recive
				echo "$currentTime - ${green}${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} Renewal Berhasil...${reset}"
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
				sleep 20s
				# KIRIM SMS OK JIKA DAPAT BALASAN SUKSES
				echo "$(sshpass -pc3rmat ssh -o StrictHostKeyChecking=no admin@${ISATHost[$isatnum]} -p12345 "asterisk -rx 'gsm send sms ${ISATSpan[$isatnum]} 123 OK'")"
				cekBerhasil="berhasil"
				echo "UPDATE provider SET statusPaket='1' WHERE idProvider='$idProvider';"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
			else
				cekBerhasil="gagal"
				echo "$currentTime - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} Renewal Gagal..."
				echo "----------------------------------------------"
				if [[ $attempt == $maxAttempt ]]; then
					slackText="Indosat ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} Renewal Gagal...\n$USSDReplyISAT"
					curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
				fi
				attempt=$((attempt + 1))
			fi
		done
	fi
	isatnum=$((isatnum+1))
done