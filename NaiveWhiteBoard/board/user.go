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
	Board     *WhiteBoard     // 用户所属的白板名称
	Page      string          // 用户所在的白板下标
}

// Message WebSocket信息格式
type Message struct {
	Action  string      // 操作名称
	Value   interface{} // 值
	Success bool        // 指令是否成功
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
			fmt.Println("error =", err)
			debug.PrintStack()
		}
	}()
	for {
		// 接收来自用户的信息
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
					Creator: user,
					Pages:   map[string]Page{},
					Users:   map[string]*User{},
				}
				// 初始化默认页面(第一页)
				Boards[boardName].Pages[defaultPage] = make(map[int]Element)
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
				Value:   boardName,
				Success: user.joinWhiteBoard(boardName),
			}
			if reply.Success {
				if user.Board.Lock {
					// 如果白板已锁定,通知用户
					user.sendMessage(&Message{
						Action:  "lockBoard",
						Value:   true,
						Success: true,
					})
				}
			}
		case "modifyElement":
			// 添加/修改元素
			if !user.Board.Lock {
				// 没有锁定才能操作元素
				element := msg.Value.(Element)
				// 在用户对应的白板和页面中操作该元素
				user.Board.modifyElement(element, user.Page, user.Name)
			}
		case "removeElement":
			// 删除元素
			if !user.Board.Lock {
				// 没有锁定才能操作元素
				user.Board.removeElement(int(msg.Value.(float64)), user.Page, user.Name)
			}
		case "downloadPage":
			// 下载当前页面的配置
			reply = &Message{
				Action:  "downloadPage",
				Value:   user.getPageElements(),
				Success: true,
			}
		case "uploadPage":
			// 上传页面配置
			if !user.Board.Lock {
				// 没有锁定才能上传配置
				user.Board.readConfigFromJson(msg.Value, user.Page)
			}
		case "lockBoard":
			// 设置锁定模式,只有创建者可以Lock
			if user == user.Board.Creator {
				// 用户是创建者,执行指令
				user.Board.setLock(msg.Value.(bool), user.Page)
			} else {
				// 用户不是创建者
				reply = &Message{
					Action:  "lockBoard",
					Success: false,
				}
			}
		case "addPage":
			// 添加页面,如果失败则可能是Lock或重名
			pageName := msg.Value.(string)
			reply = &Message{
				Action:  "addPage",
				Value:   pageName,
				Success: !user.Board.Lock && user.Board.addPage(pageName, user.Name),
			}
		case "setPage":
			// 用户请求切换页面
			user.setPage(msg.Value.(string))
			if user.Board.Lock {
				// 锁定时同步当前页面
				user.Board.setAllUserPage(msg.Value.(string))
			}
		case "removePage":
			// 用户请求删除页面
			pageName := msg.Value.(string)
			if user.Board.Lock || pageName == defaultPage {
				// 白板已锁定
				reply = &Message{
					Action:  "removePage",
					Success: false,
				}
			} else {
				user.Board.removePage(pageName)
			}
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
		fmt.Printf("reply[%v] to user[%v] fail!", msg, user)
	}
}

// 加入白板,如果白板不存在返回false
func (user *User) joinWhiteBoard(boardName string) bool {
	if _, ok := Boards[boardName]; !ok {
		// 白板不存在
		return false
	}
	// 把该用户存入到白板中
	Boards[boardName].Users[user.Name] = user
	// 设置用户所属白板,默认页面
	user.Board = Boards[boardName]
	// 发送所有的页面和设置当前页面
	user.sendAllPage()
	user.setPage(defaultPage)
	return true
}

// 获得用户所在Page的所有元素
func (user *User) getPageElements() Page {
	if user.Board != nil {
		return user.Board.Pages[user.Page]
	}
	return nil
}

// 删除用户
func (user *User) delete() {
	if _, hasUser := Users[user.Name]; hasUser {
		delete(Users, user.Name)
		// 用户可能还没加入某个白板就断开连接
		if user.Board != nil {
			delete(user.Board.Users, user.Name)
		}
	}
}

// 更新用户页面所有内容
func (user *User) modifyPage() {
	user.sendMessage(&Message{
		Action:  "modifyPage",
		Value:   user.getPageElements(),
		Success: true,
	})
}

// 设置用户当前页面
func (user *User) setPage(pageName string) {
	user.Page = pageName
	// 发送设置当前页面和当前页面内容的Msg
	user.sendMessage(&Message{
		Action:  "setPage",
		Value:   pageName,
		Success: true,
	})
	user.sendMessage(&Message{
		Action:  "modifyPage",
		Value:   user.getPageElements(),
		Success: true,
	})
}

// 发送所有已存在的页面(页面名称)
func (user *User) sendAllPage() {
	for pageName := range user.Board.Pages {
		user.sendMessage(&Message{
			Action:  "addPage",
			Value:   pageName,
			Success: true,
		})
	}
}
