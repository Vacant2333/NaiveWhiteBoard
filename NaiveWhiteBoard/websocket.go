package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"net/http"
)

var upGrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// 与用户建立WebSocket连接
func connect(c *gin.Context) {
	//升级GET请求为WebSocket协议
	ws, err := upGrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Printf("connect to %v fail! %v\n", c.RemoteIP(), err)
		return
	}
	// 连接成功,保存这个用户后持续接受来自用户的消息
	addUser(ws.RemoteAddr().String(), ws)
}
