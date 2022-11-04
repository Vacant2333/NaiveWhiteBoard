package board

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"runtime/debug"
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
		if err := recover(); err != nil {
			// 错误恢复,打印调用栈
			fmt.Println("err=", err)
			debug.PrintStack()
		}
	}()
	for {
		// 接收来自用户的一条信息
		_, m, err := user.WebSocket.ReadMessage()
		if err != nil {
			// 这里会捕捉到WebSocket断开
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
					Users:   map[string]bool{},
				}
				// 初始化默认页面(第一页)
				Boards[boardName].Pages[0] = make(map[int]Element)
				user.joinWhiteBoard(boardName)
				success = true
			}
			reply = &Message{
				Action:  "createWhiteBoard",
				Value:   boardName,
				Success: success,
			}
		case "joinWhiteBoard":
			// 加入白板
			boardName := msg.Value.(string)
			reply = &Message{
				Action:  "joinWhiteBoard",
				Success: user.joinWhiteBoard(boardName),
				Value:   boardName,
			}
			if reply.Success {
				// 加入成功后立即更新页面内容
				user.modifyPage()
			}
		case "modifyElement":
			// 添加/修改元素
			element := msg.Value.(Element)
			// 在用户对应的白板和页面中操作该元素
			Boards[user.Board].modifyElement(element, user.Page, user.Name)
		case "removeElement":
			// 删除元素
			Boards[user.Board].removeElement(int(msg.Value.(float64)), user.Page, user.Name)
		case "downloadPage":
			// 下载当前页面的配置
			reply = &Message{
				Action: "downloadPage",
				Value:  user.getPageElements(),
			}
		case "uploadPage":
			// 上传页面配置
			Boards[user.Board].readConfigFromJson(msg.Value, user.Page)
		}
		if reply != nil {
			// 回复用户
			user.sendMessage(reply)
		}
	}
	// 删除该用户
	user.delete()
	// 关闭WebSocket
	err := user.WebSocket.Close()
	if err != nil {
		fmt.Printf("close websocket fail! %v\n", err)
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
	Boards[boardName].Users[user.Name] = true
	// 设置用户所属白板
	user.Board = boardName
	return true
}

// 获得用户所在Page的所有元素
func (user *User) getPageElements() Page {
	if user.Board != "" {
		return Boards[user.Board].Pages[user.Page]
	}
	return nil
}

// 删除用户
func (user *User) delete() {
	if _, hasUser := Users[user.Name]; hasUser {
		delete(Users, user.Name)
		// 用户可能还没加入某个白板就断开连接
		if user.Board != "" {
			delete(Boards[user.Board].Users, user.Name)
		}
	}
}

// 更新用户页面所有内容
func (user *User) modifyPage() {
	user.sendMessage(&Message{
		Action: "modifyPage",
		Value:  user.getPageElements(),
	})
}
