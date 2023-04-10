#!/bin/bash

set -euxo pipefail

NGINX_VERSION="1.22.1"
VOD_MODULE_VERSION="1.30"
SECURE_TOKEN_MODULE_VERSION="1.4"
RTMP_MODULE_VERSION="1.2.1"

cp /etc/apt/sources.list /etc/apt/sources.list.d/sources-src.list
sed -i 's|deb http|deb-src http|g' /etc/apt/sources.list.d/sources-src.list
apt update
apt -yqq install --no-install-recommends ca-certificates wget
update-ca-certificates -f

if [[ "${TARGETARCH}" == "arm64" ]]; then
    CC="/usr/bin/aarch64-linux-gnu-gcc"
    dpkg --add-architecture arm64
    apt update
    apt install -y gcc-aarch64-linux-gnu g++-aarch64-linux-gnu libc6-arm64-cross libc6-dev-arm64-cross binutils-aarch64-linux-gnu
    apt install -y libssl-dev:arm64 libpcre3:arm64 libpcre3-dev:arm64 zlib1g:arm64 zlib1g-dev:arm64 libxslt1-dev:arm64 libxml2-dev:arm64 libgd-dev:arm64 libgeoip-dev:arm64 libgoogle-perftools-dev:arm64 libperl-dev:arm64 liblua5.1-0-dev:arm64 libpam0g-dev:arm64
else
    CC="/usr/bin/gcc"
fi

apt -yqq build-dep nginx

mkdir /tmp/nginx
wget -nv https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz
tar -zxf nginx-${NGINX_VERSION}.tar.gz -C /tmp/nginx --strip-components=1
if [[ "${TARGETARCH}" == "arm64" ]]; then
patch -d /tmp/nginx -p1 << 'EOF'
diff -b --unified -Nr nginx-1.23.3/auto/cc/name nginx-1.23.3-patched/auto/cc/name
--- nginx-1.23.3/auto/cc/name	2022-12-13 18:53:53
+++ nginx-1.23.3-patched/auto/cc/name	2023-03-23 22:34:26
@@ -7,7 +7,7 @@
 
     ngx_feature="C compiler"
     ngx_feature_name=
-    ngx_feature_run=yes
+    ngx_feature_run=
     ngx_feature_incs=
     ngx_feature_path=
     ngx_feature_libs=
diff -b --unified -Nr nginx-1.23.3/auto/endianness nginx-1.23.3-patched/auto/endianness
--- nginx-1.23.3/auto/endianness	2022-12-13 18:53:53
+++ nginx-1.23.3-patched/auto/endianness	2023-03-23 22:34:39
@@ -13,7 +13,8 @@
 END
 
 
