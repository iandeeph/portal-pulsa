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
#inisialisasi nomor tukang pulsa dan tukang ketik
#===============================================================================
TUKANGPULSA=08562699002
TUKANGKETIK=081514344606

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

# FUNCTION UNTUK ISI PULSA, KIRIM SMS KE MODEM GSM AGENPULSA
isiPulsa (){
	currPulsa="$1"
	packPrice="$2"
	nomorTelp="$3"
	if [[ $currPulsa -lt $packPrice ]]; then
		pulsa100=0
		pulsa50=0
		outstanding=$((packPrice - currPulsa))
		echo $outstanding
		if [[ $outstanding -gt 100000 ]]; then
			pulsa100=$(($outstanding/100000))
			outstanding=$(($outstanding-($pulsa100*100000)))
			if [[ $outstanding -ge 50000 ]]; then
				pulsa100=$(($pulsa100+1))
			else
				pulsa50=1
			fi
		elif [[ $outstanding -lt 100000 ]] && [[ $outstanding -gt 50000 ]]; then
			pulsa100=1
		else
			pulsa50=1
		fi

		for (( z = 1; z <= pulsa100; z++ )); do
			if [[ $z -gt 1 ]]; then
				echo "$z.100.nomor telp"
				echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('$TUKANGPULSA', '$z.100.$nomorTelp.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
			else
				echo "100.nomor telp"
				echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('$TUKANGPULSA', '100.$nomorTelp.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
			fi
		done

		if [[ $pulsa50 -ge 1 ]]; then
			echo "50.nomor telp"
			echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('$TUKANGPULSA', '50.$nomorTelp.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
		fi
	fi

}

#===============================================================================
#mengambil semua element dalam database, query dari database
#===============================================================================
#===============================================================================
#ISAT
#===============================================================================
ISATResult=($(mysql db_agen_pulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, hargaPaket, caraCekPulsa, statusPulsa, idProvider from provider where statusPaket = '0' AND namaProvider not like '%XL%' order by length(namaProvider), namaProvider;"))
cntISATElm=8
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
	ISATHargaPaket[$i]=${ISATResult[$((x + 4))]};
	ISATKodecekPulsa[$i]=${ISATResult[$((x + 5))]};
	ISATStatusPulsa[$i]=${ISATResult[$((x + 6))]};
	idProvider[$i]=${ISATResult[$((x + 7))]};
done

# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('081901250006', 'T10.${ISATNo[$i]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
	
isatnum=1
for j in "${ISATNama[@]}"; do
	echo $(rm -rf ~/.ssh/known_hosts)
	echo $isatnum
	echo "sshpass -pc3rmat ssh -o StrictHostKeyChecking=no admin@${ISATHost[$isatnum]} -p12345 \"asterisk -rx 'gsm send ussd ${ISATSpan[$isatnum]} ${ISATKodecekPulsa[$isatnum]}'\""
	cekPulsa=$(sshpass -pc3rmat ssh -o StrictHostKeyChecking=no admin@${ISATHost[$isatnum]} -p12345 "asterisk -rx 'gsm send ussd ${ISATSpan[$isatnum]} ${ISATKodecekPulsa[$isatnum]}'")
	realNum=${cekPulsa:58:12}
	echo "$currentTime - $cekPulsa"

	cekString=${cekPulsa:2:6} # mengecek respon dari openvox
	cekString2=${cekPulsa:70:5} # mengecek respon dari openvox
	cekString3=${cekPulsa:71:5} # mengecek respon dari openvox

	if [[ "$cekString" = "Recive" ]]; then #bila respon open = Recive
		if [[ "$cekString2" = "Pulsa" ]] || [[ "$cekString3" = "Pulsa" ]]; then
			echo "$currentTime - ${green}$realNum Cek Berhasil...${reset}"
			echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
			USSDReplyISAT=$cekPulsa
			cekPulsa=${cekPulsa:80:7} #mengambil character yang bernilai jumlah pulsa
			cekPulsa=${cekPulsa%.*} #menghilangkan koma
			cekPulsa=${cekPulsa//[,aktif]/} #mengabaikan character lain selain angka
			cekPulsa=$((cekPulsa + 0)) #merubah variable yang semula string menjadi integer
			echo "$currentTime - ${green}Sisa pulsa $realNum : ${cekPulsa}${reset}"

			if [[ $cekPulsa -lt ${ISATHargaPaket[$isatnum]} ]]; then #mengecek jika pulsa kurang dari harga paket masing-masing provider
				echo "$currentTime - Kirim Slack ke AgenPulsa, minta isi pulsa cekPulsa - ${telkomselNo[$isatnum]}"
				# slackText="Indosat No : $realNum,\nLokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]}\nSisa Pulsa: $cekPulsa,\nHarga Paket: ${ISATHargaPaket[$isatnum]}"
				# curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
				isiPulsa "$cekPulsa" "${ISATHargaPaket[$isatnum]}" "$realNum"
				echo "UPDATE provider SET statusPulsa='1' WHERE idProvider='$idProvider';"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
			fi
			echo "UPDATE provider SET noProvider='$realNum', lastPulsa='$cekPulsa' WHERE idProvider='$idProvider';"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
			# echo "INSERT INTO pulsa (namaProvider, nomor, sisaPulsa, tanggal, ussdReply) VALUES ('${ISATNama[$isatnum]}', '$realNum', '$cekPulsa', '$mysqlDateNow', '$USSDReplyISAT');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
		else
			attempt=1
			attempt=$((attempt + 0))
			cekBerhasil=""
			echo "$currentTime - Cek Pulsa Gagal... $realNum - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]}"
			echo "$cekPulsa"
			while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
				echo "$currentTime - $realNum - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} percobaan ke-$attempt"

				echo $(rm -rf ~/.ssh/known_hosts)
				cekPulsa=$(sshpass -pc3rmat ssh -o StrictHostKeyChecking=no admin@${ISATHost[$isatnum]} -p12345 "asterisk -rx 'gsm send ussd ${ISATSpan[$isatnum]} ${ISATKodecekPulsa[$isatnum]}'")
				realNum=${cekPulsa:58:12}
				echo "$currentTime - $cekPulsa"

				cekString2=${cekPulsa:70:5} # mengecek respon dari openvox
				cekString3=${cekPulsa:71:5} # mengecek respon dari openvox

				USSDReplyISAT=$cekPulsa
				if [[ "$cekString2" = "Pulsa" ]] || [[ "$cekString3" = "Pulsa" ]]; then
					echo "$currentTime - ${green}$realNum Cek Berhasil...${reset}"
					echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
					cekBerhasil="berhasil"
					cekPulsa=${cekPulsa:80:7} #mengambil character yang bernilai jumlah pulsa
					cekPulsa=${cekPulsa%.*} #menghilangkan koma
					cekPulsa=${cekPulsa//[,aktif]/} #mengabaikan character lain selain angka
					cekPulsa=$((cekPulsa + 0)) #merubah variable yang semula string menjadi integer
					echo "$currentTime - ${green}Sisa pulsa $realNum : ${cekPulsa}${reset}"

					if [[ ${cekPulsa} -lt ${ISATHargaPaket[$isatnum]} ]]; then #mengecek jika pulsa kurang dari harga paket masing-masing provider
						echo "$currentTime - Kirim Slack ke AgenPulsa, minta isi pulsa cekPulsa - ${telkomselNo[$isatnum]}"
						# slackText="Indosat No : $realNum,\nLokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]},\nSisa Pulsa: $cekPulsa,\nHarga Paket: ${ISATHargaPaket[$isatnum]}"
						# curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
						isiPulsa "$cekPulsa" "${ISATHargaPaket[$isatnum]}" "$realNum"
						echo "UPDATE provider SET statusPulsa='1' WHERE idProvider='$idProvider';"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
					fi
					echo "UPDATE provider SET noProvider='$realNum', lastPulsa='$cekPulsa' WHERE idProvider='$idProvider';"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
					# echo "INSERT INTO pulsa (namaProvider, nomor, sisaPulsa, tanggal, ussdReply) VALUES ('${ISATNama[$isatnum]}', '$realNum', '$cekPulsa', '$mysqlDateNow', '$USSDReplyISAT');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
				else
					cekBerhasil="gagal"
					echo "$currentTime - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} Cek Gagal..."
					echo "----------------------------------------------"
					if [[ $attempt == $maxAttempt ]]; then
						slackText="Indosat ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} Cek Gagal Pulsa...\n$USSDReplyISAT"
						curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
						# echo "INSERT INTO pulsa (namaProvider, nomor, sisaPulsa, tanggal, ussdReply) VALUES ('${ISATNama[$isatnum]}', '-', '-', '$mysqlDateNow', '$USSDReplyISAT');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
					fi
					attempt=$((attempt + 1))
				fi
			done
		fi
	else
		attempt=1
		attempt=$((attempt + 0))
		cekBerhasil=""
		echo "$currentTime - Cek Pulsa Gagal... $realNum - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]}"
		echo "$cekPulsa"
		while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
			echo "$currentTime - $realNum - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} percobaan ke-$attempt"

			echo $(rm -rf ~/.ssh/known_hosts)
			cekPulsa=$(sshpass -pc3rmat ssh -o StrictHostKeyChecking=no admin@${ISATHost[$isatnum]} -p12345 "asterisk -rx 'gsm send ussd ${ISATSpan[$isatnum]} ${ISATKodecekPulsa[$isatnum]}'")
			realNum=${cekPulsa:58:12}
			echo "$currentTime - $cekPulsa"

			cekString2=${cekPulsa:70:5} # mengecek respon dari openvox
			cekString3=${cekPulsa:71:5} # mengecek respon dari openvox

			USSDReplyISAT=$cekPulsa
			if [[ "$cekString2" = "Pulsa" ]] || [[ "$cekString3" = "Pulsa" ]]; then
				echo "$currentTime - ${green}$realNum Cek Berhasil...${reset}"
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
				cekBerhasil="berhasil"
				cekPulsa=${cekPulsa:80:7} #mengambil character yang bernilai jumlah pulsa
				cekPulsa=${cekPulsa%.*} #menghilangkan koma
				cekPulsa=${cekPulsa//[,aktif]/} #mengabaikan character lain selain angka
				cekPulsa=$((cekPulsa + 0)) #merubah variable yang semula string menjadi integer
				echo "$currentTime - ${green}Sisa pulsa $realNum : ${cekPulsa}${reset}"

				if [[ $cekPulsa -lt ${ISATHargaPaket[$isatnum]} ]]; then #mengecek jika pulsa kurang dari harga paket masing-masing provider
					echo "$currentTime - Kirim Slack ke AgenPulsa, minta isi pulsa cekPulsa - ${telkomselNo[$isatnum]}"
					# slackText="Indosat No : $realNum,\nSisa Pulsa: $cekPulsa,\nHarga Paket: ${ISATHargaPaket[$isatnum]}"
					# curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
					isiPulsa "$cekPulsa" "${ISATHargaPaket[$isatnum]}" "$realNum"
					echo "UPDATE provider SET statusPulsa='1' WHERE idProvider='$idProvider';"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
				fi
				echo "UPDATE provider SET noProvider='$realNum', sisaPulsa='$cekPulsa' WHERE idProvider='$idProvider';"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
				# echo "INSERT INTO pulsa (namaProvider, nomor, sisaPulsa, tanggal, ussdReply) VALUES ('${ISATNama[$isatnum]}', '$realNum', '$cekPulsa', '$mysqlDateNow', '$USSDReplyISAT');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
			else
				cekBerhasil="gagal"
				echo "$currentTime - $realNum - ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} Cek Gagal..."
				echo "----------------------------------------------"
				if [[ $attempt == $maxAttempt ]]; then
					slackText="Indosat ${ISATNo[$isatnum]}.. Lokasi : ${ISATHost[$isatnum]} - ${ISATSpan[$isatnum]} Cek Pulsa Gagal...\n$USSDReplyISAT"
					curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$slackText"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI"'"}' https://hooks.slack.com/services/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
					# echo "INSERT INTO pulsa (namaProvider, nomor, sisaPulsa, tanggal, ussdReply) VALUES ('${ISATNama[$isatnum]}', '-', '-', '$mysqlDateNow', '$USSDReplyISAT');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
				fi
				attempt=$((attempt + 1))
			fi
		done
	fi
	isatnum=$((isatnum+1))
done