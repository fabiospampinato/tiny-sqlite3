
# UPDATE
wget https://github.com/jpwhite3/northwind-SQLite3/blob/591cd3253c327b1eed7155c1fec57464565c0932/Northwind_large.sqlite.zip?raw=true -O northwind.zip
unzip -p northwind.zip Northwind_large.sqlite > tasks/northwind.sqlite
rm northwind.zip
