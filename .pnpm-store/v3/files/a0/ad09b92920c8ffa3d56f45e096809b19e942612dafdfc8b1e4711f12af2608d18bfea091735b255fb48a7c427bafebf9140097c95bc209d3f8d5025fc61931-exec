#!/bin/bash
set -ev; # stop on error

sudo apt-get update

echo "Insalling dependencies required for tests in codegens/libcurl"
sudo apt-get install libcurl4-gnutls-dev

echo "Installing dependencies required for tests in codegens/java-okhttp"
pushd ./codegens/java-okhttp &>/dev/null;
  sudo add-apt-repository ppa:openjdk-r/ppa -y
  sudo rm -rf /var/lib/apt/lists/*
  sudo apt-get update
  sudo apt-get install -y openjdk-8-jdk
  unzip test/unit/fixtures/dependencies.zip
popd &>/dev/null;

echo "Installing dependencies required for tests in codegens/kotlin-okhttp"
pushd ./codegens/kotlin-okhttp &>/dev/null;
  sudo add-apt-repository ppa:openjdk-r/ppa -y
  sudo rm -rf /var/lib/apt/lists/*
  sudo apt-get update
  sudo apt-get install -y openjdk-8-jdk
  sudo snap install --classic kotlin
  unzip test/unit/fixtures/dependencies.zip
popd &>/dev/null;

echo "Installing dependencies required for tests in codegens/java-unirest"
pushd ./codegens/java-unirest &>/dev/null;
  unzip test/unit/fixtures/dependencies.zip
popd &>/dev/null;

echo "Installing dependencies required for tests in codegens/csharp-restsharp"
pushd ./codegens/csharp-restsharp &>/dev/null;
  wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
  sudo dpkg -i packages-microsoft-prod.deb
  sudo apt-get install apt-transport-https
  sudo apt-get update
  sudo apt-get install dotnet-sdk-6.0
  dotnet new console -o testProject -f net6.0
  pushd ./testProject &>/dev/null;
  dotnet add package RestSharp --version 112.0.0
  popd &>/dev/null;
popd &>/dev/null;

echo "Installing dependencies required for tests in codegens/csharp-httpclient"
# Install latest .net6.0 sdk
pushd ./codegens/csharp-httpclient &>/dev/null;
  wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
  sudo dpkg -i packages-microsoft-prod.deb
  sudo apt-get install apt-transport-https
  sudo apt-get update
  sudo apt-get install dotnet-sdk-6.0
  dotnet new console -o testProject -f net6.0
  # no extra packages needed
popd &>/dev/null;

echo "Installing Powershell"
  sudo apt-get install powershell -y

echo "Installing dependencies required for tests in codegens/php-httprequest2"
  pear install HTTP_Request2-2.3.0

echo "Installing dependencies required for tests in codegens/swift"
pushd ./codegens/swift &>/dev/null;
  sudo apt-get update
  sudo apt-get install clang-3.6 libicu-dev libpython2.7 -y
  sudo apt-get install libcurl4 libpython2.7-dev -y
  sudo wget -q https://download.swift.org/swift-5.7.3-release/ubuntu2004/swift-5.7.3-RELEASE/swift-5.7.3-RELEASE-ubuntu20.04.tar.gz
  sudo tar xzf swift-5.7.3-RELEASE-ubuntu20.04.tar.gz
  sudo chmod 777 swift-5.7.3-RELEASE-ubuntu20.04/usr/lib/swift/CoreFoundation/module.map
popd &>/dev/null;

echo "Installing dependencies required for tests in codegens/csharp-restsharp"
sudo apt-get install -y mono-complete

echo "Installing curl"
  sudo apt-get install -y curl

echo "Installing dependencies required for tests in codegens/shell-httpie"
sudo apt-get install httpie

echo "Installing dependencies required for tests in codegens/dart-http"
pushd ./codegens/dart-http &>/dev/null;
  wget -q https://storage.googleapis.com/dart-archive/channels/stable/release/3.0.4/linux_packages/dart_3.0.4-1_amd64.deb
  sudo dpkg -i dart_3.0.4-1_amd64.deb
  echo '''name: test
version: 1.0.0
environment:
  sdk: ^3.0.3
dependencies:
  http: ^1.0.0
''' > pubspec.yaml
  dart pub get
popd &>/dev/null;

echo "Installing dependencies required for tests in codegens/dart-dio"
pushd ./codegens/dart-dio &>/dev/null;
  echo '''name: test
version: 1.0.0
environment:
  sdk: ^3.0.3
dependencies:
  dio: ^5.2.0
''' > pubspec.yaml
  dart pub get
popd &>/dev/null;

echo "Installing dependencies required for tests in codegens/php-guzzle"
  php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
  php composer-setup.php
  php -r "unlink('composer-setup.php');"
  sudo mv composer.phar /usr/bin/composer
  composer global require guzzlehttp/guzzle:7.4.1

echo "Installing dependencies required for tests in codegens/r-rCurl and r-httr Installing R"
  sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys E298A3A825C0D65DFD57CBB651716619E084DAB9
  sudo add-apt-repository 'deb https://cloud.r-project.org/bin/linux/ubuntu focal-cran40/'
  sudo apt-get update
  sudo apt-get install r-base

echo "Installing httr"
  sudo R --vanilla -e 'install.packages("httr", version="1.4.2", repos="http://cran.us.r-project.org")'

echo "Installing RCurl"
sudo R --vanilla -e 'install.packages("RCurl", version="1.98.1.6", repos="http://cran.us.r-project.org")'

echo "Installing Rust"
  sudo apt-get install -y build-essential pkg-config libssl-dev
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  pushd ./codegens/rust-reqwest &>/dev/null;
    echo '''[package]
  name = "rust_reqwest_codegen"
  version = "0.0.1"
  edition = "2021"

  [dependencies]
  reqwest = { version = "0.11.14", features = ["json", "multipart"] }
  tokio = { version = "1.26.0", features = ["full"] }
  serde_json = { version = "1.0.94" }''' > Cargo.toml
    mkdir src && echo '''fn main() {
      println!("Hello, world!");
    }''' > src/main.rs
    cargo build
  popd &>/dev/null;
