
# https://www.sqlite.org/download.html

# VARIABLES
SNAPSHOT=202205171511

# UNIX
wget https://www.sqlite.org/snapshot/sqlite-snapshot-$SNAPSHOT.tar.gz -O sqlite.tar.gz
tar -xf sqlite.tar.gz
cd sqlite-snapshot-$SNAPSHOT
gcc shell.c sqlite3.c -lpthread -ldl -lm -o sqlite3

# WINDOWS
//TODO: Compile an ARM64 binary for Windows
