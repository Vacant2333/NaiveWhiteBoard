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

// 建立WebSocket连接
func connect(c *gin.Context) {
	//升级GET请求为webSocket协议
	ws, err := upGrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Printf("connect to %v fail! %v\n", c.RemoteIP(), err)
		return
	}
	defer func() {
		closeErr := ws.Close()
		if closeErr != nil {
			fmt.Printf("close websocket %v fail! %v\n", c.RemoteIP(), closeErr)
		}
	}()
	for {
		//读取ws中的数据
		mt, message, err := ws.ReadMessage()
		if err != nil {
			break
		}
		//写入ws数据
		err = ws.WriteMessage(mt, message)
		if err != nil {
			break
		}
	}
}

func main() {
	router := gin.Default()
	// Web端
	router.LoadHTMLFiles("templates/index.html")
	router.GET("/", func(context *gin.Context) {
		context.HTML(http.StatusOK, "index.html", nil)
	})
	// 静态文件
	router.Static("/static", "static")
	// 后端WebSocket(客户端通过该ws传输数据)
	router.GET("/connect", connect)

	router.Run(":8081")
}
