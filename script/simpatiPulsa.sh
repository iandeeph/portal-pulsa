
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

#===============================================================================
#Inisialisasi parameter untuk post to slack
#===============================================================================
CHANNEL="#cermati_pulsa"
USERNAME="Pika Pulsa"
ICONEMOJI=":pika-shy:"
ICONEMOJI2=":pikapika:"

#===============================================================================
#inisialisasi nomor agen pulsa
#===============================================================================
NOMORAGEN=081901250006

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
telkomselResult=($(mysql db_agen_pulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, hargaPaket, expDatePaket, caraCekPulsa, caraAktivasi from provider where namaProvider like 'simpati%' order by namaProvider;"))
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
#INDOSAT
#===============================================================================
# IndosatResult=($(mysql $db_agen_pulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, hargaPaket, expDatePaket, caraCekPulsa, caraAktivasi from provider where namaProvider like 'indosat%' order by namaProvider;"))
# cntISATElm=8
# cntISAT=${#IndosatResult[@]}
# ISATSet=$(((cntISAT+1)/cntISATElm))

# for (( i=1 ; i<=ISATSet ; i++ ))
# do
# 	x=$((cntISATElm * (i-1)))
# 	ISATNama[$i]=${IndosatResult[$((x + 0 ))]};
# 	ISATNo[$i]=${IndosatResult[$((x + 1))]};
# 	ISATHost[$i]=${IndosatResult[$((x + 2))]};
# 	ISATSpan[$i]=${IndosatResult[$((x + 3))]};
# 	ISATHargaPaket[$i]=${IndosatResult[$((x + 4))]};
# 	ISATExpDatePaket[$i]=${IndosatResult[$((x + 5))]};
# 	ISATCaraCekPulsa[$i]=${IndosatResult[$((x + 6))]};
# 	ISATCaraAktivasi[$i]=${IndosatResult[$((x + 7))]};
# done

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



for (( i = 1; i <= 56; i++ )); do
	echo $(rm -rf ~/.ssh/known_hosts)
	# untuk isi pulsa keseluruhan
	# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('081901250006', 'S20.${telkomselNo[$i]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
	telkomsel[$i]=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[$i]} ${telkomselCaraCekPulsa[$i]}'")
	echo ${telkomsel[$i]}
	# sleep 5s
done

numSimpati=1
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
	echo $cekString
	echo $cekString2
	echo $cekString3

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
				echo "$currentTime - Isi Pulsa Simpati - (${telkomselHost[$numSimpati]} - ${telkomselSpan[$numSimpati]}) - No : ${telkomselNo[$numSimpati]}"
				#insert ke database sms untuk mengirim pulsa ke tukang pulsa
				echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('$NOMORAGEN', 'S20.${telkomselNo[$numSimpati]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
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
				echo $(rm -rf ~/.ssh/known_hosts)
				telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[$numSimpati]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[$numSimpati]} ${telkomselCaraCekPulsa[$numSimpati]}'")
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
							echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('$NOMORAGEN', 'S20.${telkomselNo[$numSimpati]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
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
			echo $(rm -rf ~/.ssh/known_hosts)
			telkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[$numSimpati]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[$numSimpati]} ${telkomselCaraCekPulsa[$numSimpati]}'")
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
						echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('$NOMORAGEN', 'S20.${telkomselNo[$numSimpati]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
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

			echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('$NOMORAGEN', 'S20.${telkomselNo[$numSimpati]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
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
			echo $(rm -rf ~/.ssh/known_hosts)
			perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[$numSimpati]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[$numSimpati]} ${telkomselCaraAktivasi[$numSimpati]}'")
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
				mysql -h1.1.1.200 -uroot -pc3rmat db_agen_pulsa -e "update provider set expDatePaket = '$newDate' where namaProvider = '${telkomselNama[$numSimpati]}';"
			else
				echo "$currentTime - ${red}${telkomselNama[$numSimpati]} Gagal Perpanjang...${reset}"
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
				attempt=1
				attempt=$((attempt + 0))
				while [[ $attempt -le $maxAttempt && "$cekBerhasil" != "berhasil"  ]]; do
					echo "$currentTime - ${telkomselNama[$numSimpati]} percobaan ke-$attempt"
					echo $(rm -rf ~/.ssh/known_hosts)
					perpanjangTelkomsel=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${telkomselHost[$numSimpati]} -p12345 "asterisk -rx 'gsm send ussd ${telkomselSpan[$numSimpati]} ${telkomselCaraAktivasi[$numSimpati]}'")
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
						mysql -h1.1.1.200 -uroot -pc3rmat db_agen_pulsa -e "update provider set expDatePaket = '$newDate' where namaProvider = '${telkomselNama[$numSimpati]}';"
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
	# echo "INSERT INTO pulsa (namaProvider, sisaPulsa, tanggal, ussdReply) VALUES ('${telkomselNama[$numSimpati]}', '${sisaPulsaTelkomsel[$numSimpati]}', '$mysqlDateNow', '${USSDReplyTelkomsel[$numSimpati]}');"| mysql -h$HOST -u$USER -p$PASSWORD $db_agen_pulsa

	numSimpati=$((numSimpati + 1))
done