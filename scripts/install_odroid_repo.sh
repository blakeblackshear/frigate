#!/bin/bash

apt-key adv --keyserver keyserver.ubuntu.com --recv-keys D986B59D

echo "deb http://deb.odroid.in/5422-s bionic main" > /etc/apt/sources.list.d/odroid.list