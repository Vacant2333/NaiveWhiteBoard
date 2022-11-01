package board

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
)

// Users 所有连接到服务器的用户
var Users map[string]*User

// User 通过WebSocket连接到服务器的用户
type User struct {
	Name      string          // 用户名(addr)
	WebSocket *websocket.Conn // WebSocket连接
	Board     string          // 用户所属的白板名称
	Page      int             // 用户所在的白板下标
}

// Message WebSocket信息格式
type Message struct {
	Action  string // 操作名称
	Value   interface{}
	Success bool // 指令是否成功
}

// AddUser 添加一个用户
func AddUser(name string, ws *websocket.Conn) {
	Users[name] = &User{
		Name:      name,
		WebSocket: ws,
	}
	// 持续读取从用户发来的信息
	go Users[name].receiveMessage()
}

// 持续接受来自用户的信息
func (user *User) receiveMessage() {
	defer func() {
		// 关闭WebSocket
		err := user.WebSocket.Close()
		// 删除该用户
		delete(Users, user.Name)
		if err != nil {
			fmt.Printf("close websocket fail! %v\n", err)
		}
	}()
	for {
		// 接收来自用户的一条信息
		_, m, err := user.WebSocket.ReadMessage()
		if err != nil {
			break
		}
		// 解析msg
		var msg Message
		err = json.Unmarshal(m, &msg)
		if err != nil {
			fmt.Printf("unmarshal message fail! err:[%v]", err)
			break
		}
		var reply *Message
		switch msg.Action {
		case "createWhiteBoard":
			// 创建白板
			boardName := msg.Value.(string)
			success := false
			if _, ok := Boards[boardName]; !ok {
				// 白板不存在,创建白板
				Boards[boardName] = &WhiteBoard{
					Name:    boardName,
					Creator: user.Name,
					Pages:   make([]Page, 1),
				}
				// 初始化默认页面(第一页)
				Boards[boardName].Pages[0] = make(map[int]Element)
				user.joinWhiteBoard(boardName)
				success = true
			}
			reply = &Message{
				Action:  "createWhiteBoard",
				Success: success,
			}
		case "joinWhiteBoard":
			// 加入白板
			boardName := msg.Value.(string)
			reply = &Message{
				Action:  "joinWhiteBoard",
				Success: user.joinWhiteBoard(boardName),
				Value:   user.getPageElements(), // 要先join再get :(
			}
		case "addElement":
			// 添加元素
			element := Element(msg.Value.(map[string]interface{}))
			// 在用户对应的白板和页面中添加该元素
			Boards[user.Board].addElement(element, user.Page)
		}
		if reply != nil {
			// 回复用户
			user.sendMessage(reply)
		}
	}
}

// 发送一条消息给用户
func (user *User) sendMessage(msg *Message) {
	content, _ := json.Marshal(msg)
	err := user.WebSocket.WriteMessage(websocket.TextMessage, content)
	if err != nil {
		fmt.Printf("reply to User fail! reply:[%v] User[%v]", msg, user)
	}
}

// 加入白板,如果白板不存在返回false
func (user *User) joinWhiteBoard(boardName string) bool {
	if _, ok := Boards[boardName]; !ok {
		// 白板不存在
		return false
	}
	// 把该用户存入到白板中
	Boards[boardName].Users = append(Boards[boardName].Users, user.Name)
	// 设置用户所属白板
	user.Board = boardName
	return true
}

// 获得用户所在Page的所有元素
func (user *User) getPageElements() Page {
	return Boards[user.Board].Pages[user.Page]
}
