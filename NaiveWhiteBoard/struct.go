package main

// 通过WebSocket连接到服务器的用户
type user struct {
	name      string // 用户名(addr)
	boardName string // 用户所属的白板名称
}

// 白板
type whiteBoard struct {
}
