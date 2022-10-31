package board

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
)

// 所有连接到服务器的用户
var users map[string]*user

// 通过WebSocket连接到服务器的用户
type user struct {
	name       string          // 用户名(addr)
	ws         *websocket.Conn // WebSocket连接
	boardName  string          // 用户所属的白板名称
	boardIndex int             // 用户所在的白板页面
}

// Message WebSocket信息格式
type Message struct {
	Action  string // 操作名称
	Value   string
	Success bool // 指令是否成功
}

// AddUser 添加一个用户
func AddUser(name string, ws *websocket.Conn) {
	users[name] = &user{
		name: name,
		ws:   ws,
	}
	// 持续读取从用户发来的信息
	go users[name].receiveMessage()
}

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
		var msg Message
		err = json.Unmarshal(m, &msg)
		if err != nil {
			fmt.Printf("unmarshal message fail! msg:[%v] err:[%v]", m, err)
			break
		}
		var reply Message
		switch msg.Action {
		case "createWhiteBoard":
			// 创建白板
			reply = Message{
				Action:  "createWhiteBoard",
				Success: addWhiteBoard(msg.Value, u.name),
			}
		case "joinWhiteBoard":
			// 加入白板
			reply = Message{
				Action:  "joinWhiteBoard",
				Success: joinWhiteBoard(msg.Value, u.name),
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

// 创建白板,如果已存在返回false
func addWhiteBoard(borderName string, userName string) bool {
	if _, ok := boards[borderName]; ok {
		// 白板已存在
		return false
	}
	// 创建白板
	boards[borderName] = &whiteBoard{
		name:    borderName,
		founder: userName,
		pages:   make([]*page, 1),
	}
	// 默认页面(第一页)
	boards[borderName].pages[0] = &page{
		elements: make(map[int]*element),
	}
	// 设置用户所属白板
	users[userName].boardName = borderName
	return true
}

// 加入白板,如果白板不存在返回false
func joinWhiteBoard(boardName string, userName string) bool {
	if _, ok := boards[boardName]; !ok {
		// 白板不存在
		return false
	}
	// 设置用户所属白板
	users[userName].boardName = userName
	return true
}
