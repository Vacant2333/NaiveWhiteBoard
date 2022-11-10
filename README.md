# NaiveWhiteBoard

Server: go+gin+WebSocket
Web: JQ+Fabric.js+MDL+clipboard.js

Demo: [http://blog.vacant.zone:8000/?boardName=100](http://blog.vacant.zone:8000/?boardName=100)

TODO:
2. 撤销/重做
3. 多选元素修改时的同步Bug
5. 删除页面动画
6. 功能区收缩?
8. 选中工具后在点击的位置添加

### **如何运行:**
本机运行(GOPROXY用于加速下载外部库):<br>
`cd NaiveWhiteBoard`<br>
`go env -w GOPROXY=https://goproxy.cn,direct`<br>
`go run main.go`<br>
Docker运行:<br>
`cd NaiveWhiteBoard`<br>
`docker-compose up`<br><br>
运行成功后访问[http://localhost:8000/](http://localhost:8000/)即可