-cat << END > $NGX_AUTOTEST.c
+if [ "$NGX_CC_NAME" != "gcc" ] ; then
+  cat << END > $NGX_AUTOTEST.c
 
 int main(void) {
     int i = 0x11223344;
@@ -26,12 +27,12 @@
 
 END
 
-ngx_test="$CC $CC_TEST_FLAGS $CC_AUX_FLAGS \
+  ngx_test="$CC $CC_TEST_FLAGS $CC_AUX_FLAGS \
           -o $NGX_AUTOTEST $NGX_AUTOTEST.c $NGX_LD_OPT $ngx_feature_libs"
 
-eval "$ngx_test >> $NGX_AUTOCONF_ERR 2>&1"
+  eval "$ngx_test >> $NGX_AUTOCONF_ERR 2>&1"
 
-if [ -x $NGX_AUTOTEST ]; then
+  if [ -x $NGX_AUTOTEST ]; then
     if $NGX_AUTOTEST >/dev/null 2>&1; then
         echo " little endian"
         have=NGX_HAVE_LITTLE_ENDIAN . auto/have
@@ -41,10 +42,18 @@
 
     rm -rf $NGX_AUTOTEST*
 
-else
+  else
     rm -rf $NGX_AUTOTEST*
 
     echo
     echo "$0: error: cannot detect system byte ordering"
     exit 1
+  fi
+else
+  if `. auto/gcc-endianness` ; then
+      echo " little endian"
+      have=NGX_HAVE_LITTLE_ENDIAN . auto/have
+  else
+      echo " big endian"
+  fi
 fi
diff -b --unified -Nr nginx-1.23.3/auto/endianness.orig nginx-1.23.3-patched/auto/endianness.orig
--- nginx-1.23.3/auto/endianness.orig	1970-01-01 03:00:00
+++ nginx-1.23.3-patched/auto/endianness.orig	2022-12-13 18:53:53
@@ -0,0 +1,50 @@
+
+# Copyright (C) Igor Sysoev
+# Copyright (C) Nginx, Inc.
+
+
+echo $ngx_n "checking for system byte ordering ...$ngx_c"
+
+cat << END >> $NGX_AUTOCONF_ERR
+
+----------------------------------------
+checking for system byte ordering
+
+END
+
+
+cat << END > $NGX_AUTOTEST.c
+
+int main(void) {
+    int i = 0x11223344;
+    char *p;
+
+    p = (char *) &i;
+    if (*p == 0x44) return 0;
+    return 1;
+}
+
+END
+
+ngx_test="$CC $CC_TEST_FLAGS $CC_AUX_FLAGS \
+          -o $NGX_AUTOTEST $NGX_AUTOTEST.c $NGX_LD_OPT $ngx_feature_libs"
+
+eval "$ngx_test >> $NGX_AUTOCONF_ERR 2>&1"
+
+if [ -x $NGX_AUTOTEST ]; then
+    if $NGX_AUTOTEST >/dev/null 2>&1; then
+        echo " little endian"
+        have=NGX_HAVE_LITTLE_ENDIAN . auto/have
+    else
+        echo " big endian"
+    fi
+
+    rm -rf $NGX_AUTOTEST*
+
+else
+    rm -rf $NGX_AUTOTEST*
+
+    echo
+    echo "$0: error: cannot detect system byte ordering"
+    exit 1
+fi
diff -b --unified -Nr nginx-1.23.3/auto/feature nginx-1.23.3-patched/auto/feature
--- nginx-1.23.3/auto/feature	2022-12-13 18:53:53
+++ nginx-1.23.3-patched/auto/feature	2023-03-23 22:34:46
@@ -52,6 +52,85 @@
     case "$ngx_feature_run" in
 
         yes)
+
+            if [ "$ngx_feature_name" = "NGX_HAVE_GCC_ATOMIC" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_C99_VARIADIC_MACROS" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_GCC_VARIADIC_MACROS" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_EPOLL" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_SENDFILE" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_SENDFILE64" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_PR_SET_DUMPABLE" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_PR_SET_KEEPCAPS" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_MAP_ANON" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_MAP_DEVZERO" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            elif [ "$ngx_feature_name" = "NGX_HAVE_SYSVSHM" ] ; then
+                echo " found"
+                ngx_found=yes
+
+                if test -n "$ngx_feature_name"; then
+                    have=$ngx_have_feature . auto/have
+                fi
+            else
             # /bin/sh is used to intercept "Killed" or "Abort trap" messages
             if /bin/sh -c $NGX_AUTOTEST >> $NGX_AUTOCONF_ERR 2>&1; then
                 echo " found"
@@ -64,6 +143,8 @@
             else
                 echo " found but is not working"
             fi
+            fi
+
         ;;
 
         value)
