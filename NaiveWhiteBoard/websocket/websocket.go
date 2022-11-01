package websocket

import (
	"NaiveWhiteBoard/board"
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

// Connect 与用户建立WebSocket连接
func Connect(c *gin.Context) {
	//升级GET请求为WebSocket协议
	ws, err := upGrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Printf("connect to %v fail! %v\n", c.RemoteIP(), err)
		return
	}
	ws.SetCloseHandler(func(code int, text string) error {
		// todo:close 处理
		return nil
	})
	// 连接成功,保存这个用户后持续接受来自用户的消息
	board.AddUser(ws.RemoteAddr().String(), ws)
}
