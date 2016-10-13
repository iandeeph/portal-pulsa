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
#mengambil semua element dalam database, query dari database
#===============================================================================
#===============================================================================
#THREE
#===============================================================================
threeResult=($(mysql db_agen_pulsa -h$HOST -u$USER -p$PASSWORD -Bse "select namaProvider, noProvider, host, span from provider where namaProvider like 'ThreeAll%' order by length(namaProvider), namaProvider;"))
cntThreeElm=4
cntThree=${#threeResult[@]}
threeSet=$(((cntThree+1)/cntThreeElm))

for (( i=1 ; i<=threeSet ; i++ ))
do
	x=$((cntThreeElm * (i-1)))
	threeNama[$i]=${threeResult[$((x + 0 ))]};
	threeNo[$i]=${threeResult[$((x + 1))]};
	threeHost[$i]=${threeResult[$((x + 2))]};
	threeSpan[$i]=${threeResult[$((x + 3))]};
	
	echo $(rm -rf ~/.ssh/known_hosts)
	cekPaket=$(sshpass -padmin ssh -o StrictHostKeyChecking=no admin@${threeHost[$i]} -p12345 "asterisk -rx 'gsm send ussd ${threeSpan[$i]} *123*5*1*3#'")
	echo $cekPaket

	textSlack="${threeNama[$i]} - ${threeNo[$i]} (Host : ${threeHost[$i]}, Span : ${threeSpan[$i]}) terblokir.. Pesan dari provider : $cekPaket"

	blockCheck=${cekPaket:49:11}
	if [[ "$blockCheck" == "System Busy" ]]; then
		curl -X POST -H 'Content-type: application/json' --data '{"text": "```'"$textSlack"'```", "channel": "'"$CHANNEL"'", "username": "'"$USERNAME"'", "icon_emoji": "'"$ICONEMOJI2"'"}' https://hooks.slack.com/services/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
	fi
done