diff -b --unified -Nr nginx-1.23.3/auto/gcc-endianness nginx-1.23.3-patched/auto/gcc-endianness
--- nginx-1.23.3/auto/gcc-endianness	1970-01-01 03:00:00
+++ nginx-1.23.3-patched/auto/gcc-endianness	2023-03-23 22:36:00
@@ -0,0 +1,9 @@
+#!/bin/sh
+
+if [ "x$NGX_CC_NAME" = "x" ] ; then
+  exit 0
+fi
+
+if `${CC} -dM -E - < /dev/null | grep " __BYTE_ORDER__ " | cut -f3 -d' ' | grep -q "_BIG_"` ; then
+  exit 1
+fi
\ No newline at end of file
diff -b --unified -Nr nginx-1.23.3/auto/types/gcc-sizeof nginx-1.23.3-patched/auto/types/gcc-sizeof
--- nginx-1.23.3/auto/types/gcc-sizeof	1970-01-01 03:00:00
+++ nginx-1.23.3-patched/auto/types/gcc-sizeof	2023-03-23 22:35:45
@@ -0,0 +1,31 @@
+#!/bin/sh
+
+if [ "x$NGX_CC_NAME" = "x" -o "x$ngx_type" = "x" ] ; then
+  echo "unknown"
+fi
+
+if [ "$ngx_type" = "int" ] ; then
+  size_from_cpp=`${CC} -dM -E - < /dev/null | grep __SIZEOF_INT__ | cut -f3 -d' ' | sed 's,^[ \t]*,,' | sed 's,[ \t]*$,,'`
+  echo "$size_from_cpp"
+elif [ "$ngx_type" = "long" ] ; then
+  size_from_cpp=`${CC} -dM -E - < /dev/null | grep __SIZEOF_LONG__ | cut -f3 -d' ' | sed 's,^[ \t]*,,' | sed 's,[ \t]*$,,'`
+  echo "$size_from_cpp"
+elif [ "$ngx_type" = "long long" ] ; then
+  size_from_cpp=`${CC} -dM -E - < /dev/null | grep __SIZEOF_LONG_LONG__ | cut -f3 -d' ' | sed 's,^[ \t]*,,' | sed 's,[ \t]*$,,'`
+  echo "$size_from_cpp"
+elif [ "$ngx_type" = "size_t" ] ; then
+  size_from_cpp=`${CC} -dM -E - < /dev/null | grep __SIZEOF_SIZE_T__ | cut -f3 -d' ' | sed 's,^[ \t]*,,' | sed 's,[ \t]*$,,'`
+  echo "$size_from_cpp"
+elif [ "$ngx_type" = "sig_atomic_t" ] ; then
+  size_from_cpp=`${CC} -dM -E - < /dev/null | grep __SIZEOF_INT__ | cut -f3 -d' ' | sed 's,^[ \t]*,,' | sed 's,[ \t]*$,,'`
+  echo "$size_from_cpp"
+elif [ "$ngx_type" = "void *" ] ; then
+  size_from_cpp=`${CC} -dM -E - < /dev/null | grep __SIZEOF_POINTER__ | cut -f3 -d' ' | sed 's,^[ \t]*,,' | sed 's,[ \t]*$,,'`
+  echo "$size_from_cpp"
+elif [ "$ngx_type" = "off_t" ] ; then
+  size_from_cpp=`${CC} -dM -E - < /dev/null | grep __SIZEOF_PTRDIFF_T__ | cut -f3 -d' ' | sed 's,^[ \t]*,,' | sed 's,[ \t]*$,,'`
+  echo "$size_from_cpp"
+elif [ "$ngx_type" = "time_t" ] ; then
+  size_from_cpp=`${CC} -dM -E - < /dev/null | grep __SIZEOF_PTRDIFF_T__ | cut -f3 -d' ' | sed 's,^[ \t]*,,' | sed 's,[ \t]*$,,'`
+  echo "$size_from_cpp"
+fi
\ No newline at end of file
diff -b --unified -Nr nginx-1.23.3/auto/types/sizeof nginx-1.23.3-patched/auto/types/sizeof
--- nginx-1.23.3/auto/types/sizeof	2022-12-13 18:53:53
+++ nginx-1.23.3-patched/auto/types/sizeof	2023-03-23 22:34:50
@@ -14,7 +14,8 @@
 
 ngx_size=
 
