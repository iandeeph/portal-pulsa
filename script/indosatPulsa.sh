#! /bin/bash
# clear

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

#===============================================================================
#mengambil semua element dalam database, query dari database
#===============================================================================
#===============================================================================
#ISAT
#===============================================================================
ISATResult=($(mysql db_agen_pulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, caraCekKuota, caraCekPulsa from provider where namaProvider like 'indosatAll%' order by length(namaProvider), namaProvider;"))
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
	ISATKodecekKuota[$i]=${ISATResult[$((x + 4))]};
	ISATKodecekPulsa[$i]=${ISATResult[$((x + 5))]};

	# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('081901250006', 'T10.${ISATNo[$i]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
	
	echo $(rm -rf ~/.ssh/known_hosts)
	cekPaket=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${ISATHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${ISATSpan[$i]} ${ISATKodecekKuota[$i]}'")
	echo "$currentTime - $cekPaket"

	cekString=${cekPaket:49:7} # mengecek respon dari openvox
	cekString2=${cekPaket:50:7} # mengecek respon dari openvox

	if [[ "$cekString" = "Content" ]] || [[ "$cekString2" = "Content" ]]; then #bila respon open = Recive
		echo "$currentTime - (${ISATNama[$i]} - ${ISATNo[$i]} ) - Cek Paket Berhasil..."
		echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
	else
		attempt=1
		attempt=$((attempt + 0))
		cekBerhasil=""
		echo "$currentTime - Cek Paket Gagal... ${ISATNama[$i]} - ${ISATNo[$i]}.. Lokasi : ${ISATHost[$i]} - ${ISATSpan[$i]}\n$cekPaket"
		while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
			echo "$currentTime - ${ISATNama[$i]} - ${ISATNo[$i]}.. Lokasi : ${ISATHost[$i]} - ${ISATSpan[$i]} percobaan ke-$attempt"

			echo $(rm -rf ~/.ssh/known_hosts)
			cekPaket=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${ISATHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${ISATSpan[$i]} ${ISATKodecekKuota[$i]}'")
			echo "$currentTime - $cekPaket"

			cekString=${cekPaket:49:7} # mengecek respon dari openvox
			cekString2=${cekPaket:50:7} # mengecek respon dari openvox

			if [[ "$cekString" = "Content" ]] || [[ "$cekString2" = "Content" ]]; then #bila respon open = Recive
				echo "$currentTime - (${ISATNama[$i]} - ${ISATNo[$i]} ) - Cek Paket Berhasil..."
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
			else
				cekBerhasil="gagal"
				echo "$currentTime - ${ISATNama[$i]} - ${ISATNo[$i]}.. Lokasi : ${ISATHost[$i]} - ${ISATSpan[$i]} Cek Gagal..."
				echo "----------------------------------------------"
				attempt=$((attempt + 1))
				if [[ $attempt == $maxAttempt ]]; then
					sisaPaketTelkomsel[$numSimpati]=0
					# slackText="Cek Paket Gagal... ${ISATNama[$i]} - ${ISATNo[$i]}.. Lokasi : ${ISATHost[$i]} - ${ISATSpan[$i]}\n$cekPaket"
					# curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
				fi
			fi
		done
	fi
done