
# https://www.sqlite.org/download.html

# VARIABLES
RELEASE=3380500

# LINUX
wget https://www.sqlite.org/2022/sqlite-tools-linux-x86-$RELEASE.zip -O linux.zip
unzip -p linux.zip sqlite-tools-linux-x86-$RELEASE/sqlite3 > binaries/linux/sqlite3
rm linux.zip

# WIN32
wget https://www.sqlite.org/2022/sqlite-tools-win32-x86-$RELEASE.zip -O win32.zip
unzip -p win32.zip sqlite-tools-win32-x86-$RELEASE/sqlite3.exe > binaries/win32/sqlite3.exe
rm win32.zip

# DARWIN
wget https://www.sqlite.org/2022/sqlite-tools-osx-x86-$RELEASE.zip -O darwin.zip
unzip -p darwin.zip sqlite-tools-osx-x86-$RELEASE/sqlite3 > binaries/darwin/sqlite3
rm darwin.zip
