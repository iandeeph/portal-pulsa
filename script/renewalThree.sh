#===============================================================================
#mencari tanggal hari ini dalam format yyyymmdd
#===============================================================================
currentTime=$(date +"[ %Y-%m-%d %H:%M:%S ]")

#===============================================================================
#Inisialisasi parameter untuk post to slack
#===============================================================================
CHANNEL="#cermati_pulsa"
USERNAME="Pika Pulsa"
ICONEMOJI=":pika-shy:"
ICONEMOJI2=":pikapika:"

#===============================================================================
#inisialisasi nomor tukang pulsa a.k.a Karin dan tukang ketik a.k.a ian
#===============================================================================
TUKANGPULSA=081381171337
TUKANGKETIK=08992112203

#===============================================================================
#Konfigurasi Database
#===============================================================================
HOST="1.1.1.200"
USER="root"
PASSWORD="c3rmat"

#===============================================================================
#mengambil semua element dalam database, query dari database
#===============================================================================
#===============================================================================
#THREE
#===============================================================================
threeResult=($(mysql dbpulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, caraAktivasi from provider where namaProvider like 'Three%' and namaProvider not like 'ThreeAll%' order by namaProvider;"))
cntThreeElm=5
cntThree=${#threeResult[@]}
threeSet=$(((cntThree+1)/cntThreeElm))

for (( i=1 ; i<=threeSet ; i++ ))
do
	x=$((cntThreeElm * (i-1)))
	threeNama[$i]=${threeResult[$((x + 0 ))]};
	threeNo[$i]=${threeResult[$((x + 1))]};
	threeHost[$i]=${threeResult[$((x + 2))]};
	threeSpan[$i]=${threeResult[$((x + 3))]};
	threeCaraAktivasi[$i]=${threeResult[$((x + 4))]};
done

THREE=($(mysql dbpulsa -h$HOST -u$USER -p$PASSWORD -Bse "select noProvider from provider where namaProvider like 'Three%' and namaProvider not like 'ThreeAll%';"))
# THREE=(089629783240 089629779562 089629789574)
sleep 3m

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
fi

# echo "$currentTime - Restarting openvox..."
# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('${threeNo[1]}', 'reboot system c3rmat', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
# sleep 3m
echo $(rm -rf ~/.ssh/known_hosts)
renewalThreeFx1()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangThree=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[1]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[1]} ${threeCaraAktivasi[1]}'")
}
renewalThreeFx2()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangThree=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[2]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[2]} ${threeCaraAktivasi[2]}'")
}
renewalThreeFx3()
{
	sleep 1m
	echo $(rm -rf ~/.ssh/known_hosts)
	perpanjangThree=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[3]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[3]} ${threeCaraAktivasi[3]}'")
}

numThree=1
maxAttempt=10
maxAttempt=$((maxAttempt+0))
for i in "${threeNo[@]}"
do
	echo "$currentTime - ===================================================================================================="
	echo "$currentTime - Perpanjang Paket ${threeNama[$numThree]}..."
	echo "$currentTime - ===================================================================================================="
	renewalThreeFx$numThree
	cekString=${perpanjangThree:49:6} # mengecek respon dari openvox
	echo "$currentTime - USSD REPLY${yellow}$perpanjangThree${reset}"

	if [[ "$cekString" == "Terima" ]]; then #bila respon openvox = Terima
		echo "$currentTime - ${green}${threeNama[$numThree]} Berhasil Perpanjang...${reset}"
		echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
		# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGKETIK', '${threeNama[$numThree]} Perpanjang Paket Berhasil.. USSD REPLY :$perpanjangThree', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
		textNotifikasi[$numThree]="${threeNama[$numThree]} Perpanjang Paket Berhasil.. USSD REPLY :$perpanjangThree"
		curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"${textNotifikasi[$numThree]}"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
	else
		echo "$currentTime - ${red}${threeNama[$numThree]} Gagal Perpanjang...${reset}"
		echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
		attempt=1
		attempt=$((attempt + 0))
		while [[ $attempt -le $maxAttempt ]] && [[ "$cekBerhasil" != "berhasil"  ]]; do
			echo "$currentTime - ${threeNama[$numThree]} percobaan ke-$attempt"
			renewalThreeFx$numThree
			cekString=${perpanjangThree:49:6}
			echo "$currentTime - USSD REPLY : ${yellow}$perpanjangThree${reset}"

			if [[ "$cekString" == "Terima" ]]; then
				echo "$currentTime - ${green}${threeNama[$numThree]} Berhasil Perpanjang...${reset}"
				echo "$currentTime - -------------------------------------------------------------------------------------------------------------"
				# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGKETIK', '${threeNama[$numThree]} Perpanjang Paket Berhasil setelah percobaan ke-$attempt.. USSD REPLY :$perpanjangThree', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
				textNotifikasi[$numThree]="${threeNama[$numThree]} Perpanjang Paket Berhasil setelah percobaan ke-$attempt.. USSD REPLY :$perpanjangThree"
				curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"${textNotifikasi[$numThree]}"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
				attempt=$((attempt + 10))
			else
				cekBerhasil="gagal"
				echo "$currentTime - ${red}${threeNama[$numThree]} Gagal Perpanjang...${reset}"
				echo "$currentTime - ----------------------------------------------"
				attempt=$((attempt + 1))
				sleep 5s
				if [[ $attempt == $maxAttempt ]]; then
					# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID) VALUES ('$TUKANGKETIK', '${threeNama[$numThree]} Perpanjang Paket gagal.. USSD REPLY :$perpanjangThree', 'BashAdmin');"| mysql -h$HOST -u$USER -p$PASSWORD sms
					textNotifikasi[$numThree]="${threeNama[$numThree]} Perpanjang Paket gagal.. USSD REPLY :$perpanjangThree"
					curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"${textNotifikasi[$numThree]}"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
				fi
			fi
		done
	fi
	echo "$currentTime - ${yellow}+++++++++++++++++++++++ CHECKING THREE$numThree FINISHED+++++++++++++++++++++${reset}"
	numThree=$((numThree + 1))
done