-cat << END > $NGX_AUTOTEST.c
+if [ "$NGX_CC_NAME" != "gcc" ] ; then
+  cat << END > $NGX_AUTOTEST.c
 
 #include <sys/types.h>
 #include <sys/time.h>
@@ -33,17 +34,20 @@
 END
 
 
-ngx_test="$CC $CC_TEST_FLAGS $CC_AUX_FLAGS \
+  ngx_test="$CC $CC_TEST_FLAGS $CC_AUX_FLAGS \
           -o $NGX_AUTOTEST $NGX_AUTOTEST.c $NGX_LD_OPT $ngx_feature_libs"
 
-eval "$ngx_test >> $NGX_AUTOCONF_ERR 2>&1"
+  eval "$ngx_test >> $NGX_AUTOCONF_ERR 2>&1"
 
 
-if [ -x $NGX_AUTOTEST ]; then
+  if [ -x $NGX_AUTOTEST ]; then
     ngx_size=`$NGX_AUTOTEST`
     echo " $ngx_size bytes"
-fi
-
+  fi
+else
+    ngx_size=`ngx_type="$ngx_type" . auto/types/gcc-sizeof`
+    echo " $ngx_size bytes"
+fi
 
 case $ngx_size in
     4)
EOF
fi
rm nginx-${NGINX_VERSION}.tar.gz
mkdir /tmp/nginx-vod-module
wget -nv https://github.com/kaltura/nginx-vod-module/archive/refs/tags/${VOD_MODULE_VERSION}.tar.gz
tar -zxf ${VOD_MODULE_VERSION}.tar.gz -C /tmp/nginx-vod-module --strip-components=1
rm ${VOD_MODULE_VERSION}.tar.gz
    # Patch MAX_CLIPS to allow more clips to be added than the default 128
sed -i 's/MAX_CLIPS (128)/MAX_CLIPS (1080)/g' /tmp/nginx-vod-module/vod/media_set.h
patch -d /tmp/nginx-vod-module/ -p1 << 'EOF'
--- a/vod/avc_hevc_parser.c       2022-06-27 11:38:10.000000000 +0000
+++ b/vod/avc_hevc_parser.c       2023-01-16 11:25:10.900521298 +0000
@@ -3,6 +3,9 @@
 bool_t
 avc_hevc_parser_rbsp_trailing_bits(bit_reader_state_t* reader)
 {
+	// https://github.com/blakeblackshear/frigate/issues/4572
+	return TRUE;
+
 	uint32_t one_bit;

 	if (reader->stream.eof_reached)
EOF


mkdir /tmp/nginx-secure-token-module
wget https://github.com/kaltura/nginx-secure-token-module/archive/refs/tags/${SECURE_TOKEN_MODULE_VERSION}.tar.gz
tar -zxf ${SECURE_TOKEN_MODULE_VERSION}.tar.gz -C /tmp/nginx-secure-token-module --strip-components=1
rm ${SECURE_TOKEN_MODULE_VERSION}.tar.gz
mkdir /tmp/nginx-rtmp-module
wget -nv https://github.com/arut/nginx-rtmp-module/archive/refs/tags/v${RTMP_MODULE_VERSION}.tar.gz
tar -zxf v${RTMP_MODULE_VERSION}.tar.gz -C /tmp/nginx-rtmp-module --strip-components=1
rm v${RTMP_MODULE_VERSION}.tar.gz

cd /tmp/nginx

CC="$CC" ./configure --prefix=/usr/local/nginx \
    --with-file-aio \
    --with-http_sub_module \
    --with-http_ssl_module \
    --with-threads \
    --add-module=../nginx-vod-module \
    --add-module=../nginx-secure-token-module \
    --add-module=../nginx-rtmp-module \
    --with-cc-opt="-O3 -Wno-error=implicit-fallthrough"

make -j$(nproc) && make install
rm -rf /usr/local/nginx/html /usr/local/nginx/conf/*.default
