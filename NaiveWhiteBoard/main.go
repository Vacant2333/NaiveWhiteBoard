package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

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
