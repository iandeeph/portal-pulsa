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
#THREE
#===============================================================================
threeResult=($(mysql db_agen_pulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span, caraCekKuota, caraCekPulsa from provider where namaProvider like 'ThreeAll%' order by length(namaProvider), namaProvider;"))
cntThreeElm=6
cntThree=${#threeResult[@]}
threeSet=$(((cntThree+1)/cntThreeElm))

for (( i=1 ; i<=threeSet ; i++ ))
do
	x=$((cntThreeElm * (i-1)))
	threeNama[$i]=${threeResult[$((x + 0 ))]};
	threeNo[$i]=${threeResult[$((x + 1))]};
	threeHost[$i]=${threeResult[$((x + 2))]};
	threeSpan[$i]=${threeResult[$((x + 3))]};
	threeKodecekKuota[$i]=${threeResult[$((x + 4))]};
	threeKodecekPulsa[$i]=${threeResult[$((x + 5))]};

	# echo "INSERT INTO outbox (DestinationNumber, TextDecoded, CreatorID, Coding) VALUES ('081901250006', 'T10.${threeNo[$i]}.0312', 'agenpulsa', 'Default_No_Compression');"| mysql -h$HOST -u$USER -p$PASSWORD db_agen_pulsa
	
	echo $(rm -rf ~/.ssh/known_hosts)
	cekPaket=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[$i]} ${threeKodecekKuota[$i]}'")
	echo "$currentTime - $cekPaket"
	# cekPulsa=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[$i]} ${threeKodecekPulsa[$i]}'")
	# echo "$currentTime - $cekPulsa"
	# expDate=${cekPulsa: 85: 9}
	# echo echo "$currentTime - $expDate"
	# expDay=${expDate: -9: 2}
	# expMonth=${expDate: -5: 3}
	# expYear=${expDate: -2}


	# case "$expMonth" in
	#         JAN)
	#             ExpMonthInNum="01"
	#             ;;

	#         FEB)
	#             ExpMonthInNum="02"
	#             ;;

	#         MAR)
	#             ExpMonthInNum="03"
	#             ;;

	#         APR)
	#             ExpMonthInNum="04"
	#             ;;

	#         MAY)
	#             ExpMonthInNum="05"
	#             ;;

	#         JUN)
	#             ExpMonthInNum="06"
	#             ;;

	#         JUL)
	#             ExpMonthInNum="07"
	#             ;;

	#         AUG)
	#             ExpMonthInNum="08"
	#             ;;

	#         SEP)
	#             ExpMonthInNum="09"
	#             ;;

	#         OCT)
	#             ExpMonthInNum="10"
	#             ;;

	#         NOV)
	#             ExpMonthInNum="11"
	#             ;;
	        
	#         DEC)
	#             ExpMonthInNum="12"
	#             ;;

	#         *)
	#             ExpMonthInNum="00"
	 
	# esac

	# expDateFormated="20$expYear$ExpMonthInNum$expDay"
	# echo "$currentTime - $expDateFormated"

	# if [[ $NOW -ge $expDateFormated ]]; then 
	# 	expMsgSlack="${threeNama[$i]} - ${threeNo[$i]} (Host : ${threeHost[$i]}, Span : ${threeSpan[$i]}) DATE EXPIRED..!!!! Pesan dari provider : $cekPulsa"
	# 	curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$expMsgSlack"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
	# fi

	textSlack="${threeNama[$i]} - ${threeNo[$i]} (Host : ${threeHost[$i]}, Span : ${threeSpan[$i]}) terblokir.. Pesan dari provider : $cekPaket"

	blockCheck=${cekPaket:49:11}
	if [[ "$blockCheck" == "System Busy" ]]; then
		echo "$textSlack"
		curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$textSlack"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
	fi
done