package main

import (
	"NaiveWhiteBoard/board"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"net/http"
)

// 升级器,将GET请求升级为WebSocket
var upGrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	router := gin.Default()
	// 静态文件
	router.Static("static", "static")
	// Web端访问
	router.LoadHTMLFiles("templates/index.html")
	router.GET("/", func(context *gin.Context) {
		context.HTML(http.StatusOK, "index.html", nil)
	})
	// 后端WebSocket(客户端通过该接口传输数据)
	router.GET("/connect", func(c *gin.Context) {
		//升级GET请求为WebSocket协议
		ws, err := upGrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			fmt.Printf("connect to %v fail! %v\n", c.RemoteIP(), err)
			return
		}
		// 连接成功,保存这个用户后持续接受来自用户的消息
		board.AddUser(ws.RemoteAddr().String(), ws)
	})
	router.Run("0.0.0.0:8000")
}
