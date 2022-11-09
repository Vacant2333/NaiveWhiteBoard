package board

import (
	"strconv"
)

// 默认页面(不可被删除,默认加入该页面)
const defaultPage = "默认页面"

// WhiteBoard 白板
type WhiteBoard struct {
	Name    string           // 白板名称
	Creator *User            // 白板创建者
	Lock    bool             // 是否已锁定(不可编辑,且同步当前页面)
	Pages   map[string]Page  // 白板所有页面的内容
	Users   map[string]*User // 所有已加入该白板的用户
}

// Page 页面内容
type Page = map[int]Element

// Element 元素内容
type Element = map[string]interface{}

// Boards 所有存在服务器中的白板数据
var Boards map[string]*WhiteBoard

// 初始化
func init() {
	Users = make(map[string]*User)
	Boards = make(map[string]*WhiteBoard)
}

// 给该Board的所有用户发送信息
func (board *WhiteBoard) sendMessageToAll(msg *Message, page string, exceptUser string) {
	for _, user := range board.Users {
		// page为""则发送给所有人,除了exceptUser
		if (user.Page == page || page == "") && user.Name != exceptUser {
			user.sendMessage(msg)
		}
	}
}

// 添加元素,并且通知所有的用户
func (board *WhiteBoard) modifyElement(element Element, page string, actionUser string) {
	elementId := int(element["id"].(float64))
	board.Pages[page][elementId] = element
	board.sendMessageToAll(&Message{
		Action:  "modifyElement",
		Value:   element,
		Success: true,
	}, page, actionUser)
}

// 删除元素,并且通知所有用户
func (board *WhiteBoard) removeElement(elementID int, page string, actionUser string) {
	// 删除存在服务端的Element
	delete(board.Pages[page], elementID)
	board.sendMessageToAll(&Message{
		Action:  "removeElement",
		Value:   elementID,
		Success: true,
	}, page, actionUser)
}

// 从配置文件读取内容到页面中,并通知所有用户刷新页面
func (board *WhiteBoard) readConfigFromJson(pageJson interface{}, page string) {
	// 清空页面内容
	board.Pages[page] = make(map[int]Element)
	// 遍历所有的element,逐个转换类型
	for sid, element := range pageJson.(map[string]interface{}) {
		// 实际类型是map[int]interface{} 但是自动转为了string,这里把id转回来
		id, _ := strconv.Atoi(sid)
		board.Pages[page][id] = element.(Element)
	}
	// 通知所有用户刷新页面
	board.sendMessageToAll(&Message{
		Action:  "modifyPage",
		Value:   board.Pages[page],
		Success: true,
	}, page, "")
}

// 修改锁定模式
func (board *WhiteBoard) setLock(lock bool, page string) {
	board.Lock = lock
	// 通知所有用户锁定/解锁白板
	board.sendMessageToAll(&Message{
		Action:  "lockBoard",
		Value:   lock,
		Success: true,
	}, "", "")
	if lock {
		// 锁定时同步所有人的当前页面
		board.setAllUserPage(page)
	}
}

// 添加页面
func (board *WhiteBoard) addPage(page string, actionUser string) bool {
	if _, ok := board.Pages[page]; ok {
		// 页面已存在
		return false
	}
	board.Pages[page] = map[int]Element{}
	// 通知所有用户添加页面
	board.sendMessageToAll(&Message{
		Action:  "addPage",
		Value:   page,
		Success: true,
	}, "", actionUser)
	return true
}

// 删除页面
func (board *WhiteBoard) removePage(name string) {
	delete(board.Pages, name)
	board.sendMessageToAll(&Message{
		Action:  "removePage",
		Value:   name,
		Success: true,
	}, "", "")
}

// 设置所有用户的当前页面
func (board *WhiteBoard) setAllUserPage(page string) {
	for _, user := range board.Users {
		user.setPage(page)
	}
}
