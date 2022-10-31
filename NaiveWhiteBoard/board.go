package main

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
)

// 通过WebSocket连接到服务器的用户
type user struct {
	name       string          // 用户名(addr)
	ws         *websocket.Conn // WebSocket连接
	boardName  string          // 用户所属的白板名称
	boardIndex int             // 用户所在的白板页面
}

// 白板
type whiteBoard struct {
	name  string   // 白板名称
	pages []string // 白板所有页面的内容
}

// 信息结构
type message struct {
	action string
	value  string
}

var users map[string]*user
var boards map[string]*whiteBoard

// 持续接受来自用户的信息
func (u *user) receiveMessage() {
	defer func() {
		// 关闭WebSocket
		closeErr := u.ws.Close()
		// 删除该用户
		delete(users, u.name)
		if closeErr != nil {
			fmt.Printf("close websocket fail! %v\n", closeErr)
		}
	}()
	for {
		//读取ws中的数据
		_, m, err := u.ws.ReadMessage()
		if err != nil {
			break
		}
		// 解析msg
		var msg message
		err = json.Unmarshal(m, &msg)
		if err != nil {
			fmt.Printf("unmarshal message fail! msg:[%v] err:[%v]", m, err)
			break
		}
		switch msg.action {
		case "createWhiteBoard":
		// 创建白板,value是白板名称

		case "ping":
			// Ping/Pong
		}

		//写入ws数据
		//err = u.ws.WriteMessage(mt, message)
		//if err != nil {
		//	break
		//}
	}

}

// 添加一个用户
func addUser(name string, ws *websocket.Conn) {
	users[name] = &user{
		name: name,
		ws:   ws,
	}
	// 持续读取从用户发来的信息
	go users[name].receiveMessage()
}

// 创建一个白板,如果已存在返回false
func addWhiteBoard(name string) bool {
	if _, ok := boards[name]; ok {
		// 白板已存在
		return false
	}
	boards[name] = &whiteBoard{
		name:  name,
		pages: make([]string, 0),
	}
	return true
}
