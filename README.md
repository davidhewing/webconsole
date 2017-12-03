WebConsole
------------

This project is a combination of several other projects to produce a web based
serial console with power/reset switch control over a Linux PC.  The idea
is to be able to bring a simple IPMI implementation using the serial console
option that GRUB and Linux kernels have, and with a easy to build expansion
board on a Raspberry PI to read the power/hard drive led activity and relays
to "push" the reset or power buttons.

![WebConsole](/images/screenshot.png?raw=true)

The software that this is based from include:

wetty https://github.com/krishnasrinivas/wetty - This is a great web ssh
implementation.  This project provided most of the code, but was primarily
setup to use ssh/login to access a server remotely via a web, websockets, and
javascript.  

hterm source - https://chromium.googlesource.com/apps/libapps/+/master/hterm/
wetty uses hterm to actual do the javascript terminal emulation.  Yet another
great project.

conserver https://github.com/glance-/conserver - This is a very old project that
manages serial console sessions including logging activity on the serial line
even when no one is connected.  

onoff nodejs library.  Standard library that provides the base hardware
interface between nodejs and the PC hardware.

WIKI
-------
This Wiki contains more details on the setup of the hardware and the software.
There is a script that performs most of the software setup that simplies things
greatly.

https://github.com/davidhewing/webconsole/wiki


General Setup
-------------
This is a project in progress - the code that exists here is working, but the
documentation still needs to be completed.  See the Wiki for details

The following is not a step by step guide, but general steps.

Software Setup
-----------------
1) Raspberry PI Raspbian basic install
    - Card Image Creation
    - Expand the PI filesystem
    - Disable serial consoles
    - Enable GPIO and Serial hardware
    - Setup static IP address for more reliability
    - Run apt-get update and apt-get Upgrade
2) conserver Setup
    - Download conserver from github, build, and Install
    - Create generic console configuration file to use the PI's serial port
3) webconsole
    - Clone WebConsole
    - Create a user.htpasswd file for user/passwords allowed to logon. Same format as apache's htpasswd filesystem
    - Start webconsole  ./console.js  -p 80 --loginexec console --loginargs console

Hardware
------------
Included is a 3D model for a Raspberry PI3 PCI card case that the PI can be
mounted on that will fit securely in a PC case.  There are holes for a network
and power connections to the PI.  The PI should be powered by an external power
supply so that it can continue to work when the Server PC is off.  Its also
possible to power the PI from the PC standby power supply, but that requires
splicing into the power supply cable (Purple and Black wires).

- kiCad diagram is in the hardware directory for building the add on board that
has the relays and opticouplers to control/monitor the server PC.

In general, two opticouplers are used to read the power and hard drive leds, and
two relays are used to connect to the power and reset switch.  There are a many
ways to do this - I created an adapter that I can plug into the motherboard header
and has conncetions for both the case jumpers and connections for the Raspberry
PI.

For the serial connections, I chose to use the onboard Raspberry PI serial
connection and the motherboard's serial header.  The problem is that the PI
uses TTL voltage levels while the motherboard uses RS232 voltage levels.  I've
ordered a RS232 to TTL converter and a motherboard header to RS232 connector to
connect this with the Raspberry PI.

While I have not tested this, instead of using the Raspberry PI's built in serial
port, a usb RS232 converter can be used instead.  This might be perfered if the
only available serial port is on the outside PC panel.

Linux PC server
----------------
The PC server also needs configuration for both the GRUB configuration and the
linux kernal parameters to set it up to output to both the VGA console and a
serial port.

I have some detailed directions for Fedora I will publish later.
