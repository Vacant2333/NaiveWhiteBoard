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
7. 在线人数


### **如何运行:**
本机运行:<br>
`cd NaiveWhiteBoard`<br>
`go run main.go`<br>
如果下载外部库失败(被墙)<br>
`go env -w GOPROXY=https://goproxy.cn,direct`

Docker运行:<br>
`cd NaiveWhiteBoard`<br>
`docker-compose up`


