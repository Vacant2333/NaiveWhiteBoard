# NaiveWhiteBoard

Server: go+gin+WebSocket
Web: JQ+Fabric.js+MDL+clipboard.js

Demo: [http://blog.vacant.zone:8000/?boardName=100](http://blog.vacant.zone:8000/?boardName=100)

TODO:
1. 元素样式
2. 撤销/重做
3. 多选元素修改时的同步Bug
4. 美化
5. 删除页面动画
6. 功能区收缩?


**如何运行:**
1. 本机运行
cd NaiveWhiteBoard
go run main.go
如果下载外部库失败可运行
go env -w GOPROXY=https://goproxy.cn,direct
2. Docker
cd NaiveWhiteBoard
docker-compose up


