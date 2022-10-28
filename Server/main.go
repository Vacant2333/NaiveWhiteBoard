package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
)

func main() {
	engine := gin.Default()
	// RESTFul,API路由
	apiRouter := engine.Group("/api")
	apiRouter.GET("test", func(context *gin.Context) {
		context.Value("test")
	})
	// Web客户端
	engine.LoadHTMLFiles("templates/index.html")
	clientRouter := engine.Group("/")
	clientRouter.GET("/", func(context *gin.Context) {
		context.HTML(http.StatusOK, "index.html", nil)
	})
	fmt.Println(os.Getwd())
	engine.Run(":8080")
}
