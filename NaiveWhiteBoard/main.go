package main

import (
	"NaiveWhiteBoard/websocket"
	"github.com/gin-gonic/gin"
	"net/http"
)

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
	router.GET("/connect", websocket.Connect)
	router.Run(":8000")
}
