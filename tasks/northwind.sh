
# UPDATE
wget https://github.com/jpwhite3/northwind-SQLite3/blob/master/Northwind_large.sqlite.zip?raw=true -O northwind.zip
unzip -p northwind.zip Northwind_large.sqlite > tasks/northwind.sqlite
rm northwind.zip
