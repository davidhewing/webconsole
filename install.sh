#!/bin/bash
# Install for webconsole

DIR=`dirname $0`
if [ $DIR = "." ]; then
	DIR=`/bin/pwd`
fi

echo "Making sure everything is up to date"
# Update software:

apt-get update -y
apt-get upgrade -y

#Additional Software Packages

apt-get install minicom git nodejs npm apache2-utils -y || exit 2

echo 
echo "===================================="
echo " USER/PASSWORD for webconsole access"
echo
USERID=""
echo -n "Enter UserID for authenication (default admin): "
read USERID
[ -z "$USERID" ] && USERID=admin
OPT=""
[ ! -f users.htpasswd ] && OPT="-c"
htpasswd $OPT users.htpasswd $USERID

echo "Install directory for webconsole: $DIR"


echo
echo "Now attempting to get, compile, configure and install conserver"

# Get and compile conserver; standard defaults   http://www.conserver.com/

wget https://github.com/glance-/conserver/archive/master.zip
[ ! -d /etc/conserver ] && mkdir /etc/conserver
[ ! -d /var/log/consoles ] && mkdir -p /var/log/consoles

CONSERVER=0
[ ! -d /etc/conserver ] && mkdir /etc/conserver
mv master.zip conserver.zip && unzip -n conserver.zip && cd conserver-master/ && ./configure --prefix=/usr --sysconfdir=/etc/conserver && make &&  make install && CONSERVER=1
if [ $CONSERVER = 0 ]; then
	echo "Failed to build conserver"
	exit 1
fi


if [ `grep -c conserver /etc/services` == 0 ]; then
	echo conserver 2001/tcp >>/etc/services
fi
cat >/etc/conserver/conserver.cf <<EOF
#
# This is a fairly basic configuration file that interacts with one
# terminal server.
#

# first, we're going to set some generic console defaults so that we
# don't have to duplicate them for each console.
default * {
	logfile /var/log/consoles/&;	# '&' is replaced with console name
	timestamp 1hab;			# write timestamps
	rw *;				# allow all users
	master localhost;
	type host;
}

# define two consoles on the terminal server
console console { type device; device /dev/ttyS0; baud 115200; parity none; portbase -1; portinc 1; host unused; }

# set up the an access list to avoid the default
# anything *not* matched here will fallback to the default access (-a)
# mode
access * {
	trusted 127.0.0.1;
}
EOF
if [ `grep -c conserver /etc/hosts` == 0 ]; then
	echo "127.0.0.1 conserver" >>/etc/hosts
fi

sed "s|PATH=/usr/bin:/bin:/usr/local/bin|PATH=/usr/bin:/bin:/usr/sbin|" <conserver/conserver.rc >/etc/init.d/conserver
ln -s /etc/init.d/conserver /etc/rc5.d/S90conserver
cd ..

echo "Starting conserver"
/etc/init.d/conserver start

echo "Now getting nodejs dependencies"

npm install || exit 2
chmod 700 console.js

echo "Setting up systemd service for webconsole"
sed "s|WEBCONSOLEDIRECTORY|$DIR|" < bin/webconsole.service >/etc/systemd/system/webconsole.service
systemctl daemon-reload
systemctl enable webconsole.service
systemctl start webconsole.service
