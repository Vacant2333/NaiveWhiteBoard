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

// 信息
type message struct {
	action  string // 操作名称
	value   string
	success bool // 指令是否成功
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
		// 接收来自用户的一条信息
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
		var reply message
		switch msg.action {
		case "createWhiteBoard":
			// 创建白板
			reply = message{
				action:  "createWhiteBoard",
				success: addWhiteBoard(msg.value),
			}
		case "ping":
			// Ping/Pong
		}
		// 回复用户
		replyJSON, _ := json.Marshal(reply)
		err = u.ws.WriteMessage(websocket.TextMessage, replyJSON)
		if err != nil {
			fmt.Printf("reply to user fail! reply:[%v] user[%v]", reply, u)
			break
		}
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
